
import React, { useState, useEffect, useRef } from 'react';
import { User, Notification } from '../types';
import { LayoutDashboard, Wallet, Briefcase, Settings, Menu, Bell, LogOut, Moon, Sun, PlayCircle, ShoppingBag, Globe, Gamepad2, Check, Download } from 'lucide-react';
import CreatorView from './components/CreatorView';
import EngagerView from './components/EngagerView';
import AdminView from './components/AdminView';
import ReelsView from './components/ReelsView';
import GigsView from './components/GigsView';
import CommunityView from './components/CommunityView';
import GameCentreView from './components/GameCentreView';
import { DigitalMarketView } from './components/DigitalMarketView';
import SettingsView from './components/SettingsView';
import LandingView from './components/LandingView';
import { AuthView } from './components/AuthView';
import { ToastContainer } from './components/UIComponents';
import { storageService } from './services/storageService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

type ViewState = 'dashboard' | 'reels' | 'gigs' | 'digital-market' | 'community' | 'games' | 'settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showWelcome, setShowWelcome] = useState(true); // Show Landing page by default
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load User Session & Handle Email Redirects
  useEffect(() => {
    const initSession = async () => {
        // 1. Check active session
        const sessionUser = await storageService.getSession();
        if (sessionUser) {
            setUser(sessionUser);
            setShowWelcome(false); // Skip welcome if already logged in
        } else {
            // Check if first visit in session storage
            const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
            if (hasSeenWelcome) setShowWelcome(false);
        }

        // 2. Listen for Auth Changes (e.g., clicking confirmation link in email)
        if (isSupabaseConfigured()) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const profile = await storageService.getUserById(session.user.id);
                    if (profile) {
                        setUser(profile);
                        setShowWelcome(false);
                    }
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
    
    const fetchNotes = async () => {
       const notes = await storageService.getNotifications(user.id);
       // Show last 50 notifications in the dropdown
       setNotifications(notes.slice(0, 50)); 
       setRefreshTrigger(prev => prev + 1);
    };

    fetchNotes();
    const interval = setInterval(fetchNotes, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setShowNotifications(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleGetStarted = () => {
      setShowWelcome(false);
      sessionStorage.setItem('hasSeenWelcome', 'true');
  };

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    await storageService.signOut();
    setUser(null);
    setCurrentView('dashboard');
    setShowWelcome(true);
  };

  const handleMarkRead = async (id: string) => {
      await storageService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
      if(!user) return;
      await storageService.markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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

  // --- WELCOME SCREEN ---
  if (showWelcome && !user) {
      return <LandingView onGetStarted={handleGetStarted} />;
  }

  // --- AUTH SCREEN ---
  if (!user) {
    return <AuthView onLogin={handleLogin} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

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
          <NavItem icon={Download} label="Digital Market" viewId="digital-market" />
          <NavItem icon={Globe} label="Community" viewId="community" />
          <NavItem icon={Gamepad2} label="Game Centre" viewId="games" />
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
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-8 z-20 relative">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 max-w-xl mx-4">
             <h2 className="text-lg font-semibold capitalize text-gray-700 dark:text-gray-200">
               {currentView === 'gigs' ? 'Marketplace' : 
                currentView === 'digital-market' ? 'Digital Store' :
                currentView === 'community' ? 'Community Feed' : 
                currentView === 'games' ? 'Arcade' : currentView}
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
            
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
                  )}
                </button>

                {showNotifications && (
                    <div className="absolute top-12 right-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slide-up origin-top-right">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Notifications</h3>
                            {unreadCount > 0 && (
                                <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium" onClick={handleMarkAllRead}>
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                                    No notifications yet.
                                </div>
                            )}
                            {notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleMarkRead(n.id)} 
                                    className={`p-4 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-semibold text-sm ${!n.read ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-200'}`}>{n.title}</span>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{new Date(n.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{n.message}</p>
                                    {!n.read && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 p-1 rounded-full" title="Mark as read">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
          {currentView === 'digital-market' && <DigitalMarketView user={user} onUpdateUser={setUser} />}
          {currentView === 'community' && <CommunityView user={user} />}
          {currentView === 'games' && <GameCentreView user={user} onUpdateUser={setUser} />}
          {currentView === 'settings' && <SettingsView user={user} onUpdateUser={setUser} />}
        </div>
        
        {/* Toast Notifications (Only showing recent unread items to avoid spam) */}
        <ToastContainer 
          notifications={notifications.filter(n => !n.read && (Date.now() - n.timestamp < 10000))} 
          onDismiss={(id) => handleMarkRead(id)} 
        />
      </main>
    </div>
  );
};

export default App;
