
import React, { useState, useEffect } from 'react';
import { Gig, User } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Badge, Select, Modal } from './UIComponents';
import { Plus, Briefcase, ShoppingBag, Search, Star, Filter, Heart, ChevronRight, Lock, ArrowUpDown, User as UserIcon, Calendar, MapPin, ExternalLink, Clock } from 'lucide-react';

interface GigsViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const GigsView: React.FC<GigsViewProps> = ({ user, onUpdateUser }) => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [view, setView] = useState<'market' | 'create'>('market');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<{id: string, name: string} | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  
  const [newGig, setNewGig] = useState<Partial<Gig>>({
    category: 'graphics',
    price: 10
  });

  useEffect(() => {
    // Generate random ratings if missing for demo visual purposes
    const fetchGigs = async () => {
        const fetchedGigs = await storageService.getGigs();
        const mappedGigs = fetchedGigs.map(g => ({
            ...g,
            rating: g.rating || (4 + Math.random()),
            ratingCount: g.ratingCount || Math.floor(Math.random() * 100)
        }));
        setGigs(mappedGigs);
    };
    fetchGigs();
  }, [view]);

  const filteredGigs = gigs.filter(gig => {
      const matchesSearch = gig.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            gig.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || gig.category === selectedCategory;
      return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    // newest default
    return b.timestamp - a.timestamp;
  });

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGig.title || !newGig.description || !newGig.price) {
        alert("Please fill in all required fields");
        return;
    }

    const gig: Gig = {
      id: Date.now().toString(),
      sellerId: user.id,
      sellerName: user.name,
      title: newGig.title || '',
      description: newGig.description || '',
      price: Number(newGig.price),
      category: newGig.category as any,
      image: newGig.image || `https://source.unsplash.com/random/800x600/?${newGig.category}`,
      timestamp: Date.now(),
      rating: 5.0,
      ratingCount: 0
    };

    await storageService.createGig(gig);
    setView('market');
    // Reset form
    setNewGig({ category: 'graphics', price: 10 });
    alert('Gig posted successfully!');
  };

  const handlePurchase = async (gig: Gig) => {
    if (user.id === gig.sellerId) {
       alert("You cannot buy your own gig.");
       return;
    }
    if (user.balance < gig.price) {
      alert("Insufficient balance to purchase this service.");
      return;
    }

    if(confirm(`Confirm purchase of "${gig.title}" for $${gig.price}? Funds will be held securely.`)) {
       // Deduct
       const updatedUser = { ...user, balance: user.balance - gig.price };
       await storageService.updateUser(updatedUser);
       onUpdateUser(updatedUser);

       // Create Transaction
       await storageService.createTransaction({
         id: Date.now().toString(),
         userId: user.id,
         userName: user.name,
         amount: gig.price,
         type: 'purchase',
         status: 'completed', // In real app, held in escrow
         method: 'Wallet',
         details: `Purchase Service: ${gig.title}`,
         timestamp: Date.now()
       });

       alert("Purchase successful! The seller has been notified to start work.");
       setSelectedGig(null);
    }
  };

  const handleSellerClick = (e: React.MouseEvent, sellerId: string, sellerName: string) => {
      e.stopPropagation();
      setSelectedSeller({ id: sellerId, name: sellerName });
  };

  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Create a New Gig</h2>
            <Button variant="ghost" onClick={() => setView('market')}>Cancel</Button>
        </div>
        <Card>
           <form onSubmit={handleCreateGig} className="space-y-4">
             <div>
               <label className="block text-sm font-medium mb-1">Service Title</label>
               <Input placeholder="I will design a..." value={newGig.title || ''} onChange={e => setNewGig({...newGig, title: e.target.value})} required />
             </div>
             <div>
               <label className="block text-sm font-medium mb-1">Category</label>
               <Select value={newGig.category} onChange={e => setNewGig({...newGig, category: e.target.value as any})}>
                 <option value="graphics">Graphics & Design</option>
                 <option value="video">Video & Animation</option>
                 <option value="writing">Writing & Translation</option>
                 <option value="marketing">Digital Marketing</option>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-1">Price ($)</label>
               <Input type="number" min="5" value={newGig.price} onChange={e => setNewGig({...newGig, price: Number(e.target.value)})} required />
             </div>
             <div>
               <label className="block text-sm font-medium mb-1">Description</label>
               <textarea className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500" rows={4} value={newGig.description || ''} onChange={e => setNewGig({...newGig, description: e.target.value})} required />
             </div>
             <div>
               <label className="block text-sm font-medium mb-1">Image URL</label>
               <Input placeholder="https://..." value={newGig.image || ''} onChange={e => setNewGig({...newGig, image: e.target.value})} />
               <p className="text-xs text-gray-500 mt-1">Leave empty for a random image based on category.</p>
             </div>
             <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
               <Button type="button" variant="ghost" onClick={() => setView('market')}>Cancel</Button>
               <Button type="submit">Publish Gig</Button>
             </div>
           </form>
        </Card>
      </div>
    );
  }

  const categories = [
      { id: 'all', label: 'All Services' },
      { id: 'graphics', label: 'Graphics' },
      { id: 'video', label: 'Video' },
      { id: 'writing', label: 'Writing' },
      { id: 'marketing', label: 'Marketing' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
             <ShoppingBag className="w-6 h-6 mr-2 text-indigo-600"/> Digital Market
          </h1>
          <p className="text-gray-500 text-sm">Buy and sell digital services securely.</p>
        </div>
        <Button onClick={() => setView('create')}>
          <Plus className="w-4 h-4 mr-2" /> Post a Gig
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
         <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <Input 
                 placeholder="Search services..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="pl-9 h-10"
             />
         </div>
         <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
             <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-40 h-10">
                 {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
             </Select>
             <Select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-40 h-10">
                 <option value="newest">Newest First</option>
                 <option value="price_asc">Price: Low to High</option>
                 <option value="price_desc">Price: High to Low</option>
                 <option value="rating">Best Rated</option>
             </Select>
         </div>
      </div>

      {/* Gigs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredGigs.map(gig => (
          <div key={gig.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all group cursor-pointer flex flex-col" onClick={() => setSelectedGig(gig)}>
             {/* Image with zoom effect */}
             <div className="relative h-48 overflow-hidden">
                <img src={gig.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={gig.title} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium border border-white px-4 py-2 rounded-full">Quick View</span>
                </div>
                <Badge color="gray" className="absolute top-2 left-2 capitalize shadow-sm">{gig.category}</Badge>
             </div>
             
             <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2">
                   <div 
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-full pr-2 -ml-1 py-1 transition-colors"
                      onClick={(e) => handleSellerClick(e, gig.sellerId, gig.sellerName)}
                    >
                       <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {gig.sellerName.charAt(0)}
                       </div>
                       <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{gig.sellerName}</span>
                   </div>
                   <div className="flex items-center text-xs text-yellow-500 font-bold">
                      <Star className="w-3 h-3 fill-current mr-1" />
                      {gig.rating?.toFixed(1)} <span className="text-gray-400 font-normal ml-1">({gig.ratingCount})</span>
                   </div>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1 line-clamp-2 leading-snug flex-1">
                    {gig.title}
                </h3>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Starting at</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">${gig.price}</div>
                </div>
             </div>
          </div>
        ))}
      </div>
      
      {filteredGigs.length === 0 && (
          <div className="text-center py-20 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No services found matching your criteria.</p>
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

                     <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                         <h4 className="font-bold mb-4">Active Gigs by {selectedSeller.name}</h4>
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

      {/* --- GIG DETAILS MODAL --- */}
      <Modal 
        isOpen={!!selectedGig} 
        onClose={() => setSelectedGig(null)} 
        title="Service Details"
        maxWidth="max-w-2xl"
      >
          {selectedGig && (
              <div className="space-y-6">
                  <div className="relative h-64 w-full rounded-xl overflow-hidden">
                      <img src={selectedGig.image} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4">
                          <Badge color="gray" className="shadow-lg text-sm">{selectedGig.category}</Badge>
                      </div>
                  </div>

                  <div className="flex justify-between items-start">
                      <div>
                          <h2 className="text-2xl font-bold mb-2">{selectedGig.title}</h2>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                              <span className="font-medium text-indigo-600">{selectedGig.sellerName}</span>
                              <span>•</span>
                              <span className="flex items-center text-yellow-600"><Star className="w-3 h-3 fill-current mr-1"/> {selectedGig.rating?.toFixed(1)} ({selectedGig.ratingCount})</span>
                          </div>
                      </div>
                      <div className="text-3xl font-bold text-green-600">${selectedGig.price}</div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">About this Gig</h4>
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                          {selectedGig.description}
                      </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400"/>
                          <div className="font-bold">2 Days Delivery</div>
                      </div>
                      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <RefreshCw className="w-5 h-5 mx-auto mb-1 text-gray-400"/>
                          <div className="font-bold">2 Revisions</div>
                      </div>
                  </div>

                  <div className="flex space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <Button variant="outline" className="flex-1" onClick={() => setSelectedGig(null)}>Close</Button>
                      <Button className="flex-1" onClick={() => handlePurchase(selectedGig)}>
                          Order Now (${selectedGig.price})
                      </Button>
                  </div>
              </div>
          )}
      </Modal>

    </div>
  );
};

// Helper for detail modal
const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);

export default GigsView;
