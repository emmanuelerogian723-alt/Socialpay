
import React, { useState, useEffect, useRef } from 'react';
import { User, Storefront, DigitalProduct, DigitalCategory, MechanicalSubCategory } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Select, Modal, Badge, HumanVerificationModal } from './UIComponents';
import { 
    ShoppingBag, Store, Edit3, Plus, Upload, Palette, Image as ImageIcon, 
    Download, Layout, Search, Filter, PenTool, Cpu, Building2, Smile, Box,
    ChevronRight, Save, Eye, Settings, FileText, CheckCircle, Trash2, 
    BarChart, DollarSign, Package, PieChart, MoreVertical, LayoutDashboard,
    ScanFace, BoxSelect, Sparkles, Globe, Share2, Instagram, Twitter, HelpCircle,
    Info
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
            theme: 'modern',
            bannerUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
            logoUrl: user.avatar,
            socialLinks: { instagram: '', twitter: '', website: '' }
        }
    );
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'design' | 'settings'>('dashboard');
    const [is3DMode, setIs3DMode] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    
    // Product State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<DigitalProduct | null>(null);
    const [prodForm, setProdForm] = useState<Partial<DigitalProduct>>({ category: 'architecture', price: 5 });
    const [prodFile, setProdFile] = useState<File | null>(null);
    const [prodThumb, setProdThumb] = useState<File | null>(null);

    // Sync formData with currentStore
    useEffect(() => {
        if (currentStore) {
            setFormData(prev => ({ 
                ...prev, 
                ...currentStore,
                socialLinks: currentStore.socialLinks || { instagram: '', twitter: '', website: '' }
            }));
        }
    }, [currentStore]);

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
            theme: formData.theme as any || 'modern',
            socialLinks: formData.socialLinks,
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

    const handleAIGenerate = () => {
        setIsGeneratingAI(true);
        // Simulate AI generation
        setTimeout(() => {
            const themes = ["Premium Digital Assets", "High-End Designs", "Exclusive Blueprints"];
            const randTheme = themes[Math.floor(Math.random() * themes.length)];
            setFormData(prev => ({
                ...prev,
                storeName: `${user.name} ${randTheme}`,
                description: `Welcome to the official digital outlet of ${user.name}. We specialize in high-quality, verified assets designed to elevate your projects. Browse our exclusive collection below.`
            }));
            setIsGeneratingAI(false);
        }, 1500);
    };

    const openProductModal = (product?: DigitalProduct) => {
        if (product) {
            setEditingProduct(product);
            setProdForm(product);
            setProdFile(null); 
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

    // Theme Styles
    const getThemeClasses = () => {
        switch(formData.theme) {
            case 'cyber': return 'bg-gray-900 text-green-400 font-mono border-green-500/50';
            case 'boutique': return 'bg-stone-50 text-stone-800 font-serif';
            default: return 'bg-white text-gray-900 font-sans';
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
                        <Palette className="w-5 h-5 mr-3"/> Design Studio
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Settings className="w-5 h-5 mr-3"/> Settings
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

                {/* DESIGN TAB & SETTINGS TAB remain mostly the same ... */}
                {/* ... */}
                {activeTab === 'design' && (
                    /* Existing Design Tab Code */
                    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden animate-slide-up">
                        <div className="w-full lg:w-1/3 p-6 border-r border-gray-100 dark:border-gray-700 overflow-y-auto">
                            {/* ... Content ... */}
                            <h3 className="font-bold mb-6 text-lg flex items-center justify-between">Store Appearance</h3>
                            <div className="space-y-6">
                                {/* ...Inputs... */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Premium Theme</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['modern', 'cyber', 'boutique'].map(t => (
                                            <button key={t} onClick={() => setFormData({...formData, theme: t as any})} className={`p-2 rounded border text-xs capitalize ${formData.theme === t ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'border-gray-200 dark:border-gray-700'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <Input label="Store Name" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                                <Input label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                <Input label="Banner URL" value={formData.bannerUrl} onChange={e => setFormData({...formData, bannerUrl: e.target.value})} />
                                <Button className="w-full" size="lg" onClick={handleSaveStore} isLoading={isSaving}>Save Changes</Button>
                            </div>
                        </div>
                        {/* Live Preview Placeholder */}
                        <div className="w-full lg:w-2/3 p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            <p className="text-gray-400">Live Preview Area</p>
                        </div>
                    </div>
                )}
                
                {activeTab === 'settings' && (
                    <div className="flex-1 p-8">
                        <h2 className="text-2xl font-bold mb-6">Settings</h2>
                        <Button onClick={handleSaveStore}>Save Settings</Button>
                    </div>
                )}
            </div>

            {/* PRODUCT MODAL WITH PROFIT CALCULATOR */}
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
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Price ($)</label>
                            <Input type="number" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: Number(e.target.value)})} />
                        </div>
                    </div>

                    {/* PROFIT CALCULATOR */}
                    {prodForm.price && prodForm.price > 0 && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="text-gray-500">Listing Price:</span>
                                <span className="font-bold">${Number(prodForm.price).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-2 text-red-500">
                                <span>Platform Fee (30%):</span>
                                <span>-${(Number(prodForm.price) * 0.30).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-indigo-200 dark:border-indigo-700">
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">Your Net Earnings:</span>
                                <span className="font-black text-green-600 text-lg">${(Number(prodForm.price) * 0.70).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Description</label>
                        <textarea 
                            className="w-full p-3 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500" 
                            rows={3} 
                            value={prodForm.description || ''} 
                            onChange={e => setProdForm({...prodForm, description: e.target.value})} 
                        />
                    </div>

                    {/* File Uploaders ... (Same as before) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border-2 border-dashed p-4 rounded-xl text-center"><span className="text-xs">Thumbnail</span><input type="file" className="block w-full text-xs mt-2" onChange={e => setProdThumb(e.target.files?.[0] || null)} /></div>
                        <div className="border-2 border-dashed p-4 rounded-xl text-center"><span className="text-xs">File</span><input type="file" className="block w-full text-xs mt-2" onChange={e => setProdFile(e.target.files?.[0] || null)} /></div>
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
    const [showVerification, setShowVerification] = useState(false);
    const [showGuide, setShowGuide] = useState(false); // NEW STATE
    
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);

    useEffect(() => {
        loadStoreAndProducts();
    }, [user.id]);

    const loadStoreAndProducts = async () => {
        const store = await storageService.getStoreByOwner(user.id);
        setMyStore(store);
        const allProducts = await storageService.getDigitalProducts();
        setProducts(allProducts);
    };

    const handleCreateStoreClick = () => {
        if (!user.isHuman) {
            setShowVerification(true);
        } else {
            setViewMode(myStore ? 'my-store' : 'create-store');
        }
    };

    const handleVerificationSuccess = async () => {
        setShowVerification(false);
        const updatedUser = { ...user, isHuman: true };
        await storageService.updateUser(updatedUser);
        onUpdateUser(updatedUser);
        setViewMode(myStore ? 'my-store' : 'create-store');
    };

    const handlePurchase = async (product: DigitalProduct) => {
        if (product.ownerId === user.id) return alert("You cannot buy your own product.");
        if (user.balance < product.price) return alert("Insufficient balance.");

        if (confirm(`Purchase "${product.title}" for $${product.price}?`)) {
            const updatedUser = { ...user, balance: user.balance - product.price };
            await storageService.updateUser(updatedUser);
            onUpdateUser(updatedUser);

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

            await storageService.recordDigitalSale(product.id, product.price, product.ownerId);
            loadStoreAndProducts();
            alert("Purchase successful! Download started.");
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
                            onClick={handleCreateStoreClick}
                        >
                            <Store className="w-4 h-4 mr-2" />
                            {myStore ? 'Manage My Store' : 'Create Your Store'}
                        </Button>
                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => setShowGuide(true)}>
                            How it Works
                        </Button>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setCatFilter('all')} className={`flex items-center px-6 py-3 rounded-xl border transition-all whitespace-nowrap font-bold shadow-sm ${catFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'}`}>All Items</button>
                {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCatFilter(cat.id)} className={`flex items-center px-5 py-3 rounded-xl border transition-all whitespace-nowrap font-bold shadow-sm ${catFilter === cat.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'}`}>
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
                        <div key={product.id} onClick={() => setSelectedProduct(product)} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl hover:border-indigo-500/30 transition-all flex flex-col h-full">
                            <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                                <img src={product.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute top-2 left-2">
                                    <Badge className="bg-white/90 text-black shadow-sm font-bold backdrop-blur">{CATEGORIES.find(c => c.id === product.category)?.label}</Badge>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">{product.title}</h3>
                                <div className="text-xs text-gray-500 mb-3 flex items-center"><Download className="w-3 h-3 mr-1" /> {product.sales} downloads</div>
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
                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-gray-500">Market is empty. Be the first to sell!</p>
                </div>
            )}

            {/* Product Details Modal */}
            <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Product Details" maxWidth="max-w-4xl">
                {selectedProduct && (
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/2">
                            <img src={selectedProduct.thumbnailUrl} className="w-full rounded-xl shadow-lg border border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="w-full md:w-1/2 flex flex-col">
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">{selectedProduct.title}</h1>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6">
                                <div className="text-3xl font-bold text-green-600 mb-1">${selectedProduct.price}</div>
                                <div className="text-sm text-gray-500">Includes secure download & license</div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-8">{selectedProduct.description}</p>
                            <Button className="flex-1 py-4 text-lg" onClick={() => handlePurchase(selectedProduct)}>Buy Now</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Human Verification Modal */}
            <HumanVerificationModal isOpen={showVerification} onClose={() => setShowVerification(false)} onSuccess={handleVerificationSuccess} />

            {/* --- GUIDE MODAL --- */}
            <Modal isOpen={showGuide} onClose={() => setShowGuide(false)} title="How to Sell on Social Pay" maxWidth="max-w-2xl">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-center">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
                            <h3 className="font-bold text-sm mb-2">Create Store</h3>
                            <p className="text-xs text-gray-500">Setup your branded storefront in seconds. Verify your identity to unlock selling.</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
                            <h3 className="font-bold text-sm mb-2">List Products</h3>
                            <p className="text-xs text-gray-500">Upload digital files (PDFs, designs, scripts). Set your price.</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
                            <h3 className="font-bold text-sm mb-2">Get Paid (70%)</h3>
                            <p className="text-xs text-gray-500">When a sale occurs, you instantly receive 70% of the price. SocialPay takes a 30% fee.</p>
                        </div>
                    </div>

                    <div className="bg-gray-900 text-white p-6 rounded-xl relative overflow-hidden">
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-1">Revenue Split Example</h3>
                                <p className="text-indigo-200 text-sm">Transparent pricing for everyone.</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black">$10.00</div>
                                <div className="text-xs uppercase tracking-wider opacity-70">Sale Price</div>
                            </div>
                        </div>
                        <div className="mt-6 space-y-2 relative z-10">
                            <div className="flex justify-between items-center p-2 bg-white/10 rounded">
                                <span className="text-sm">Platform Fee (30%)</span>
                                <span className="font-bold text-red-300">-$3.00</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-green-500/20 border border-green-500/50 rounded">
                                <span className="text-sm font-bold text-green-300">Your Earnings (70%)</span>
                                <span className="font-bold text-green-300">+$7.00</span>
                            </div>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
                    </div>

                    <Button className="w-full" onClick={() => setShowGuide(false)}>Got it</Button>
                </div>
            </Modal>
        </div>
    );
};
