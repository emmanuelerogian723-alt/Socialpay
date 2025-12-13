
import React, { useState, useEffect, useRef } from 'react';
import { User, Storefront, DigitalProduct, DigitalCategory, MechanicalSubCategory } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Select, Modal, Badge } from './UIComponents';
import { 
    ShoppingBag, Store, Edit3, Plus, Upload, Palette, Image as ImageIcon, 
    Download, Layout, Search, Filter, PenTool, Cpu, Building2, Smile, Box,
    ChevronRight, Save, Eye, Settings, FileText, CheckCircle
} from 'lucide-react';

interface DigitalMarketViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const CATEGORIES: { id: DigitalCategory, label: string, icon: any, color: string }[] = [
    { id: 'architecture', label: 'Architecture', icon: Building2, color: 'text-orange-500' },
    { id: 'mechanical', label: 'Mechanical', icon: Cpu, color: 'text-blue-500' },
    { id: 'graphics', label: 'Graphics & Brand', icon: Palette, color: 'text-pink-500' },
    { id: 'memes', label: 'Meme Designs', icon: Smile, color: 'text-yellow-500' },
    { id: 'templates', label: 'Templates', icon: Layout, color: 'text-green-500' },
    { id: 'other', label: 'Other', icon: Box, color: 'text-gray-500' },
];

const MECH_SUBS: { id: MechanicalSubCategory, label: string }[] = [
    { id: 'car', label: 'Car Design' },
    { id: 'engine', label: 'Engines' },
    { id: 'robot', label: 'Robotics' },
    { id: 'motor_parts', label: 'Motor Parts' },
    { id: 'general', label: 'General' },
];

export const DigitalMarketView: React.FC<DigitalMarketViewProps> = ({ user, onUpdateUser }) => {
    const [viewMode, setViewMode] = useState<'market' | 'my-store' | 'create-store'>('market');
    const [myStore, setMyStore] = useState<Storefront | null>(null);
    const [products, setProducts] = useState<DigitalProduct[]>([]);
    
    // Market Filters
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);

    // Initial Load
    useEffect(() => {
        loadStoreAndProducts();
    }, [user.id]);

    const loadStoreAndProducts = async () => {
        const store = await storageService.getStoreByOwner(user.id);
        setMyStore(store);
        const allProducts = await storageService.getDigitalProducts();
        setProducts(allProducts);
    };

    const handlePurchase = async (product: DigitalProduct) => {
        if (product.ownerId === user.id) return alert("You cannot buy your own product.");
        if (user.balance < product.price) return alert("Insufficient balance.");

        if (confirm(`Purchase "${product.title}" for $${product.price}?`)) {
            // Deduct from buyer
            const updatedUser = { ...user, balance: user.balance - product.price };
            await storageService.updateUser(updatedUser);
            onUpdateUser(updatedUser);

            // Record transaction
            await storageService.createTransaction({
                id: Date.now().toString(),
                userId: user.id,
                userName: user.name,
                amount: product.price,
                type: 'digital_sale',
                status: 'completed',
                method: 'Wallet',
                details: `Digital Download: ${product.title}`,
                timestamp: Date.now()
            });

            // Process Sale (Pay seller, increment stats)
            await storageService.recordDigitalSale(product.id, product.price, product.ownerId);
            
            // Refresh
            loadStoreAndProducts();
            alert("Purchase successful! Download started.");
            
            // Simulate Download
            const link = document.createElement('a');
            link.href = product.fileUrl; // In real app, this would be a signed URL
            link.download = `${product.title}.${product.fileType}`;
            link.click();
        }
    };

    // --- SUB-COMPONENT: Store Creator / Editor ---
    const StoreEditor = () => {
        const [formData, setFormData] = useState<Partial<Storefront>>(
            myStore || {
                storeName: `${user.name}'s Store`,
                description: 'Welcome to my digital shop.',
                accentColor: '#4f46e5',
                bannerUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
                logoUrl: user.avatar
            }
        );
        const [isSaving, setIsSaving] = useState(false);
        const [activeTab, setActiveTab] = useState<'design' | 'products'>('design');
        
        // Product Upload State
        const [showAddProduct, setShowAddProduct] = useState(false);
        const [newProd, setNewProd] = useState<Partial<DigitalProduct>>({ category: 'architecture', price: 5 });
        const [prodFile, setProdFile] = useState<File | null>(null);
        const [prodThumb, setProdThumb] = useState<File | null>(null);

        const handleSaveStore = async () => {
            setIsSaving(true);
            const storeData: Storefront = {
                id: myStore?.id || Date.now().toString(),
                ownerId: user.id,
                storeName: formData.storeName!,
                description: formData.description!,
                bannerUrl: formData.bannerUrl!,
                logoUrl: formData.logoUrl!,
                accentColor: formData.accentColor!,
                createdAt: myStore?.createdAt || Date.now(),
                totalSales: myStore?.totalSales || 0,
                rating: myStore?.rating || 5
            };

            if (myStore) await storageService.updateStore(storeData);
            else await storageService.createStore(storeData);

            setMyStore(storeData);
            setIsSaving(false);
            alert("Store saved successfully!");
            if (!myStore) setViewMode('my-store'); // Redirect if created
        };

        const handleAddProduct = async () => {
            if(!newProd.title || !newProd.price || !prodFile || !prodThumb) return alert("Fill all fields");
            
            setIsSaving(true);
            const fileUrl = await storageService.uploadMedia(prodFile);
            const thumbUrl = await storageService.uploadMedia(prodThumb);
            const fileType = prodFile.name.split('.').pop() || 'file';

            const product: DigitalProduct = {
                id: Date.now().toString(),
                storeId: myStore!.id,
                ownerId: user.id,
                title: newProd.title!,
                description: newProd.description || '',
                price: Number(newProd.price),
                category: newProd.category as DigitalCategory,
                subCategory: newProd.subCategory as MechanicalSubCategory,
                thumbnailUrl: thumbUrl,
                fileUrl: fileUrl,
                fileType: fileType,
                createdAt: Date.now(),
                sales: 0
            };

            await storageService.createDigitalProduct(product);
            setIsSaving(false);
            setShowAddProduct(false);
            setNewProd({ category: 'architecture', price: 5 });
            loadStoreAndProducts(); // Refresh list
        };

        return (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-150px)]">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="font-bold flex items-center"><Settings className="w-5 h-5 mr-2"/> Store Manager</h2>
                        <Button size="sm" variant="ghost" onClick={() => setViewMode('market')}>Exit</Button>
                    </div>
                    
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={() => setActiveTab('design')}
                            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'design' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-500'}`}
                        >
                            Design
                        </button>
                        <button 
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'products' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-500'}`}
                        >
                            Products ({products.filter(p => p.storeId === myStore?.id).length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeTab === 'design' && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Store Name</label>
                                    <Input value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <textarea 
                                        className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 text-sm" 
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Brand Color</label>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="color" 
                                            value={formData.accentColor} 
                                            onChange={e => setFormData({...formData, accentColor: e.target.value})}
                                            className="h-10 w-10 rounded cursor-pointer border-none"
                                        />
                                        <span className="text-sm font-mono">{formData.accentColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Banner Image</label>
                                    <div className="relative group cursor-pointer h-24 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700">
                                        <img src={formData.bannerUrl} className="w-full h-full object-cover opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold bg-white/80 dark:bg-black/50 px-2 py-1 rounded">Change Banner</span>
                                        </div>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                            if(e.target.files?.[0]) {
                                                const r = new FileReader();
                                                r.onload = () => setFormData({...formData, bannerUrl: r.result as string});
                                                r.readAsDataURL(e.target.files[0]);
                                            }
                                        }} />
                                    </div>
                                </div>
                                <Button className="w-full mt-4" onClick={handleSaveStore} isLoading={isSaving}>
                                    {myStore ? 'Save Changes' : 'Create Store'}
                                </Button>
                            </>
                        )}

                        {activeTab === 'products' && (
                            <>
                                <Button className="w-full mb-4 dashed border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" onClick={() => setShowAddProduct(true)}>
                                    <Plus className="w-4 h-4 mr-2"/> Add Digital Product
                                </Button>
                                <div className="space-y-2">
                                    {products.filter(p => p.storeId === myStore?.id).map(p => (
                                        <div key={p.id} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <img src={p.thumbnailUrl} className="w-10 h-10 rounded object-cover mr-3"/>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate">{p.title}</div>
                                                <div className="text-xs text-gray-500 capitalize">{p.category} - ${p.price}</div>
                                            </div>
                                            <div className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">
                                                {p.sales} Sold
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div className="w-full lg:w-2/3 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative">
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold z-10 pointer-events-none">
                        Live Preview
                    </div>
                    
                    {/* Simulated Store Front */}
                    <div className="h-full overflow-y-auto bg-white dark:bg-gray-950">
                        <div className="h-48 w-full relative">
                            <img src={formData.bannerUrl} className="w-full h-full object-cover" />
                            <div className="absolute -bottom-10 left-8">
                                <img src={formData.logoUrl} className="w-24 h-24 rounded-xl border-4 border-white dark:border-gray-900 shadow-lg object-cover" />
                            </div>
                        </div>
                        <div className="mt-12 px-8 pb-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">{formData.storeName}</h1>
                                    <p className="text-gray-500 mt-1 max-w-lg">{formData.description}</p>
                                </div>
                                <Button style={{ backgroundColor: formData.accentColor }} className="text-white shadow-lg">
                                    Contact Seller
                                </Button>
                            </div>

                            <hr className="my-8 border-gray-100 dark:border-gray-800"/>

                            <h3 className="text-xl font-bold mb-4">Latest Products</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {products.filter(p => p.storeId === myStore?.id).map(p => (
                                    <Card key={p.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow">
                                        <div className="h-32 bg-gray-200">
                                            <img src={p.thumbnailUrl} className="w-full h-full object-cover"/>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-sm truncate">{p.title}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <Badge color="gray">{p.category}</Badge>
                                                <span className="font-bold text-green-600">${p.price}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {/* Mock Item for visual if empty */}
                                {products.filter(p => p.storeId === myStore?.id).length === 0 && (
                                    <div className="col-span-3 text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                        Products will appear here...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Product Modal */}
                <Modal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} title="Upload Digital Product">
                    <div className="space-y-4">
                        <Input placeholder="Product Title" value={newProd.title || ''} onChange={e => setNewProd({...newProd, title: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Category</label>
                                <Select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value as DigitalCategory})}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </Select>
                            </div>
                            {newProd.category === 'mechanical' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Sub-Category</label>
                                    <Select value={newProd.subCategory || 'general'} onChange={e => setNewProd({...newProd, subCategory: e.target.value as MechanicalSubCategory})}>
                                        {MECH_SUBS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </Select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-500">Price ($)</label>
                                <Input type="number" value={newProd.price} onChange={e => setNewProd({...newProd, price: Number(e.target.value)})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500">Description</label>
                            <textarea className="w-full p-2 border rounded-lg text-sm dark:bg-gray-800" rows={3} value={newProd.description || ''} onChange={e => setNewProd({...newProd, description: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 rounded-lg text-center cursor-pointer relative hover:bg-gray-50 dark:hover:bg-gray-800">
                                <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1"/>
                                <span className="text-xs font-bold block">Thumbnail (JPG/PNG)</span>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e => setProdThumb(e.target.files?.[0] || null)} />
                                {prodThumb && <span className="text-xs text-green-500">{prodThumb.name}</span>}
                            </div>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 rounded-lg text-center cursor-pointer relative hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Download className="w-6 h-6 mx-auto text-gray-400 mb-1"/>
                                <span className="text-xs font-bold block">Digital File (ZIP/PDF)</span>
                                <input type="file" className="absolute inset-0 opacity-0" onChange={e => setProdFile(e.target.files?.[0] || null)} />
                                {prodFile && <span className="text-xs text-green-500">{prodFile.name}</span>}
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleAddProduct} isLoading={isSaving}>Upload Product</Button>
                    </div>
                </Modal>
            </div>
        );
    };

    // --- MAIN RENDER ---
    if (viewMode === 'create-store' || viewMode === 'my-store') {
        return <StoreEditor />;
    }

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShoppingBag className="w-64 h-64 transform rotate-12" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <Badge color="blue" className="mb-2">New</Badge>
                    <h1 className="text-4xl font-black mb-2">Digital Market</h1>
                    <p className="text-indigo-200 mb-6 text-lg">
                        The premier marketplace for Architectural Plans, Mechanical Designs, Brand Kits, and more.
                    </p>
                    <div className="flex gap-3">
                        <Button 
                            className="bg-white text-indigo-900 hover:bg-gray-100 font-bold"
                            onClick={() => setViewMode(myStore ? 'my-store' : 'create-store')}
                        >
                            <Store className="w-4 h-4 mr-2" />
                            {myStore ? 'Manage My Store' : 'Create Your Store'}
                        </Button>
                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                            How it Works
                        </Button>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                    onClick={() => setCatFilter('all')}
                    className={`flex items-center px-6 py-3 rounded-xl border transition-all whitespace-nowrap font-bold shadow-sm
                        ${catFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'}
                    `}
                >
                    All Items
                </button>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setCatFilter(cat.id)}
                        className={`flex items-center px-5 py-3 rounded-xl border transition-all whitespace-nowrap font-bold shadow-sm
                            ${catFilter === cat.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'}
                        `}
                    >
                        <cat.icon className={`w-4 h-4 mr-2 ${catFilter === cat.id ? 'text-white' : cat.color}`} />
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products
                    .filter(p => catFilter === 'all' || p.category === catFilter)
                    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
                    .map(product => (
                        <div 
                            key={product.id} 
                            onClick={() => setSelectedProduct(product)}
                            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl hover:border-indigo-500/30 transition-all flex flex-col h-full"
                        >
                            <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                                <img src={product.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute top-2 left-2">
                                    <Badge className="bg-white/90 text-black shadow-sm font-bold backdrop-blur">
                                        {CATEGORIES.find(c => c.id === product.category)?.label}
                                    </Badge>
                                </div>
                                {product.category === 'mechanical' && product.subCategory && (
                                    <div className="absolute top-2 right-2">
                                        <Badge color="blue" className="shadow-sm font-mono text-[10px]">
                                            {product.subCategory.toUpperCase()}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
                                    {product.title}
                                </h3>
                                <div className="text-xs text-gray-500 mb-3 flex items-center">
                                    <Download className="w-3 h-3 mr-1" /> {product.sales} downloads
                                </div>
                                
                                <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-lg font-black text-green-600">${product.price}</span>
                                    <Button size="sm" className="rounded-full px-4">View</Button>
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
            
            {products.length === 0 && (
                <div className="text-center py-20">
                    <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400">Market is empty</h3>
                    <p className="text-gray-500">Be the first to create a store and upload products!</p>
                    <Button className="mt-4" onClick={() => setViewMode('create-store')}>Start Selling</Button>
                </div>
            )}

            {/* Product Details Modal */}
            <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Product Details" maxWidth="max-w-4xl">
                {selectedProduct && (
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/2">
                            <img src={selectedProduct.thumbnailUrl} className="w-full rounded-xl shadow-lg border border-gray-200 dark:border-gray-700" />
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {/* Preview slots placeholder */}
                                {[1,2,3].map(i => <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg"></div>)}
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 flex flex-col">
                            <div className="flex items-center space-x-2 mb-2">
                                <Badge color="blue" className="text-sm">{selectedProduct.category.toUpperCase()}</Badge>
                                {selectedProduct.subCategory && <Badge color="gray">{selectedProduct.subCategory}</Badge>}
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">{selectedProduct.title}</h1>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6">
                                <div className="text-3xl font-bold text-green-600 mb-1">${selectedProduct.price}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                    <FileText className="w-4 h-4 mr-1"/> Digital Download ({selectedProduct.fileType.toUpperCase()})
                                </div>
                            </div>

                            <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300 mb-8 flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Description</h4>
                                <p>{selectedProduct.description}</p>
                            </div>

                            <div className="flex space-x-3 mt-auto">
                                <Button className="flex-1 py-4 text-lg" onClick={() => handlePurchase(selectedProduct)}>
                                    Buy Now
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Close</Button>
                            </div>
                            
                            <div className="mt-4 text-center text-xs text-gray-400 flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 mr-1" /> Secure Payment & Instant Download
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
