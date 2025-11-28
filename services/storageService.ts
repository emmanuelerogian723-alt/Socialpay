import { User, Campaign, Transaction, Notification, Role, Video, Gig } from '../types';

// Keys for LocalStorage
const KEYS = {
  USERS: 'socialpay_users',
  CAMPAIGNS: 'socialpay_campaigns',
  TRANSACTIONS: 'socialpay_transactions',
  NOTIFICATIONS: 'socialpay_notifications',
  VIDEOS: 'socialpay_videos',
  GIGS: 'socialpay_gigs',
};

// Initial Seed Data
const seedData = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    const admin: User = {
      id: 'admin-01',
      email: 'emmanuelerog@gmail.com',
      name: 'Super Admin',
      avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff',
      role: 'admin',
      balance: 1000,
      xp: 0,
      badges: [],
      verificationStatus: 'verified',
      joinedAt: Date.now(),
      bio: 'System Administrator'
    };
    localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
  }
  if (!localStorage.getItem(KEYS.CAMPAIGNS)) localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.TRANSACTIONS)) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.VIDEOS)) {
    const seedVideos: Video[] = [
      {
        id: 'v1',
        userId: 'admin-01',
        userName: 'SocialPay Team',
        userAvatar: 'https://ui-avatars.com/api/?name=Social+Pay',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: 'Welcome to SocialPay Reels! 🎥',
        likes: 120,
        comments: 45,
        timestamp: Date.now()
      }
    ];
    localStorage.setItem(KEYS.VIDEOS, JSON.stringify(seedVideos));
  }
  if (!localStorage.getItem(KEYS.GIGS)) {
    const seedGigs: Gig[] = [
       {
         id: 'g1',
         sellerId: 'admin-01',
         sellerName: 'SocialPay Design',
         title: 'Professional Logo Design',
         description: 'I will design a modern, minimalist logo for your brand.',
         price: 50,
         category: 'graphics',
         image: 'https://images.unsplash.com/photo-1626785774573-4b799314346d?w=500&auto=format&fit=crop&q=60',
         timestamp: Date.now()
       }
    ];
    localStorage.setItem(KEYS.GIGS, JSON.stringify(seedGigs));
  }
};

seedData();

// --- Helpers ---
const get = <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]');
const set = (key: string, data: any[]) => localStorage.setItem(key, JSON.stringify(data));

export const storageService = {
  // --- Auth & Users ---
  getUsers: () => get<User>(KEYS.USERS),
  
  getUserByEmail: (email: string) => get<User>(KEYS.USERS).find(u => u.email === email),
  
  getUserById: (id: string) => get<User>(KEYS.USERS).find(u => u.id === id),
  
  createUser: (user: User) => {
    const users = get<User>(KEYS.USERS);
    users.push(user);
    set(KEYS.USERS, users);
    return user;
  },

  updateUser: (updatedUser: User) => {
    const users = get<User>(KEYS.USERS);
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      set(KEYS.USERS, users);
    }
  },

  // Admin function to directly manipulate wallet
  adminAdjustBalance: (userId: string, amount: number, reason: string) => {
    const users = get<User>(KEYS.USERS);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].balance += amount;
      set(KEYS.USERS, users);

      // Record Transaction
      const tx: Transaction = {
        id: Date.now().toString(),
        userId,
        userName: users[userIndex].name,
        amount: Math.abs(amount),
        type: 'adjustment',
        status: 'completed',
        method: 'Admin Action',
        details: reason,
        timestamp: Date.now()
      };
      storageService.createTransaction(tx);
    }
  },

  // --- Campaigns ---
  getCampaigns: () => get<Campaign>(KEYS.CAMPAIGNS).sort((a, b) => b.createdAt - a.createdAt),
  
  createCampaign: (campaign: Campaign) => {
    const list = get<Campaign>(KEYS.CAMPAIGNS);
    list.unshift(campaign);
    set(KEYS.CAMPAIGNS, list);
    
    storageService.createNotification({
      id: Date.now().toString(),
      userId: 'all',
      title: 'New Campaign Available!',
      message: `${campaign.creatorName} just posted a new ${campaign.platform} task.`,
      type: 'info',
      read: false,
      timestamp: Date.now()
    });
  },

  updateCampaign: (campaign: Campaign) => {
    const list = get<Campaign>(KEYS.CAMPAIGNS);
    const idx = list.findIndex(c => c.id === campaign.id);
    if (idx !== -1) {
      list[idx] = campaign;
      set(KEYS.CAMPAIGNS, list);
    }
  },

  // --- Transactions ---
  getTransactions: () => get<Transaction>(KEYS.TRANSACTIONS).sort((a, b) => b.timestamp - a.timestamp),

  createTransaction: (tx: Transaction) => {
    const list = get<Transaction>(KEYS.TRANSACTIONS);
    list.unshift(tx);
    set(KEYS.TRANSACTIONS, list);
  },

  updateTransactionStatus: (txId: string, status: 'completed' | 'rejected') => {
    const list = get<Transaction>(KEYS.TRANSACTIONS);
    const tx = list.find(t => t.id === txId);
    if (tx) {
      tx.status = status;
      set(KEYS.TRANSACTIONS, list);
      
      storageService.createNotification({
        id: Date.now().toString(),
        userId: tx.userId,
        title: `Transaction Update`,
        message: `Your transaction of $${tx.amount.toFixed(2)} (${tx.type}) has been ${status}.`,
        type: status === 'completed' ? 'success' : 'error',
        read: false,
        timestamp: Date.now()
      });
    }
  },

  // --- Videos (Reels) ---
  getVideos: () => get<Video>(KEYS.VIDEOS).sort((a, b) => b.timestamp - a.timestamp),
  addVideo: (video: Video) => {
    const list = get<Video>(KEYS.VIDEOS);
    list.unshift(video);
    set(KEYS.VIDEOS, list);
  },

  // --- Gigs ---
  getGigs: () => get<Gig>(KEYS.GIGS).sort((a, b) => b.timestamp - a.timestamp),
  createGig: (gig: Gig) => {
    const list = get<Gig>(KEYS.GIGS);
    list.unshift(gig);
    set(KEYS.GIGS, list);
  },

  // --- Notifications ---
  getNotifications: (userId: string) => {
    const all = get<Notification>(KEYS.NOTIFICATIONS);
    return all.filter(n => n.userId === 'all' || n.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },

  createNotification: (note: Notification) => {
    const list = get<Notification>(KEYS.NOTIFICATIONS);
    list.unshift(note);
    set(KEYS.NOTIFICATIONS, list);
  },

  broadcastMessage: (message: string) => {
    const list = get<Notification>(KEYS.NOTIFICATIONS);
    list.unshift({
      id: Date.now().toString(),
      userId: 'all',
      title: 'Admin Announcement',
      message: message,
      type: 'info',
      read: false,
      timestamp: Date.now()
    });
    set(KEYS.NOTIFICATIONS, list);
  }
};
