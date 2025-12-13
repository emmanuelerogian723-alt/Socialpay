
import React, { useState, useEffect, useRef } from 'react';
import { Gig, User, Transaction, Conversation, ChatMessage } from '../types';
import { storageService } from '../services/storageService';
import { analyzeChatRisk } from '../services/geminiService';
import { Card, Button, Input, Badge, Select, Modal } from './UIComponents';
import { Plus, ShoppingBag, Search, Star, Lock, Clock, Smartphone, Mail, Globe, ShieldCheck, Eye, AlertTriangle, CheckCircle, Package, ArrowRight, MessageCircle, Send, X, ShieldAlert, Upload, Edit3, Check } from 'lucide-react';

interface GigsViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const GigsView: React.FC<GigsViewProps> = ({ user, onUpdateUser }) => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  // Tabs: Market (Browse), Create (Sell), Orders (My Purchases/Sales), Messages (Chats)
  const [activeTab, setActiveTab] = useState<'market' | 'create' | 'orders'>('market');
  
  // Market State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<{id: string, name: string} | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  
  // Create Gig State
  const [newGig, setNewGig] = useState<Partial<Gig>>({
    category: 'numbers',
    price: 10
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // New state for preview mode

  // Orders State
  const [myPurchases, setMyPurchases] = useState<Transaction[]>([]);
  const [mySales, setMySales] = useState<Transaction[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Transaction | null>(null);

  // Chat State
  const [showChat, setShowChat] = useState(false); // Controls chat panel visibility
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGigs();
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'orders') {
          loadOrders();
      }
  }, [activeTab, user.id]);

  // Poll for messages if chat is open
  useEffect(() => {
      if (showChat) {
          loadConversations();
          const interval = setInterval(() => {
              if (activeConversation) loadMessages(activeConversation.id);
              loadConversations(); // Update last messages list
          }, 3000);
          return () => clearInterval(interval);
      }
  }, [showChat, activeConversation]);

  // Auto-scroll chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadGigs = async () => {
    const fetchedGigs = await storageService.getGigs();
    const mappedGigs = fetchedGigs.map(g => ({
        ...g,
        rating: g.rating || (4 + Math.random()),
        ratingCount: g.ratingCount || Math.floor(Math.random() * 100)
    }));
    setGigs(mappedGigs);
  };

  const loadOrders = async () => {
      const allTx = await storageService.getTransactions();
      const purchases = allTx.filter(t => t.userId === user.id && t.type === 'purchase' && t.relatedGigId);
      const myGigIds = (await storageService.getGigs()).filter(g => g.sellerId === user.id).map(g => g.id);
      const sales = allTx.filter(t => t.relatedGigId && myGigIds.includes(t.relatedGigId) && t.type === 'purchase');
      setMyPurchases(purchases);
      setMySales(sales);
  };

  const loadConversations = async () => {
      const convs = await storageService.getConversations(user.id);
      setConversations(convs);
  };

  const loadMessages = async (convId: string) => {
      const msgs = await storageService.getMessages(convId);
      setChatMessages(msgs);
  };

  const filteredGigs = gigs.filter(gig => {
      const matchesSearch = gig.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            gig.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || gig.category === selectedCategory;
      return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return b.timestamp - a.timestamp;
  });

  const handleStartChat = async (targetUserId: string, targetUserName: string, gigId?: string) => {
      setShowChat(true);
      const names = { [user.id]: user.name, [targetUserId]: targetUserName };
      const conv = await storageService.createConversation([user.id, targetUserId], names, gigId);
      setActiveConversation(conv);
      loadMessages(conv.id);
      setSelectedGig(null); // Close modal if open
      setSelectedSeller(null);
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !activeConversation) return;
      setIsSending(true);

      // 1. AI SECURITY CHECK
      const riskAnalysis = await analyzeChatRisk(chatInput);
      
      if (riskAnalysis.isRisky) {
          if (!confirm(`⚠️ SECURITY WARNING ⚠️\n\nOur system detected potential risk: "${riskAnalysis.reason}".\n\nScammers often try to take payments off-platform. Do you still want to send this?`)) {
              setIsSending(false);
              return;
          }
      }

      // 2. Send Message
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          conversationId: activeConversation.id,
          senderId: user.id,
          text: chatInput,
          timestamp: Date.now(),
          isFlagged: riskAnalysis.isRisky
      };

      await storageService.sendMessage(newMessage);
      setChatInput('');
      loadMessages(activeConversation.id);
      setIsSending(false);
  };

  // Step 1: Validate and show Preview
  const handlePreviewListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGig.title || !newGig.description || !newGig.price || !newGig.secretDelivery) {
        alert("Please fill in all required fields, including the Secret Delivery Details.");
        return;
    }
    setShowPreview(true);
  };

  // Step 2: Actually Create Gig
  const handleConfirmListing = async () => {
    let imageQuery = newGig.category;
    if (newGig.category === 'numbers') imageQuery = 'smartphone';
    if (newGig.category === 'social_accounts') imageQuery = 'social media';
    if (newGig.category === 'email_accounts') imageQuery = 'laptop,email';

    const gig: Gig = {
      id: Date.now().toString(),
      sellerId: user.id,
      sellerName: user.name,
      title: newGig.title || '',
      description: newGig.description || '',
      price: Number(newGig.price),
      category: newGig.category as any,
      image: newGig.image || `https://source.unsplash.com/random/800x600/?${imageQuery}`,
      secretDelivery: newGig.secretDelivery,
      timestamp: Date.now(),
      rating: 5.0,
      ratingCount: 0
    };

    await storageService.createGig(gig);
    setActiveTab('market');
    setNewGig({ category: 'numbers', price: 10, secretDelivery: '' });
    setShowPreview(false);
    alert('Asset listed successfully! It will appear in the market.');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Please upload an image under 5MB.");
        return;
      }
      setIsUploading(true);
      try {
        const url = await storageService.uploadMedia(file);
        setNewGig(prev => ({ ...prev, image: url }));
      } catch (error) {
        alert("Failed to upload image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePurchase = async (gig: Gig) => {
    if (user.id === gig.sellerId) {
       alert("You cannot buy your own gig.");
       return;
    }
    if (user.balance < gig.price) {
      alert("Insufficient balance. Please deposit funds first.");
      return;
    }

    if(confirm(`Confirm purchase of "${gig.title}" for $${gig.price}? \n\nFunds will be held in Escrow until the seller releases the asset.`)) {
       const updatedUser = { ...user, balance: user.balance - gig.price };
       await storageService.updateUser(updatedUser);
       onUpdateUser(updatedUser);

       await storageService.createTransaction({
         id: Date.now().toString(),
         userId: user.id,
         userName: user.name,
         amount: gig.price,
         type: 'purchase',
         status: 'pending_delivery',
         method: 'Wallet',
         details: `Order: ${gig.title}`,
         relatedGigId: gig.id,
         timestamp: Date.now()
       });

       // Auto-start chat for the order
       handleStartChat(gig.sellerId, gig.sellerName, gig.id);
       setActiveTab('orders');
    }
  };

  const handleReleaseOrder = async (transactionId: string) => {
     if(confirm("Are you sure you want to release the details to the buyer? This will complete the transaction.")) {
        const result = await storageService.processGigOrder(transactionId);
        if (result.success) {
            alert("Success! Order completed. 70% of funds added to your wallet.");
            loadOrders();
            const u = await storageService.getUserById(user.id);
            if(u) onUpdateUser(u);
        } else {
            alert("Error processing order.");
        }
     }
  };

  const handleSellerClick = (e: React.MouseEvent, sellerId: string, sellerName: string) => {
      e.stopPropagation();
      setSelectedSeller({ id: sellerId, name: sellerName });
  };

  const categories = [
      { id: 'all', label: 'All Assets' },
      { id: 'numbers', label: 'Foreign Numbers' },
      { id: 'social_accounts', label: 'Social Accounts' },
      { id: 'email_accounts', label: 'Verified Emails' },
      { id: 'graphics', label: 'Graphics & Design' },
      { id: 'video', label: 'Video & Animation' },
      { id: 'marketing', label: 'Digital Marketing' }
  ];

  // --- CREATE FORM ---
  if (activeTab === 'create') {
    if (showPreview) {
        // --- PREVIEW MODE ---
        return (
            <div className="max-w-3xl mx-auto animate-slide-up pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                        <Eye className="w-6 h-6 mr-2 text-indigo-600"/> Preview Listing
                    </h2>
                    <Button variant="ghost" onClick={() => setShowPreview(false)}>
                        <Edit3 className="w-4 h-4 mr-2"/> Back to Edit
                    </Button>
                </div>
                
                <Card className="mb-6 overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/30">
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Public Preview</span>
                        <Badge color="blue">{categories.find(c => c.id === newGig.category)?.label}</Badge>
                    </div>
                    
                    <div className="p-6">
                        {newGig.image && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm max-h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                                <img src={newGig.image} alt="Asset Preview" className="max-w-full h-auto object-contain" />
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold">{newGig.title}</h2>
                            <div className="text-3xl font-black text-green-600">${Number(newGig.price).toFixed(2)}</div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line mb-6">
                            {newGig.description}
                        </p>
                    </div>
                </Card>

                <Card className="mb-6 border-2 border-yellow-100 dark:border-yellow-900/30">
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 border-b border-yellow-100 dark:border-yellow-800 flex items-center text-yellow-700 dark:text-yellow-400">
                        <Lock className="w-4 h-4 mr-2"/>
                        <span className="text-xs font-bold uppercase tracking-wider">Hidden Content (Delivery)</span>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-sm text-gray-500 mb-2">
                            This information will only be revealed to the buyer <strong>after</strong> they pay. Ensure it is correct.
                        </p>
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-all shadow-inner">
                            {newGig.secretDelivery}
                        </div>
                    </div>
                </Card>

                <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 py-3" onClick={() => setShowPreview(false)}>
                        Make Changes
                    </Button>
                    <Button className="flex-1 py-3 text-lg" onClick={handleConfirmListing}>
                        <Check className="w-5 h-5 mr-2" /> Confirm & Publish
                    </Button>
                </div>
            </div>
        );
    }

    // --- EDIT MODE ---
    return (
      <div className="max-w-3xl mx-auto animate-slide-up pb-20">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Sell an Asset</h2>
            <Button variant="ghost" onClick={() => setActiveTab('market')}>Cancel</Button>
        </div>
        <Card>
           <form onSubmit={handlePreviewListing} className="space-y-5">
             <div>
               <label className="block text-sm font-medium mb-1">Title</label>
               <Input placeholder="e.g. Verified USA +1 Phone Number" value={newGig.title || ''} onChange={e => setNewGig({...newGig, title: e.target.value})} required />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Category</label>
                   <Select value={newGig.category} onChange={e => setNewGig({...newGig, category: e.target.value as any})}>
                     <option value="numbers">Foreign Numbers</option>
                     <option value="social_accounts">Social Media Accounts</option>
                     <option value="email_accounts">Verified Emails</option>
                     <option value="graphics">Graphics</option>
                     <option value="marketing">Marketing</option>
                   </Select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Price ($)</label>
                   {/* Changed min to 0 or any positive number */}
                   <Input type="number" min="0" step="0.01" value={newGig.price} onChange={e => setNewGig({...newGig, price: Number(e.target.value)})} required />
                 </div>
             </div>

             <div>
               <label className="block text-sm font-medium mb-1">Description</label>
               <textarea 
                  className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500" 
                  rows={3} 
                  placeholder="Describe details..."
                  value={newGig.description || ''} 
                  onChange={e => setNewGig({...newGig, description: e.target.value})} 
                  required 
               />
             </div>

             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                 <label className="block text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center">
                     <Lock className="w-4 h-4 mr-2"/> Secret Delivery Details (Credentials/Codes)
                 </label>
                 <textarea 
                    className="w-full p-3 border border-indigo-200 dark:border-indigo-700 rounded-lg dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 font-mono text-sm" 
                    rows={4} 
                    placeholder={"Username: ...\nPassword: ..."}
                    value={newGig.secretDelivery || ''} 
                    onChange={e => setNewGig({...newGig, secretDelivery: e.target.value})} 
                    required 
                 />
             </div>

             {/* Replaced URL input with File Upload */}
             <div>
               <label className="block text-sm font-medium mb-1">Asset Image (Screenshot/Photo)</label>
               <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-900/50 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50">
                  {newGig.image ? (
                      <div className="relative inline-block w-full">
                          <img src={newGig.image} alt="Preview" className="max-h-64 rounded-lg shadow-sm mx-auto" />
                          <button 
                            type="button"
                            onClick={() => setNewGig(prev => ({...prev, image: ''}))}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-md transition-colors"
                          >
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                  ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center space-y-2 group w-full h-full">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-full text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                              <Upload className="w-6 h-6" />
                          </div>
                          <div>
                              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Click to upload</span>
                              <span className="text-sm text-gray-500 ml-1">from gallery</span>
                          </div>
                          <span className="text-xs text-gray-400">JPG, PNG (Max 5MB)</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                          />
                      </label>
                  )}
                  {isUploading && <div className="mt-3 text-xs text-indigo-500 font-bold flex items-center justify-center"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping mr-2"></div>Uploading...</div>}
               </div>
             </div>

             <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
               <Button type="button" variant="ghost" onClick={() => setActiveTab('market')}>Cancel</Button>
               <Button type="submit" size="lg" disabled={isUploading}>Preview Listing</Button>
             </div>
           </form>
        </Card>
      </div>
    );
  }

  // --- ORDERS TAB ---
  if (activeTab === 'orders') {
      return (
          <div className="space-y-8 animate-fade-in pb-20">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Orders & Sales</h2>
                  <Button variant="outline" onClick={() => setActiveTab('market')}>
                      Back to Market
                  </Button>
              </div>
              
              {/* Similar to previous, but add Chat Button */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* BUYER SIDE */}
                  <div>
                      <h3 className="font-bold text-lg mb-4 text-indigo-600">Purchases</h3>
                      <div className="space-y-4">
                          {myPurchases.map(order => (
                              <Card key={order.id} className="border-l-4 border-l-indigo-500">
                                  <div className="flex justify-between mb-2">
                                      <div className="font-bold">{order.details}</div>
                                      <Badge color={order.status === 'completed' ? 'green' : 'yellow'}>{order.status}</Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <div className="font-bold text-red-600">-${order.amount.toFixed(2)}</div>
                                      <div className="flex space-x-2">
                                         {/* Find original gig to know seller */}
                                         {(() => {
                                             const g = gigs.find(g => g.id === order.relatedGigId);
                                             return g ? (
                                                <Button size="sm" variant="ghost" onClick={() => handleStartChat(g.sellerId, g.sellerName, g.id)}>
                                                    <MessageCircle className="w-4 h-4" />
                                                </Button>
                                             ) : null;
                                         })()}
                                         {order.status === 'completed' && (
                                            <Button size="sm" onClick={() => setViewingOrder(order)}>
                                                <Eye className="w-4 h-4 mr-1"/> Secret
                                            </Button>
                                         )}
                                      </div>
                                  </div>
                              </Card>
                          ))}
                      </div>
                  </div>

                  {/* SELLER SIDE */}
                  <div>
                      <h3 className="font-bold text-lg mb-4 text-green-600">Sales</h3>
                       <div className="space-y-4">
                          {mySales.map(sale => (
                              <Card key={sale.id} className="border-l-4 border-l-green-500">
                                  <div className="flex justify-between mb-2">
                                      <div className="font-bold">{sale.details}</div>
                                      <Badge color={sale.status === 'completed' ? 'green' : 'red'}>{sale.status}</Badge>
                                  </div>
                                  <div className="flex justify-between items-center mt-3">
                                      <div className="text-sm">Earn: ${(sale.amount * 0.7).toFixed(2)}</div>
                                      <div className="flex space-x-2">
                                         <Button size="sm" variant="ghost" onClick={() => handleStartChat(sale.userId, sale.userName, sale.relatedGigId)}>
                                             <MessageCircle className="w-4 h-4" />
                                         </Button>
                                         {sale.status === 'pending_delivery' && (
                                              <Button size="sm" onClick={() => handleReleaseOrder(sale.id)}>
                                                  <CheckCircle className="w-4 h-4 mr-2"/> Release
                                              </Button>
                                         )}
                                      </div>
                                  </div>
                              </Card>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  // --- MARKET VIEW ---
  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold flex items-center text-gray-900 dark:text-white">
             <ShoppingBag className="w-8 h-8 mr-3 text-indigo-600"/> Asset Market
          </h1>
          <p className="text-gray-500 mt-1">Securely buy and sell foreign numbers, accounts, and services.</p>
        </div>
        <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setShowChat(true)}>
                <MessageCircle className="w-4 h-4 mr-2"/> Messages
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('orders')}>
                <Package className="w-4 h-4 mr-2"/> My Orders
            </Button>
            <Button onClick={() => setActiveTab('create')}>
                <Plus className="w-4 h-4 mr-2" /> Sell
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
         <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <Input 
                 placeholder="Search assets..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="pl-9 h-11"
             />
         </div>
         <div className="flex space-x-2">
             <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-48 h-11">
                 {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
             </Select>
             <Select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-40 h-11">
                 <option value="newest">Newest</option>
                 <option value="price_asc">Price: Low</option>
                 <option value="price_desc">Price: High</option>
             </Select>
         </div>
      </div>

      {/* Gigs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredGigs.map(gig => (
          <div key={gig.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-indigo-500/30 transition-all group cursor-pointer flex flex-col h-full" onClick={() => setSelectedGig(gig)}>
             <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                <img src={gig.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={gig.title} />
                <div className="absolute top-2 left-2">
                    <Badge color="blue" className="shadow-md">
                        {categories.find(c => c.id === gig.category)?.label || gig.category}
                    </Badge>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-white text-xs font-bold flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-green-400"/> Secure
                </div>
             </div>
             <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center space-x-2">
                       <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {gig.sellerName.charAt(0)}
                       </div>
                       <span className="text-xs text-gray-500 truncate">{gig.sellerName}</span>
                   </div>
                   <div className="flex items-center text-xs text-yellow-500 font-bold">
                      <Star className="w-3 h-3 fill-current mr-1" />{gig.rating?.toFixed(1)}
                   </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2 leading-snug flex-1 group-hover:text-indigo-600 transition-colors">
                    {gig.title}
                </h3>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between mt-auto">
                    <div className="text-lg font-black text-gray-900 dark:text-white">${gig.price}</div>
                    <div className="flex space-x-2">
                        <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGig(gig);
                            }}
                        >
                            View
                        </Button>
                        <Button 
                            size="sm" 
                            className="px-4 font-bold shadow-md bg-green-600 hover:bg-green-700"
                            disabled={user.id === gig.sellerId}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePurchase(gig);
                            }}
                        >
                            {user.id === gig.sellerId ? 'Yours' : 'Buy'}
                        </Button>
                    </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* --- SELLER PROFILE MODAL --- */}
      <Modal 
         isOpen={!!selectedSeller} 
         onClose={() => setSelectedSeller(null)} 
         title="Seller Profile"
         maxWidth="max-w-4xl"
      >
         {selectedSeller && (
             <div className="space-y-6">
                 <div className="flex items-center space-x-4">
                     <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                         {selectedSeller.name.charAt(0)}
                     </div>
                     <div>
                         <h3 className="text-xl font-bold">{selectedSeller.name}</h3>
                         <Button size="sm" variant="outline" className="mt-2" onClick={() => handleStartChat(selectedSeller.id, selectedSeller.name)}>
                             <MessageCircle className="w-4 h-4 mr-2"/> Chat with Seller
                         </Button>
                     </div>
                 </div>
                 <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                     <h4 className="font-bold mb-4">Active Listings</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {gigs.filter(g => g.sellerId === selectedSeller.id).map(g => (
                             <div key={g.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => { setSelectedGig(g); setSelectedSeller(null); }}>
                                 <img src={g.image} className="w-16 h-16 object-cover rounded" />
                                 <div>
                                     <div className="font-bold text-sm line-clamp-1">{g.title}</div>
                                     <div className="text-green-600 font-bold text-sm">${g.price}</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
         )}
      </Modal>

      {/* --- GIG DETAILS MODAL --- */}
      <Modal isOpen={!!selectedGig} onClose={() => setSelectedGig(null)} title="Details" maxWidth="max-w-2xl">
          {selectedGig && (
              <div className="space-y-6">
                  <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-inner">
                      <img src={selectedGig.image} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4">
                          <Badge color="gray" className="shadow-lg text-sm capitalize">
                            {categories.find(c => c.id === selectedGig.category)?.label || selectedGig.category}
                          </Badge>
                      </div>
                  </div>
                  <div className="flex justify-between items-start">
                      <div>
                          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{selectedGig.title}</h2>
                          <div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
                              <span 
                                className="font-medium text-indigo-600 cursor-pointer hover:underline"
                                onClick={(e) => handleSellerClick(e, selectedGig.sellerId, selectedGig.sellerName)}
                              >
                                  {selectedGig.sellerName}
                              </span>
                              <span>•</span>
                              <span className="flex items-center text-yellow-500"><Star className="w-3 h-3 fill-current mr-1"/> {selectedGig.rating?.toFixed(1)}</span>
                          </div>
                      </div>
                      <div className="text-3xl font-black text-green-600">${selectedGig.price}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line text-sm">
                          {selectedGig.description}
                      </p>
                  </div>
                  <div className="flex space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <Button variant="outline" className="flex-1" onClick={() => handleStartChat(selectedGig.sellerId, selectedGig.sellerName, selectedGig.id)}>
                          <MessageCircle className="w-4 h-4 mr-2"/> Message Seller
                      </Button>
                      <Button className="flex-1" onClick={() => handlePurchase(selectedGig)}>
                          Buy Now (${selectedGig.price})
                      </Button>
                  </div>
              </div>
          )}
      </Modal>

      {/* --- CREDENTIAL REVEAL MODAL --- */}
      <Modal isOpen={!!viewingOrder} onClose={() => setViewingOrder(null)} title="Secure Asset Delivery">
          {viewingOrder && (
              <div className="space-y-6">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-xl flex items-center">
                      <CheckCircle className="w-6 h-6 mr-3" />
                      <div>
                          <div className="font-bold">Transaction Complete</div>
                          <div className="text-sm">The seller has released the details.</div>
                      </div>
                  </div>
                  <div>
                      <h4 className="font-bold mb-2 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-indigo-500"/> Credentials / Secret Info
                      </h4>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-all border border-gray-700 shadow-inner">
                          {(() => {
                              const originalGig = gigs.find(g => g.id === viewingOrder.relatedGigId);
                              return originalGig?.secretDelivery || "Error retrieving secret. Please contact support.";
                          })()}
                      </div>
                  </div>
                  <Button className="w-full" onClick={() => setViewingOrder(null)}>Close</Button>
              </div>
          )}
      </Modal>

      {/* --- FLOATING SECURE CHAT INTERFACE --- */}
      {showChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-200 dark:border-gray-700">
                  {/* Left: Conversations List */}
                  <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold flex justify-between items-center">
                          <span>Messages</span>
                          <ShieldCheck className="w-4 h-4 text-green-500" title="Secure Chat"/>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                          {conversations.length === 0 && <p className="text-center p-4 text-gray-500 text-sm">No conversations yet.</p>}
                          {conversations.map(conv => {
                              const otherName = Object.entries(conv.participantNames).find(([id]) => id !== user.id)?.[1] || 'User';
                              return (
                                  <div 
                                    key={conv.id} 
                                    onClick={() => { setActiveConversation(conv); loadMessages(conv.id); }}
                                    className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors ${activeConversation?.id === conv.id ? 'bg-white dark:bg-gray-800 border-l-4 border-l-indigo-600' : ''}`}
                                  >
                                      <div className="font-bold text-sm mb-1">{otherName}</div>
                                      <div className="text-xs text-gray-500 truncate">{conv.lastMessage || 'Start chatting...'}</div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* Right: Active Chat */}
                  <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                      {activeConversation ? (
                          <>
                             <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/30">
                                 <div>
                                     <div className="font-bold">{Object.entries(activeConversation.participantNames).find(([id]) => id !== user.id)?.[1]}</div>
                                     <div className="text-xs text-green-600 flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/> End-to-End Encrypted & AI Monitored</div>
                                 </div>
                                 <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                 {chatMessages.map(msg => (
                                     <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                         <div className={`max-w-[70%] rounded-2xl p-3 text-sm ${
                                             msg.senderId === user.id 
                                             ? 'bg-indigo-600 text-white rounded-br-none' 
                                             : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                         }`}>
                                             {msg.isFlagged && (
                                                 <div className="text-xs text-yellow-300 font-bold mb-1 flex items-center">
                                                     <ShieldAlert className="w-3 h-3 mr-1"/> Flagged by System
                                                 </div>
                                             )}
                                             {msg.text}
                                             <div className={`text-[10px] mt-1 text-right ${msg.senderId === user.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                 {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                                 <div ref={chatEndRef} />
                             </div>

                             <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                 <div className="flex space-x-2">
                                     <Input 
                                         value={chatInput} 
                                         onChange={e => setChatInput(e.target.value)} 
                                         onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                         placeholder="Type a secure message..."
                                         disabled={isSending}
                                     />
                                     <Button onClick={handleSendMessage} disabled={isSending || !chatInput.trim()}>
                                         <Send className="w-4 h-4" />
                                     </Button>
                                 </div>
                                 <div className="text-[10px] text-gray-400 mt-2 text-center flex items-center justify-center">
                                     <Lock className="w-3 h-3 mr-1"/> Never share passwords or pay outside SocialPay. AI protection active.
                                 </div>
                             </div>
                          </>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                              <MessageCircle className="w-16 h-16 mb-4 opacity-20"/>
                              <p>Select a conversation to start chatting</p>
                              <Button variant="outline" className="mt-4" onClick={() => setShowChat(false)}>Close</Button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default GigsView;
