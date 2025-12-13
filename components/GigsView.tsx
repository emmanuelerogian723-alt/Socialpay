
import React, { useState, useEffect, useRef } from 'react';
import { Gig, User, Transaction, Conversation, ChatMessage } from '../types';
import { storageService } from '../services/storageService';
import { analyzeChatRisk } from '../services/geminiService';
import { Card, Button, Input, Badge, Select, Modal, HumanVerificationModal } from './UIComponents';
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
  const [showPreview, setShowPreview] = useState(false); 
  const [showVerification, setShowVerification] = useState(false);

  // Orders State
  const [myPurchases, setMyPurchases] = useState<Transaction[]>([]);
  const [mySales, setMySales] = useState<Transaction[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Transaction | null>(null);

  // Chat State
  const [showChat, setShowChat] = useState(false); 
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
              loadConversations(); 
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
      setSelectedGig(null);
      setSelectedSeller(null);
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !activeConversation) return;
      setIsSending(true);

      const riskAnalysis = await analyzeChatRisk(chatInput);
      
      if (riskAnalysis.isRisky) {
          if (!confirm(`⚠️ SECURITY WARNING ⚠️\n\nOur system detected potential risk: "${riskAnalysis.reason}".\n\nScammers often try to take payments off-platform. Do you still want to send this?`)) {
              setIsSending(false);
              return;
          }
      }

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

  // --- NEW: Human Verification Check ---
  const handleSellClick = () => {
      if (!user.isHuman) {
          setShowVerification(true);
      } else {
          setActiveTab('create');
      }
  };

  const handleVerificationSuccess = async () => {
      setShowVerification(false);
      const updatedUser = { ...user, isHuman: true };
      await storageService.updateUser(updatedUser);
      onUpdateUser(updatedUser);
      setActiveTab('create');
  };

  const handlePreviewListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGig.title || !newGig.description || !newGig.price || !newGig.secretDelivery) {
        alert("Please fill in all required fields, including the Secret Delivery Details.");
        return;
    }
    setShowPreview(true);
  };

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
                   <Input type="number" min="0" step="0.01" value={newGig.price} onChange={e => setNewGig({...newGig, price: Number(e.target.value)})} required />
                 </div>
             </div>

             {/* PROFIT CALCULATOR */}
             {newGig.price && newGig.price > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-500">Listing Price:</span>
                        <span className="font-bold">${Number(newGig.price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2 text-red-500">
                        <span>Platform Fee (30%):</span>
                        <span>-${(Number(newGig.price) * 0.30).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-indigo-200 dark:border-indigo-700">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">Your Net Earnings:</span>
                        <span className="font-black text-green-600 text-lg">${(Number(newGig.price) * 0.70).toFixed(2)}</span>
                    </div>
                </div>
             )}

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
                      <label className="cursor-pointer block h-full flex flex-col items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Click to upload image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                  )}
               </div>
               {isUploading && <p className="text-xs text-indigo-500 mt-2 animate-pulse">Uploading image...</p>}
             </div>

             <Button type="submit" className="w-full" disabled={isUploading}>Review Listing</Button>
           </form>
        </Card>
      </div>
    );
  }

  // --- ORDERS TAB ---
  if (activeTab === 'orders') {
      return (
          <div className="space-y-6 animate-fade-in pb-20">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Your Orders</h2>
                  <Button variant="ghost" onClick={() => setActiveTab('market')}>Back to Market</Button>
              </div>

              {/* BUYING */}
              <div className="space-y-4">
                  <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm flex items-center"><ShoppingBag className="w-4 h-4 mr-2"/> Buying ({myPurchases.length})</h3>
                  {myPurchases.length === 0 && <p className="text-gray-400 italic text-sm">No active purchases.</p>}
                  {myPurchases.map(p => (
                      <Card key={p.id} className="flex justify-between items-center p-4">
                          <div>
                              <div className="font-bold">{p.details.replace('Order: ', '')}</div>
                              <div className="text-xs text-gray-500">{new Date(p.timestamp).toLocaleDateString()}</div>
                              <Badge color={p.status === 'completed' ? 'green' : 'yellow'} className="mt-1">{p.status === 'completed' ? 'Delivered' : 'Pending Delivery'}</Badge>
                          </div>
                          <div className="text-right">
                              <div className="font-bold mb-2">-${p.amount}</div>
                              {p.status === 'completed' ? (
                                  <Button size="sm" variant="outline" disabled>Completed</Button>
                              ) : (
                                  <Button size="sm" onClick={() => {
                                      const gig = gigs.find(g => g.id === p.relatedGigId);
                                      if(gig) handleStartChat(gig.sellerId, gig.sellerName, gig.id);
                                  }}>Contact Seller</Button>
                              )}
                          </div>
                      </Card>
                  ))}
              </div>

              {/* SELLING */}
              <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm flex items-center"><Package className="w-4 h-4 mr-2"/> Selling ({mySales.length})</h3>
                  {mySales.length === 0 && <p className="text-gray-400 italic text-sm">No active sales.</p>}
                  {mySales.map(s => (
                      <Card key={s.id} className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800">
                          <div>
                              <div className="font-bold">{s.details.replace('Order: ', '')}</div>
                              <div className="text-xs text-gray-500">Buyer: {s.userName}</div>
                              <Badge color={s.status === 'completed' ? 'green' : 'yellow'} className="mt-1">{s.status === 'completed' ? 'Completed' : 'Action Required'}</Badge>
                          </div>
                          <div className="text-right">
                              <div className="font-bold text-green-600 mb-2">+${(s.amount * 0.70).toFixed(2)}</div>
                              {s.status === 'pending_delivery' && (
                                  <Button size="sm" onClick={() => handleReleaseOrder(s.id)}>Release Item</Button>
                              )}
                          </div>
                      </Card>
                  ))}
              </div>
          </div>
      );
  }

  // --- MARKET TAB ---
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold flex items-center">
                <ShoppingBag className="w-6 h-6 mr-2 text-indigo-500"/> Marketplace
            </h1>
            <p className="text-gray-500 text-sm">Buy & Sell Social Media Assets securely.</p>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <Button onClick={() => setActiveTab('orders')} variant="outline" className="flex-1 md:flex-none">
                 My Orders
             </Button>
             <Button onClick={handleSellClick} className="flex-1 md:flex-none bg-indigo-600 text-white">
                 <Plus className="w-4 h-4 mr-2" /> Sell Asset
             </Button>
         </div>
      </div>

      {/* Verification Warning for Sellers */}
      {!user.isHuman && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Seller Verification Required</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      To maintain a safe marketplace, you must verify you are human before listing items.
                  </p>
              </div>
              <Button size="sm" onClick={() => setShowVerification(true)} className="ml-auto">Verify Now</Button>
          </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <select 
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
          >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
          </select>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                  {cat.label}
              </button>
          ))}
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGigs.map(gig => (
              <Card key={gig.id} className="group hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                      <img src={gig.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/80 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">
                          {categories.find(c => c.id === gig.category)?.label}
                      </div>
                  </div>
                  <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors">{gig.title}</h3>
                          <div className="flex items-center text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                              <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" /> {gig.rating?.toFixed(1)}
                          </div>
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">{gig.description}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                  {gig.sellerName[0]}
                              </div>
                              <span className="text-xs text-gray-500 truncate max-w-[80px]">{gig.sellerName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className="font-black text-lg text-gray-900 dark:text-white">${gig.price}</span>
                              <Button size="sm" onClick={() => handlePurchase(gig)}>Buy</Button>
                          </div>
                      </div>
                  </div>
              </Card>
          ))}
          {filteredGigs.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No listings found. Try adjusting filters.</p>
              </div>
          )}
      </div>

      {/* --- CHAT MODAL --- */}
      <Modal isOpen={showChat} onClose={() => setShowChat(false)} title="Messages" maxWidth="max-w-md">
          <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto space-y-4 p-2">
                  {chatMessages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Start the conversation...</p>}
                  {chatMessages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.senderId === user.id ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                              {msg.text}
                          </div>
                          {msg.isFlagged && <span className="text-[10px] text-red-500 flex items-center mt-1"><ShieldAlert className="w-3 h-3 mr-1"/> Flagged for review</span>}
                          <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                  ))}
                  <div ref={chatEndRef} />
              </div>
              <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={!chatInput.trim() || isSending}>
                      <Send className="w-4 h-4" />
                  </Button>
              </div>
          </div>
      </Modal>

      {/* --- VERIFICATION MODAL --- */}
      <HumanVerificationModal 
          isOpen={showVerification} 
          onClose={() => setShowVerification(false)} 
          onSuccess={handleVerificationSuccess} 
      />
    </div>
  );
};

export default GigsView;
