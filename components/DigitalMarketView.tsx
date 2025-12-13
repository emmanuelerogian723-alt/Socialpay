
import React, { useState, useEffect, useRef } from 'react';
import { User, Storefront, DigitalProduct, DigitalCategory, MechanicalSubCategory } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Select, Modal, Badge } from './UIComponents';
import { 
    ShoppingBag, Store, Edit3, Plus, Upload, Palette, Image as ImageIcon, 
    Download, Layout, Search, Filter, PenTool, Cpu, Building2, Smile, Box,
    ChevronRight, Save, Eye, Settings, FileText, CheckCircle, Trash2, 
    BarChart, DollarSign, Package, PieChart, MoreVertical, LayoutDashboard
} from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

// --- EXTRACTED COMPONENT: Store Creator / Editor ---
interface StoreEditorProps {
    user: User;
    currentStore: Storefront | null;
    products: DigitalProduct[];
    onRefresh: () => void;
    onExit: () => void;
}

const StoreEditor: React.FC<StoreEditorProps> = ({ user, currentStore, products, onRefresh, onExit }) => {
    const [formData, setFormData] = useState<Partial<Storefront>>(
        currentStore || {
            storeName: `${user.name}'s Store`,
            description: 'Welcome to my digital shop.',
            accentColor: '#4f46e5',
            bannerUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
            logoUrl: user.avatar
        }
    );
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'design'>('dashboard');
    
    // Product State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<DigitalProduct | null>(null);
    const [prodForm, setProdForm] = useState<Partial<DigitalProduct>>({ category: 'architecture', price: 5 });
    const [prodFile, setProdFile] = useState<File | null>(null);
    const [prodThumb, setProdThumb] = useState<File | null>(null);

    // Sync formData with currentStore if it changes (e.g. after creation)
    useEffect(() => {
        if (currentStore) {
            setFormData(prev => ({ ...prev, ...currentStore }));
        }
    }, [currentStore]);

    // Filter products for this store
    const myProducts = currentStore ? products.filter(p => p.storeId === currentStore.id) : [];
    const totalRevenue = myProducts.reduce((sum, p) => sum + (p.sales * p.price), 0);
    const totalSales = myProducts.reduce((sum, p) => sum + p.sales, 0);

    const handleSaveStore = async () => {
        setIsSaving(true);
        const storeData: Storefront = {
            id: currentStore?.id || Date.now().toString(),
            ownerId: user.id,
            storeName: formData.storeName!,
            description: formData.description!,
            bannerUrl: formData.bannerUrl!,
            logoUrl: formData.logoUrl!,
            accentColor: formData.accentColor!,
            createdAt: currentStore?.createdAt || Date.now(),
            totalSales: currentStore?.totalSales || 0,
            rating: currentStore?.rating || 5
        };

        if (currentStore) await storageService.updateStore(storeData);
        else await storageService.createStore(storeData);

        await onRefresh();
        setIsSaving(false);
        alert("Store settings saved!");
    };

    const openProductModal = (product?: DigitalProduct) => {
        if (product) {
            setEditingProduct(product);
            setProdForm(product);
            setProdFile(null); // Keep existing unless changed
            setProdThumb(null);
        } else {
            setEditingProduct(null);
            setProdForm({ category: 'architecture', price: 5 });
            setProdFile(null);
            setProdThumb(null);
        }
        setShowProductModal(true);
    };

    const handleSaveProduct = async () => {
        if (!currentStore) return alert("Please save your store first.");
        if (!prodForm.title || !prodForm.price) return alert("Please fill title and price");
        if (!editingProduct && (!prodFile || !prodThumb)) return alert("Please upload file and thumbnail");

        setIsSaving(true);
        let fileUrl = prodForm.fileUrl;
        let thumbUrl = prodForm.thumbnailUrl;
        let fileType = prodForm.fileType;

        if (prodFile) {
            fileUrl = await storageService.uploadMedia(prodFile);
            fileType = prodFile.name.split('.').pop() || 'file';
        }
        if (prodThumb) {
            thumbUrl = await storageService.uploadMedia(prodThumb);
        }

        const productData: DigitalProduct = {
            id: editingProduct ? editingProduct.id : Date.now().toString(),
            storeId: currentStore.id,
            ownerId: user.id,
            title: prodForm.title!,
            description: prodForm.description || '',
            price: Number(prodForm.price),
            category: prodForm.category as DigitalCategory,
            subCategory: prodForm.subCategory as MechanicalSubCategory,
            thumbnailUrl: thumbUrl!,
            fileUrl: fileUrl!,
            fileType: fileType!,
            createdAt: editingProduct ? editingProduct.createdAt : Date.now(),
            sales: editingProduct ? editingProduct.sales : 0
        };

        if (editingProduct) {
            await storageService.updateDigitalProduct(productData);
        } else {
            await storageService.createDigitalProduct(productData);
        }

        setIsSaving(false);
        setShowProductModal(false);
        onRefresh();
    };

    const handleDeleteProduct = async (id: string) => {
        if (confirm("Are you sure you want to delete this product? This cannot be undone.")) {
            await storageService.deleteDigitalProduct(id);
            onRefresh();
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col shrink-0">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center space-x-3 mb-1">
                        <img src={formData.logoUrl} className="w-10 h-10 rounded-lg bg-white shadow-sm object-cover" />
                        <div className="overflow-hidden">
                            <h3 className="font-bold text-sm truncate">{formData.storeName}</h3>
                            <p className="text-xs text-gray-500">Store Manager</p>
                        </div>
                    </div>
                </div>
                
                <nav className="p-3 space-y-1 flex-1">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3"/> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'products' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Package className="w-5 h-5 mr-3"/> Products
                    </button>
                    <button 
                        onClick={() => setActiveTab('design')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'design' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Palette className="w-5 h-5 mr-3"/> Design
                    </button>
                </nav>

                <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                        <Button variant="outline" className="w-full justify-start text-red-500 hover:bg-red-50 border-red-200" onClick={onExit}>
                            <ChevronRight className="w-4 h-4 mr-2 rotate-180"/> Exit Manager
                        </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6">Store Overview</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/20 rounded-lg">
                                        <DollarSign className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">+12%</span>
                                </div>
                                <div className="text-3xl font-bold mb-1">${totalRevenue.toFixed(2)}</div>
                                <div className="text-indigo-100 text-sm">Total Revenue</div>
                            </Card>

                            <Card className="bg-white dark:bg-gray-800 p-6 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{totalSales}</div>
                                <div className="text-gray-500 text-sm">Total Sales</div>
                            </Card>

                            <Card className="bg-white dark:bg-gray-800 p-6 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                        <Package className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{myProducts.length}</div>
                                <div className="text-gray-500 text-sm">Active Products</div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="p-6">
                                <h3 className="font-bold mb-4 flex items-center"><BarChart className="w-4 h-4 mr-2"/> Sales Analytics</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={myProducts.map(p => ({ name: p.title.substring(0, 10), sales: p.sales }))}>
                                            <XAxis dataKey="name" fontSize={10} tick={{fill: '#888'}} />
                                            <YAxis fontSize={10} tick={{fill: '#888'}} />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}}
                                                itemStyle={{color: '#fff'}}
                                            />
                                            <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h3 className="font-bold mb-4 flex items-center"><PieChart className="w-4 h-4 mr-2"/> Recent Activity</h3>
                                <div className="space-y-4">
                                    {myProducts.length === 0 && <p className="text-gray-500 text-sm">No activity yet.</p>}
                                    {myProducts.slice(0, 5).map(p => (
                                        <div key={p.id} className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0">
                                            <div className="flex items-center">
                                                <img src={p.thumbnailUrl} className="w-10 h-10 rounded object-cover mr-3 bg-gray-100"/>
                                                <div>
                                                    <div className="font-bold text-sm">{p.title}</div>
                                                    <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-sm">${p.price}</div>
                                                <div className="text-xs text-green-500">{p.sales} sales</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Your Products</h2>
                            <Button onClick={() => openProductModal()}>
                                <Plus className="w-4 h-4 mr-2"/> Add Product
                            </Button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Product</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Price</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Sales</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {myProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500">
                                                No products found. Start selling today!
                                            </td>
                                        </tr>
                                    )}
                                    {myProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center space-x-3">
                                                    <img src={p.thumbnailUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-900 dark:text-white">{p.title}</div>
                                                        <Badge color="gray" className="text-[10px] mt-1">{p.category}</Badge>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-700 dark:text-gray-300">${p.price}</td>
                                            <td className="p-4 text-sm">{p.sales}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button 
                                                        onClick={() => openProductModal(p)}
                                                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteProduct(p.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DESIGN TAB */}
                {activeTab === 'design' && (
                    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden animate-slide-up">
                        {/* Editor Form */}
                        <div className="w-full lg:w-1/3 p-6 border-r border-gray-100 dark:border-gray-700 overflow-y-auto">
                            <h3 className="font-bold mb-6 text-lg">Store Appearance</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Store Name</label>
                                    <Input value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Description</label>
                                    <textarea 
                                        className="w-full p-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700 text-sm focus:ring-2 focus:ring-indigo-500" 
                                        rows={4}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Brand Color</label>
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg dark:border-gray-700">
                                        <input 
                                            type="color" 
                                            value={formData.accentColor} 
                                            onChange={e => setFormData({...formData, accentColor: e.target.value})}
                                            className="h-8 w-8 rounded cursor-pointer border-none bg-transparent"
                                        />
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300 uppercase">{formData.accentColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Banner Image</label>
                                    <div className="relative group cursor-pointer h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 transition-colors">
                                        <img src={formData.bannerUrl} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="w-6 h-6 text-white" />
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
                                <Button className="w-full" size="lg" onClick={handleSaveStore} isLoading={isSaving}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="w-full lg:w-2/3 bg-gray-100 dark:bg-gray-950 overflow-y-auto relative">
                            <div className="absolute top-4 right-4 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold z-10 shadow-lg pointer-events-none flex items-center">
                                <Eye className="w-3 h-3 mr-1"/> Live Preview
                            </div>
                            <div className="min-h-full bg-white dark:bg-gray-900 shadow-2xl mx-auto max-w-2xl my-8 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                                {/* Simulated Store Header */}
                                <div className="h-48 w-full relative">
                                    <img src={formData.bannerUrl} className="w-full h-full object-cover" />
                                    <div className="absolute -bottom-10 left-8">
                                        <img src={formData.logoUrl} className="w-24 h-24 rounded-xl border-4 border-white dark:border-gray-900 shadow-lg object-cover" />
                                    </div>
                                </div>
                                <div className="pt-14 px-8 pb-8">
                                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{formData.storeName}</h1>
                                    <p className="text-gray-500 mb-6">{formData.description}</p>
                                    <hr className="border-gray-100 dark:border-gray-800 mb-6"/>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PRODUCT MODAL */}
            <Modal 
                isOpen={showProductModal} 
                onClose={() => setShowProductModal(false)} 
                title={editingProduct ? "Edit Product" : "New Digital Product"}
                maxWidth="max-w-xl"
            >
                <div className="space-y-5">
                    <Input 
                        label="Product Title"
                        placeholder="e.g. Modern House Plans v2" 
                        value={prodForm.title || ''} 
                        onChange={e => setProdForm({...prodForm, title: e.target.value})} 
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Category</label>
                            <Select value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value as DigitalCategory})}>
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </Select>
                        </div>
                        {prodForm.category === 'mechanical' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Sub-Category</label>
                                <Select value={prodForm.subCategory || 'general'} onChange={e => setProdForm({...prodForm, subCategory: e.target.value as MechanicalSubCategory})}>
                                    {MECH_SUBS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </Select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Price ($)</label>
                            <Input type="number" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Description</label>
                        <textarea 
                            className="w-full p-3 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500" 
                            rows={3} 
                            value={prodForm.description || ''} 
                            onChange={e => setProdForm({...prodForm, description: e.target.value})} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Thumbnail Uploader */}
                        <div className={`border-2 border-dashed ${prodThumb || prodForm.thumbnailUrl ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700'} p-4 rounded-xl text-center cursor-pointer relative transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}>
                            <ImageIcon className={`w-6 h-6 mx-auto mb-2 ${prodThumb || prodForm.thumbnailUrl ? 'text-indigo-600' : 'text-gray-400'}`}/>
                            <span className="text-xs font-bold block text-gray-700 dark:text-gray-300">Thumbnail</span>
                            <span className="text-[10px] text-gray-400 block mt-1 truncate px-2">
                                {prodThumb ? prodThumb.name : (editingProduct ? 'Change Image' : 'Required')}
                            </span>
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setProdThumb(e.target.files?.[0] || null)} />
                        </div>

                        {/* File Uploader */}
                        <div className={`border-2 border-dashed ${prodFile || prodForm.fileUrl ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-700'} p-4 rounded-xl text-center cursor-pointer relative transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}>
                            <Download className={`w-6 h-6 mx-auto mb-2 ${prodFile || prodForm.fileUrl ? 'text-green-600' : 'text-gray-400'}`}/>
                            <span className="text-xs font-bold block text-gray-700 dark:text-gray-300">Digital File</span>
                            <span className="text-[10px] text-gray-400 block mt-1 truncate px-2">
                                {prodFile ? prodFile.name : (editingProduct ? 'Change File' : 'Required')}
                            </span>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setProdFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button className="w-full py-3 text-base" onClick={handleSaveProduct} isLoading={isSaving}>
                            {editingProduct ? 'Save Changes' : 'Create Product'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

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

    // --- MAIN RENDER ---
    if (viewMode === 'create-store' || viewMode === 'my-store') {
        return (
            <StoreEditor 
                user={user} 
                currentStore={myStore} 
                products={products}
                onRefresh={loadStoreAndProducts}
                onExit={() => setViewMode('market')}
            />
        );
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
                            className="bg-white text-indigo-900 hover:bg-gray-100 font-bold shadow-lg transform hover:-translate-y-0.5 transition-all"
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
                                    <Button size="sm" className="rounded-full px-4 bg-gray-900 hover:bg-black text-white">View</Button>
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
