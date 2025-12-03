
import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { LayoutDashboard, Wallet, Briefcase, Settings, Menu, Bell, LogOut, Moon, Sun, PlayCircle, ShoppingBag, Globe } from 'lucide-react';
import CreatorView from './components/CreatorView';
import EngagerView from './components/EngagerView';
import AdminView from './components/AdminView';
import ReelsView from './components/ReelsView';
import GigsView from './components/GigsView';
import CommunityView from './components/CommunityView';
import SettingsView from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { ToastContainer } from './components/UIComponents';
import { storageService } from './services/storageService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

type ViewState = 'dashboard' | 'reels' | 'gigs' | 'community' | 'settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Load User Session & Handle Email Redirects
  useEffect(() => {
    const initSession = async () => {
        // 1. Check active session
        const sessionUser = await storageService.getSession();
        if (sessionUser) {
            setUser(sessionUser);
        }

        // 2. Listen for Auth Changes (e.g., clicking confirmation link in email)
        if (isSupabaseConfigured()) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const profile = await storageService.getUserById(session.user.id);
                    if (profile) setUser(profile);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                }
            });
            return () => subscription.unsubscribe();
        }
    };
    initSession();
  }, []);

  // Poll for notifications
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
       const notes = await storageService.getNotifications(user.id);
       setNotifications(notes.slice(0, 3)); 
       setRefreshTrigger(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    await storageService.signOut();
    setUser(null);
    setCurrentView('dashboard');
  };

  const NavItem = ({ icon: Icon, label, viewId, onClick }: any) => (
    <button
      onClick={() => {
        if (onClick) onClick();
        else setCurrentView(viewId);
        setSidebarOpen(false); // Close mobile sidebar on click
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === viewId 
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  // --- AUTH SCREEN ---
  if (!user) {
    return <AuthView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex transition-colors duration-200 font-sans">
      
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">SocialPay</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="md:hidden p-2 text-gray-500">
            {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
          </button>
        </div>

        <div className="p-4 space-y-1">
          <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu</div>
          <NavItem icon={LayoutDashboard} label="Dashboard" viewId="dashboard" />
          <NavItem icon={PlayCircle} label="Reels" viewId="reels" />
          <NavItem icon={ShoppingBag} label="Gig Market" viewId="gigs" />
          <NavItem icon={Globe} label="Community" viewId="community" />
          <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">Account</div>
          <NavItem icon={Settings} label="Settings" viewId="settings" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
           <div className="flex items-center space-x-3 mb-4">
             <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-600 object-cover" alt="Profile" />
             <div className="overflow-hidden">
               <div className="text-sm font-bold truncate">{user.name}</div>
               <div className="text-xs text-gray-500 capitalize">{user.role}</div>
             </div>
           </div>
           
           <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors">
             <LogOut className="w-4 h-4" />
             <span>Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-8">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 max-w-xl mx-4">
             <h2 className="text-lg font-semibold capitalize text-gray-700 dark:text-gray-200">
               {currentView === 'gigs' ? 'Marketplace' : currentView === 'community' ? 'Community Feed' : currentView}
             </h2>
          </div>

          <div className="flex items-center space-x-4">
            {user.role === 'admin' && (
              <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Admin Mode
              </span>
            )}
            
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="hidden md:flex p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
            </button>
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {currentView === 'dashboard' && (
            <>
              {user.role === 'creator' && <CreatorView user={user} onUpdateUser={setUser} />}
              {user.role === 'engager' && <EngagerView user={user} onUpdateUser={setUser} refreshTrigger={refreshTrigger} />}
              {user.role === 'admin' && <AdminView />}
            </>
          )}
          {currentView === 'reels' && <ReelsView user={user} />}
          {currentView === 'gigs' && <GigsView user={user} onUpdateUser={setUser} />}
          {currentView === 'community' && <CommunityView user={user} />}
          {currentView === 'settings' && <SettingsView user={user} onUpdateUser={setUser} />}
        </div>
        
        {/* Toast Notifications */}
        <ToastContainer 
          notifications={notifications} 
          onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
        />
      </main>
    </div>
  );
};

export default App;
