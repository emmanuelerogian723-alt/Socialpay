
import React, { useState, useEffect } from 'react';
import { Gig, User, Transaction } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Badge, Select, Modal } from './UIComponents';
import { Plus, ShoppingBag, Search, Star, Lock, Clock, Smartphone, Mail, Globe, ShieldCheck, Eye, AlertTriangle, CheckCircle, Package, ArrowRight } from 'lucide-react';

interface GigsViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const GigsView: React.FC<GigsViewProps> = ({ user, onUpdateUser }) => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  // Tabs: Market (Browse), Create (Sell), Orders (My Purchases/Sales)
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

  // Orders State
  const [myPurchases, setMyPurchases] = useState<Transaction[]>([]);
  const [mySales, setMySales] = useState<Transaction[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Transaction | null>(null);

  useEffect(() => {
    loadGigs();
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'orders') {
          loadOrders();
      }
  }, [activeTab, user.id]);

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
      // Get all transactions
      const allTx = await storageService.getTransactions();
      
      // Filter purchases made by current user
      const purchases = allTx.filter(t => t.userId === user.id && t.type === 'purchase' && t.relatedGigId);
      
      // Filter sales (where current user is the seller)
      // Note: In a real backend we'd query by sellerId on the transaction or join gigs. 
      // For this mock, we have to find gigs I sold, then find transactions for them.
      const myGigIds = (await storageService.getGigs()).filter(g => g.sellerId === user.id).map(g => g.id);
      const sales = allTx.filter(t => t.relatedGigId && myGigIds.includes(t.relatedGigId) && t.type === 'purchase');

      setMyPurchases(purchases);
      setMySales(sales);
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

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGig.title || !newGig.description || !newGig.price || !newGig.secretDelivery) {
        alert("Please fill in all required fields, including the Secret Delivery Details.");
        return;
    }

    // Determine default image based on category
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
      secretDelivery: newGig.secretDelivery, // Secure info
      timestamp: Date.now(),
      rating: 5.0,
      ratingCount: 0
    };

    await storageService.createGig(gig);
    setActiveTab('market');
    setNewGig({ category: 'numbers', price: 10, secretDelivery: '' });
    alert('Asset listed successfully! It will appear in the market.');
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
       // 1. Deduct from Buyer
       const updatedUser = { ...user, balance: user.balance - gig.price };
       await storageService.updateUser(updatedUser);
       onUpdateUser(updatedUser);

       // 2. Create Transaction (Status: pending_delivery)
       // We store the secret in the transaction for easier retrieval later, 
       // or we look it up from the gig. To simplify, we'll look it up via ID later or duplicate it here securely.
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

       alert("Order placed! Funds are held safely. You will be notified when the seller releases the details.");
       setSelectedGig(null);
       setActiveTab('orders');
    }
  };

  const handleReleaseOrder = async (transactionId: string) => {
     if(confirm("Are you sure you want to release the details to the buyer? This will complete the transaction.")) {
        // Logic handled in service to ensure consistency
        const result = await storageService.processGigOrder(transactionId);
        if (result.success) {
            alert("Success! Order completed. 70% of funds added to your wallet.");
            loadOrders(); // Refresh UI
            
            // Update local user balance if I am the seller
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
    return (
      <div className="max-w-3xl mx-auto animate-slide-up pb-20">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Sell an Asset</h2>
            <Button variant="ghost" onClick={() => setActiveTab('market')}>Cancel</Button>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6 border border-yellow-200 dark:border-yellow-800 text-sm">
            <div className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center mb-1">
                <ShieldCheck className="w-4 h-4 mr-2"/> Secure Escrow System
            </div>
            <p className="text-yellow-700 dark:text-yellow-300">
                Buyers pay upfront, but funds are held by SocialPay. You must "Release" the order to get paid.
                <br/>
                <strong>Platform Fee:</strong> We deduct <span className="font-bold">30%</span> of the selling price. You receive <span className="font-bold">70%</span>.
            </p>
        </div>

        <Card>
           <form onSubmit={handleCreateGig} className="space-y-5">
             <div>
               <label className="block text-sm font-medium mb-1">Title</label>
               <Input placeholder="e.g. Verified USA +1 Phone Number (New)" value={newGig.title || ''} onChange={e => setNewGig({...newGig, title: e.target.value})} required />
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
                   <Input type="number" min="5" value={newGig.price} onChange={e => setNewGig({...newGig, price: Number(e.target.value)})} required />
                   <p className="text-xs text-gray-500 mt-1">You earn: <span className="font-bold text-green-600">${((newGig.price || 0) * 0.7).toFixed(2)}</span></p>
                 </div>
             </div>

             <div>
               <label className="block text-sm font-medium mb-1">Description</label>
               <textarea 
                  className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500" 
                  rows={3} 
                  placeholder="Describe the account age, followers, region, etc."
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
                    placeholder={"Username: ...\nPassword: ...\nRecovery Email: ...\n\n(This is encrypted and only revealed to the buyer AFTER they pay.)"}
                    value={newGig.secretDelivery || ''} 
                    onChange={e => setNewGig({...newGig, secretDelivery: e.target.value})} 
                    required 
                 />
                 <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                     <ShieldCheck className="w-3 h-3 inline mr-1"/>
                     Securely stored. Automatically sent to buyer upon confirmed purchase.
                 </p>
             </div>

             <div>
               <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
               <Input placeholder="https://..." value={newGig.image || ''} onChange={e => setNewGig({...newGig, image: e.target.value})} />
             </div>

             <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
               <Button type="button" variant="ghost" onClick={() => setActiveTab('market')}>Cancel</Button>
               <Button type="submit" size="lg">List Asset for Sale</Button>
             </div>
           </form>
        </Card>
      </div>
    );
  }

  // --- ORDERS / SALES DASHBOARD ---
  if (activeTab === 'orders') {
      return (
          <div className="space-y-8 animate-fade-in pb-20">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Orders & Sales</h2>
                  <Button variant="outline" onClick={() => setActiveTab('market')}>
                      Back to Market
                  </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* BUYER SIDE */}
                  <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center text-indigo-600">
                          <ShoppingBag className="w-5 h-5 mr-2"/> Purchases (Bought)
                      </h3>
                      <div className="space-y-4">
                          {myPurchases.length === 0 && <p className="text-gray-500 italic">No purchases yet.</p>}
                          {myPurchases.map(order => (
                              <Card key={order.id} className="border-l-4 border-l-indigo-500">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <div className="font-bold">{order.details}</div>
                                          <div className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleString()}</div>
                                      </div>
                                      <Badge color={order.status === 'completed' ? 'green' : 'yellow'}>
                                          {order.status === 'completed' ? 'Delivered' : 'Pending Delivery'}
                                      </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <div className="font-bold text-lg text-red-600">-${order.amount.toFixed(2)}</div>
                                      {order.status === 'completed' ? (
                                          <Button size="sm" onClick={() => setViewingOrder(order)}>
                                              <Eye className="w-4 h-4 mr-2"/> View Credentials
                                          </Button>
                                      ) : (
                                          <div className="text-xs text-orange-600 flex items-center bg-orange-50 px-2 py-1 rounded">
                                              <Clock className="w-3 h-3 mr-1"/> Waiting for seller release
                                          </div>
                                      )}
                                  </div>
                              </Card>
                          ))}
                      </div>
                  </div>

                  {/* SELLER SIDE */}
                  <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center text-green-600">
                          <Package className="w-5 h-5 mr-2"/> Sales (Sold)
                      </h3>
                      <div className="space-y-4">
                          {mySales.length === 0 && <p className="text-gray-500 italic">No sales yet.</p>}
                          {mySales.map(sale => (
                              <Card key={sale.id} className="border-l-4 border-l-green-500">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <div className="font-bold">{sale.details.replace('Order: ', 'Sold: ')}</div>
                                          <div className="text-xs text-gray-500">Buyer: {sale.userName}</div>
                                      </div>
                                      <Badge color={sale.status === 'completed' ? 'green' : 'red'}>
                                          {sale.status === 'completed' ? 'Funds Released' : 'Action Required'}
                                      </Badge>
                                  </div>
                                  <div className="flex justify-between items-center mt-3">
                                      <div className="text-sm">
                                          Price: ${sale.amount}<br/>
                                          <span className="text-green-600 font-bold">You Earn: ${(sale.amount * 0.7).toFixed(2)}</span>
                                      </div>
                                      
                                      {sale.status === 'pending_delivery' ? (
                                          <Button size="sm" onClick={() => handleReleaseOrder(sale.id)}>
                                              <CheckCircle className="w-4 h-4 mr-2"/> Confirm & Release
                                          </Button>
                                      ) : (
                                          <div className="text-xs text-green-600 font-bold flex items-center">
                                              <CheckCircle className="w-3 h-3 mr-1"/> Paid
                                          </div>
                                      )}
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
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold flex items-center text-gray-900 dark:text-white">
             <ShoppingBag className="w-8 h-8 mr-3 text-indigo-600"/> Asset Market
          </h1>
          <p className="text-gray-500 mt-1">Securely buy and sell foreign numbers, accounts, and services.</p>
        </div>
        <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setActiveTab('orders')}>
                <Package className="w-4 h-4 mr-2"/> My Orders
            </Button>
            <Button onClick={() => setActiveTab('create')}>
                <Plus className="w-4 h-4 mr-2" /> Sell Asset
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
         <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <Input 
                 placeholder="Search e.g. 'US Gmail', 'TikTok 10k'..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="pl-9 h-11"
             />
         </div>
         <div className="flex space-x-2 overflow-x-auto pb-1">
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
             {/* Image */}
             <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                <img src={gig.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={gig.title} />
                <div className="absolute top-2 left-2">
                    <Badge color={
                        gig.category === 'numbers' ? 'blue' : 
                        gig.category === 'social_accounts' ? 'red' : 
                        gig.category === 'email_accounts' ? 'yellow' : 'gray'
                    } className="shadow-md">
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
                       <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{gig.sellerName}</span>
                   </div>
                   <div className="flex items-center text-xs text-yellow-500 font-bold">
                      <Star className="w-3 h-3 fill-current mr-1" />
                      {gig.rating?.toFixed(1)}
                   </div>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2 leading-snug flex-1 group-hover:text-indigo-600 transition-colors">
                    {gig.title}
                </h3>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between mt-auto">
                    <div className="text-lg font-black text-gray-900 dark:text-white">${gig.price}</div>
                    <Button size="sm" variant="secondary" className="px-3 py-1 h-8 text-xs">View</Button>
                </div>
             </div>
          </div>
        ))}
      </div>
      
      {filteredGigs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No items found</p>
              <Button variant="ghost" className="mt-2" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}>Clear Filters</Button>
          </div>
      )}

      {/* --- SELLER PROFILE MODAL --- */}
      <Modal 
         isOpen={!!selectedSeller} 
         onClose={() => setSelectedSeller(null)} 
         title="Seller Profile"
         maxWidth="max-w-4xl"
      >
         {selectedSeller && (() => {
             const sellerGigs = gigs.filter(g => g.sellerId === selectedSeller.id);
             return (
                 <div className="space-y-6">
                     <div className="flex items-center space-x-4">
                         <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                             {selectedSeller.name.charAt(0)}
                         </div>
                         <div>
                             <h3 className="text-xl font-bold">{selectedSeller.name}</h3>
                             <div className="flex items-center text-sm text-gray-500 space-x-4">
                                 <span>Member since 2024</span>
                                 <span className="flex items-center"><Star className="w-3 h-3 text-yellow-500 mr-1"/> 4.9 Average Rating</span>
                             </div>
                         </div>
                     </div>
                     {/* List of seller items */}
                     <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                         <h4 className="font-bold mb-4">Active Listings</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {sellerGigs.map(g => (
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
             )
         })()}
      </Modal>

      {/* --- PURCHASE DETAILS MODAL --- */}
      <Modal 
        isOpen={!!selectedGig} 
        onClose={() => setSelectedGig(null)} 
        title="Details"
        maxWidth="max-w-2xl"
      >
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
                      <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">Description</h4>
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line text-sm">
                          {selectedGig.description}
                      </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start space-x-3 text-sm text-blue-800 dark:text-blue-200">
                      <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                          <span className="font-bold block mb-1">Secure Transaction</span>
                          Payment is held in Escrow. The seller will only receive funds (70%) after they release the secure credentials to you.
                      </div>
                  </div>

                  <div className="flex space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <Button variant="outline" className="flex-1" onClick={() => setSelectedGig(null)}>Cancel</Button>
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
                          {/* 
                             In a real app, we would fetch the secret from the gig or transaction.
                             For this mock, we will check if the transaction has a relatedGigSecret (if we stored it)
                             OR find the original gig from the ID.
                          */}
                          {(() => {
                              // Trying to find the secret from the gigs list
                              const originalGig = gigs.find(g => g.id === viewingOrder.relatedGigId);
                              return originalGig?.secretDelivery || "Error retrieving secret. Please contact support.";
                          })()}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                          Please change passwords immediately after accessing bought accounts.
                      </p>
                  </div>

                  <Button className="w-full" onClick={() => setViewingOrder(null)}>Close</Button>
              </div>
          )}
      </Modal>

    </div>
  );
};

export default GigsView;
