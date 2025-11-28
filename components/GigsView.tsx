import React, { useState, useEffect } from 'react';
import { Gig, User } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Badge, Select, Modal } from './UIComponents';
import { Plus, Briefcase, ShoppingBag, Search, Star, Filter, Heart, ChevronRight, Lock, ArrowUpDown } from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  
  const [newGig, setNewGig] = useState<Partial<Gig>>({
    category: 'graphics',
    price: 10
  });

  useEffect(() => {
    // Generate random ratings if missing for demo visual purposes
    const fetchedGigs = storageService.getGigs().map(g => ({
        ...g,
        rating: g.rating || (4 + Math.random()),
        ratingCount: g.ratingCount || Math.floor(Math.random() * 100)
    }));
    setGigs(fetchedGigs);
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

  const handleCreateGig = (e: React.FormEvent) => {
    e.preventDefault();
    const gig: Gig = {
      id: Date.now().toString(),
      sellerId: user.id,
      sellerName: user.name,
      title: newGig.title || '',
      description: newGig.description || '',
      price: Number(newGig.price),
      category: newGig.category as any,
      image: newGig.image || 'https://via.placeholder.com/400x300?text=Service',
      timestamp: Date.now(),
      rating: 5.0,
      ratingCount: 0
    };

    storageService.createGig(gig);
    setView('market');
    alert('Gig posted successfully!');
  };

  const handlePurchase = (gig: Gig) => {
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
       storageService.updateUser(updatedUser);
       onUpdateUser(updatedUser);

       // Create Transaction
       storageService.createTransaction({
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
               <Input placeholder="I will design a..." value={newGig.title} onChange={e => setNewGig({...newGig, title: e.target.value})} required />
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
               <textarea className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500" rows={4} value={newGig.description} onChange={e => setNewGig({...newGig, description: e.target.value})} required />
             </div>
             <div>
               <label className="block text-sm font-medium mb-1">Image URL</label>
               <Input placeholder="https://..." value={newGig.image} onChange={e => setNewGig({...newGig, image: e.target.value})} />
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold flex items-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
             Digital Marketplace
          </h1>
          <p className="text-gray-500 mt-1">Find the perfect professional for your next project.</p>
        </div>
        <Button onClick={() => setView('create')} className="shadow-lg shadow-indigo-200 dark:shadow-none">
          <Plus className="w-4 h-4 mr-2" /> Post a Gig
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
               <Input 
                  placeholder="Search services..." 
                  className="pl-10 h-12"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex items-center space-x-2">
               <ArrowUpDown className="w-4 h-4 text-gray-500" />
               <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-40 h-12">
                   <option value="newest">Newest First</option>
                   <option value="price_asc">Price: Low to High</option>
                   <option value="price_desc">Price: High to Low</option>
                   <option value="rating">Best Rated</option>
               </Select>
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                        selectedCategory === cat.id 
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                        : 'bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                      {cat.label}
                  </button>
              ))}
          </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGigs.map(gig => (
          <Card key={gig.id} className="p-0 overflow-hidden group hover:shadow-xl transition-all duration-300 border-none ring-1 ring-gray-100 dark:ring-gray-700 cursor-pointer h-full flex flex-col">
            <div className="h-48 bg-gray-200 relative overflow-hidden" onClick={() => setSelectedGig(gig)}>
               <img src={gig.image} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt={gig.title} />
               <div className="absolute top-2 right-2">
                 <Badge color="blue">{gig.category}</Badge>
               </div>
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                   {gig.sellerName[0]}
                </div>
                <div>
                   <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block leading-tight">{gig.sellerName}</span>
                   <div className="flex items-center text-xs text-yellow-500">
                       <Star className="w-3 h-3 fill-current mr-1" />
                       <span className="font-bold">{gig.rating?.toFixed(1)}</span>
                       <span className="text-gray-400 ml-1">({gig.ratingCount})</span>
                   </div>
                </div>
              </div>
              <h3 
                onClick={() => setSelectedGig(gig)}
                className="font-bold text-lg mb-2 line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                  {gig.title}
              </h3>
              
              <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Starting at</div>
                <div className="font-bold text-xl text-gray-900 dark:text-white">${gig.price}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredGigs.length === 0 && (
          <div className="text-center py-20">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">No gigs found</h3>
              <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
      )}

      {/* Detail Modal */}
      {selectedGig && (
          <Modal 
            isOpen={!!selectedGig} 
            onClose={() => setSelectedGig(null)} 
            title="Service Details"
            maxWidth="max-w-3xl"
          >
              <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/2">
                      <img src={selectedGig.image} className="w-full h-64 object-cover rounded-lg shadow-sm" alt={selectedGig.title} />
                      <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-lg">
                                  {selectedGig.sellerName[0]}
                              </div>
                              <div>
                                  <div className="font-bold">{selectedGig.sellerName}</div>
                                  <div className="text-xs text-gray-500">Level 2 Seller</div>
                              </div>
                          </div>
                          <Button size="sm" variant="outline">Contact</Button>
                      </div>
                  </div>
                  <div className="md:w-1/2 flex flex-col">
                      <h2 className="text-2xl font-bold mb-2">{selectedGig.title}</h2>
                      <div className="flex items-center space-x-4 mb-4 text-sm">
                          <Badge color="blue">{selectedGig.category}</Badge>
                          <div className="flex items-center text-yellow-500">
                             <Star className="w-4 h-4 fill-current mr-1" />
                             <span className="font-bold">{selectedGig.rating?.toFixed(1)}</span>
                             <span className="text-gray-400 ml-1">({selectedGig.ratingCount} reviews)</span>
                          </div>
                      </div>

                      <div className="prose dark:prose-invert text-sm text-gray-600 dark:text-gray-300 mb-6 flex-1">
                          {selectedGig.description}
                      </div>

                      <div className="mt-auto border-t border-gray-100 dark:border-gray-700 pt-6">
                          <div className="flex justify-between items-center mb-4">
                              <span className="text-gray-500 font-medium">Total Price</span>
                              <span className="text-3xl font-bold text-indigo-600">${selectedGig.price}</span>
                          </div>
                          <Button 
                            className="w-full py-3 text-lg shadow-xl shadow-indigo-100 dark:shadow-none"
                            onClick={() => handlePurchase(selectedGig)}
                          >
                             Continue to Checkout (${selectedGig.price})
                          </Button>
                          <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center">
                              <Lock className="w-3 h-3 mr-1" /> Secure Transaction
                          </p>
                      </div>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};

export default GigsView;