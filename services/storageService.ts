
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Campaign, Transaction, Notification, Video, Gig, CommunityPost, CommunityComment, Draft, ChatMessage, MusicTrack, Conversation, Storefront, DigitalProduct } from '../types';

// Helper to determine mode
const USE_SUPABASE = isSupabaseConfigured();

// --- SECURITY HELPER: INPUT SANITIZATION ---
// Prevents XSS attacks by stripping HTML tags from user input
const sanitize = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, ''); 
};

// --- INDEXED DB ADAPTER (Robust Fallback for Media) ---
const DB_NAME = 'SocialPayDB';
const DB_VERSION = 1;
const STORE_MEDIA = 'media';

const openIDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_MEDIA)) {
                db.createObjectStore(STORE_MEDIA);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const saveMediaToIDB = async (blob: Blob): Promise<string> => {
    try {
        const reader = new FileReader();
        const data = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

        if (!data) throw new Error("Failed to read blob data");

        const db = await openIDB();
        const tx = db.transaction(STORE_MEDIA, 'readwrite');
        const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return new Promise((resolve, reject) => {
            const req = tx.objectStore(STORE_MEDIA).put(data, id);
            tx.oncomplete = () => { /* committed */ };
            tx.onerror = () => reject(tx.error);
            req.onsuccess = () => resolve(`idb:${id}`);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("IDB Save Error:", e);
        return '';
    }
};

export const loadMediaFromDB = async (key: string): Promise<string | null> => {
  if (!key.startsWith('idb:')) return key;
  const realKey = key.split(':')[1];
  
  try {
      const db = await openIDB();
      return new Promise((resolve) => {
          const tx = db.transaction(STORE_MEDIA, 'readonly');
          const req = tx.objectStore(STORE_MEDIA).get(realKey);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
      });
  } catch (e) {
      return null;
  }
};

// --- LOCAL MOCK HELPERS ---
const getLocal = <T>(key: string, def: T): T => {
  try {
    const item = localStorage.getItem(`socialpay_${key}`);
    return item ? JSON.parse(item) : def;
  } catch { return def; }
};
const setLocal = (key: string, val: any) => localStorage.setItem(`socialpay_${key}`, JSON.stringify(val));

// --- IMAGE COMPRESSION HELPER ---
const compressImage = async (file: File | Blob): Promise<Blob> => {
    if (file.type && !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1080;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8);
        };
        img.onerror = () => resolve(file);
    });
};

export const storageService = {
  
  // --- AUTH ---
  async signUp(email: string, password: string, name: string, role: string) {
    const safeName = sanitize(name);
    if (USE_SUPABASE) {
      const avatar = `https://ui-avatars.com/api/?name=${safeName.replace(' ', '+')}&background=random`;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { 
            data: { name: safeName, role, avatar },
            emailRedirectTo: window.location.origin 
        }
      });
      if (error) throw error;
      return data;
    } else {
        const users = getLocal<User[]>('users', []);
        if (users.find(u => u.email === email)) throw new Error("User exists");
        const newUser: User = {
            id: `user-${Date.now()}`,
            email, name: safeName, role: role as any,
            avatar: `https://ui-avatars.com/api/?name=${safeName.replace(' ', '+')}&background=random`,
            balance: 0, xp: 0, badges: [], verificationStatus: 'unpaid',
            joinedAt: Date.now(), followers: [], following: []
        };
        users.push(newUser);
        setLocal('users', users);
        setLocal('currentUser', newUser);
        return { user: newUser };
    }
  },

  async signIn(email: string, password: string) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return this.getUserById(data.user.id);
    } else {
        const users = getLocal<User[]>('users', []);
        const user = users.find(u => u.email === email);
        if (!user) throw new Error("Invalid credentials");
        setLocal('currentUser', user);
        return user;
    }
  },

  async signOut() {
    if (USE_SUPABASE) await supabase.auth.signOut();
    else localStorage.removeItem('currentUser');
  },

  async getSession() {
      if (USE_SUPABASE) {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                if (error.message.includes("Refresh Token")) await supabase.auth.signOut();
                return null;
            }
            if (session?.user) return this.getUserById(session.user.id);
            return null;
          } catch { return null; }
      } else {
          return getLocal<User | null>('currentUser', null);
      }
  },

  // --- USERS ---
  async getUserById(id: string): Promise<User | null> {
    if (USE_SUPABASE) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) {
             return { ...data, verificationStatus: data.verification_status, joinedAt: data.joined_at, badges: data.badges || [], followers: data.followers || [], following: data.following || [] } as User;
        }
        return null;
      } catch { return null; }
    } else {
        return getLocal<User[]>('users', []).find(u => u.id === id) || null;
    }
  },

  async updateUser(user: Partial<User>) {
    const safeName = user.name ? sanitize(user.name) : undefined;
    const safeBio = user.bio ? sanitize(user.bio) : undefined;

    if (USE_SUPABASE) {
      await supabase.from('profiles').update({
        name: safeName, avatar: user.avatar, balance: user.balance,
        bio: safeBio, xp: user.xp, verification_status: user.verificationStatus,
        followers: user.followers
      }).eq('id', user.id);
    } else {
        const users = getLocal<User[]>('users', []);
        const idx = users.findIndex(u => u.id === user.id);
        if(idx !== -1) {
            users[idx] = { ...users[idx], ...user, name: safeName || users[idx].name, bio: safeBio || users[idx].bio };
            setLocal('users', users);
            setLocal('currentUser', users[idx]);
        }
    }
  },

  async updateUserLocation(userId: string, location: {lat: number, lng: number}) {
      console.log(`Updated location for ${userId}:`, location);
  },

  async getUsers(): Promise<User[]> {
      return USE_SUPABASE 
        ? (await supabase.from('profiles').select('*')).data?.map((u:any) => ({...u, verificationStatus: u.verification_status, badges: u.badges || [], followers: u.followers || [], following: u.following || []})) || []
        : getLocal<User[]>('users', []);
  },

  // --- MEDIA ---
  async uploadMedia(file: Blob | File): Promise<string> {
    let fileToUpload = file;
    if (file instanceof File || file instanceof Blob) {
        if ((file instanceof File ? file.type : file.type).startsWith('image/')) {
            try { fileToUpload = await compressImage(file); } catch {}
        }
    }

    if (USE_SUPABASE) {
        try {
            const fileExt = file instanceof File ? file.name.split('.').pop() : (file.type.includes('image') ? 'jpg' : 'webm');
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error } = await supabase.storage.from('socialpay-media').upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });
            if (error) throw error;
            const { data } = supabase.storage.from('socialpay-media').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (error) {
            return await saveMediaToIDB(fileToUpload);
        }
    } else {
        return await saveMediaToIDB(fileToUpload);
    }
  },

  // --- MESSAGING ---
  async getConversations(userId: string): Promise<Conversation[]> {
      if (USE_SUPABASE) {
          const { data } = await supabase.from('conversations').select('*').contains('participants', [userId]).order('last_message_time', { ascending: false });
          return (data || []).map((c: any) => ({ ...c, participantNames: c.participant_names, lastMessage: c.last_message, lastMessageTime: c.last_message_time, relatedGigId: c.related_gig_id }));
      } else {
          const all = getLocal<Conversation[]>('conversations', []);
          return all.filter(c => c.participants.includes(userId)).sort((a,b) => b.lastMessageTime - a.lastMessageTime);
      }
  },

  async createConversation(participants: string[], names: Record<string, string>, gigId?: string): Promise<Conversation> {
      const existing = await this.getConversations(participants[0]);
      const found = existing.find(c => participants.every(p => c.participants.includes(p)) && c.relatedGigId === gigId);
      if (found) return found;

      const newConv: Conversation = {
          id: `conv_${Date.now()}`,
          participants,
          participantNames: names,
          lastMessage: '',
          lastMessageTime: Date.now(),
          relatedGigId: gigId
      };

      if (USE_SUPABASE) {
          await supabase.from('conversations').insert([{ id: newConv.id, participants: newConv.participants, participant_names: newConv.participantNames, last_message: '', last_message_time: newConv.lastMessageTime, related_gig_id: gigId }]);
      } else {
          const all = getLocal<Conversation[]>('conversations', []);
          all.unshift(newConv);
          setLocal('conversations', all);
      }
      return newConv;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
      if (USE_SUPABASE) {
          const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('timestamp', { ascending: true });
          return (data || []).map((m: any) => ({ ...m, conversationId: m.conversation_id, senderId: m.sender_id, isFlagged: m.is_flagged }));
      } else {
          const all = getLocal<ChatMessage[]>('messages', []);
          return all.filter(m => m.conversationId === conversationId).sort((a, b) => a.timestamp - b.timestamp);
      }
  },

  async sendMessage(msg: ChatMessage) {
      const safeText = sanitize(msg.text);
      if (USE_SUPABASE) {
          await supabase.from('messages').insert([{ conversation_id: msg.conversationId, sender_id: msg.senderId, text: safeText, timestamp: msg.timestamp, is_flagged: msg.isFlagged }]);
          await supabase.from('conversations').update({ last_message: safeText, last_message_time: msg.timestamp }).eq('id', msg.conversationId);
      } else {
          const msgs = getLocal<ChatMessage[]>('messages', []);
          msgs.push({...msg, text: safeText});
          setLocal('messages', msgs);
          const convs = getLocal<Conversation[]>('conversations', []);
          const idx = convs.findIndex(c => c.id === msg.conversationId);
          if (idx !== -1) {
              convs[idx].lastMessage = safeText;
              convs[idx].lastMessageTime = msg.timestamp;
              setLocal('conversations', convs);
          }
      }
  },

  // --- CORE DATA & TRANSACTIONS ---
  async getCampaigns(): Promise<Campaign[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('campaigns').select('*').order('created_at', {ascending: false});
          return (data || []).map((c: any) => ({ ...c, creatorId: c.creator_id, creatorName: c.creator_name, rewardPerTask: c.reward_per_task, totalBudget: c.total_budget, remainingBudget: c.remaining_budget, completedCount: c.completed_count }));
      }
      return getLocal('campaigns', []);
  },
  async createCampaign(c: Campaign) {
      const safeTitle = sanitize(c.title);
      const safeDesc = sanitize(c.description);
      if(USE_SUPABASE) await supabase.from('campaigns').insert([{ creator_id: c.creatorId, creator_name: c.creatorName, platform: c.platform, type: c.type, title: safeTitle, description: safeDesc, reward_per_task: c.rewardPerTask, total_budget: c.totalBudget, remaining_budget: c.remainingBudget, status: c.status, created_at: Date.now() }]);
      else { const l = getLocal<Campaign[]>('campaigns', []); l.unshift({...c, title: safeTitle, description: safeDesc}); setLocal('campaigns', l); }
  },
  async deleteCampaign(id: string) {
      if(USE_SUPABASE) await supabase.from('campaigns').delete().eq('id', id);
      else { const l = getLocal<Campaign[]>('campaigns', []); setLocal('campaigns', l.filter(x=>x.id!==id)); }
  },

  async getTransactions(uid?: string): Promise<Transaction[]> {
      if(USE_SUPABASE) {
          let q = supabase.from('transactions').select('*').order('timestamp', {ascending: false});
          if(uid) q = q.eq('user_id', uid);
          const { data } = await q;
          return (data || []).map((t: any) => ({...t, userId: t.user_id, userName: t.user_name}));
      }
      const l = getLocal<Transaction[]>('transactions', []);
      return uid ? l.filter(t => t.userId === uid) : l;
  },
  async createTransaction(tx: Transaction) {
      if(USE_SUPABASE) await supabase.from('transactions').insert([{ user_id: tx.userId, user_name: tx.userName, amount: tx.amount, type: tx.type, status: tx.status, method: tx.method, details: tx.details, timestamp: Date.now(), related_gig_id: tx.relatedGigId }]);
      else { const l = getLocal('transactions', []); if(!tx.id) tx.id=Date.now().toString(); l.unshift(tx); setLocal('transactions', l); }
  },
  async updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'rejected') {
      if(USE_SUPABASE) {
          await supabase.from('transactions').update({ status }).eq('id', id);
      } else {
          const l = getLocal<Transaction[]>('transactions', []);
          const t = l.find(x => x.id === id);
          if(t) { t.status = status as any; setLocal('transactions', l); }
      }
  },
  async adminAdjustBalance(userId: string, amount: number, reason: string) {
      const user = await this.getUserById(userId);
      if(user) {
          const newBalance = user.balance + amount;
          await this.updateUser({...user, balance: newBalance});
          await this.createTransaction({ id: Date.now().toString(), userId: user.id, userName: user.name, amount: Math.abs(amount), type: amount >= 0 ? 'adjustment' : 'fee', status: 'completed', method: 'Admin', details: reason, timestamp: Date.now() });
      }
  },

  // --- CONTENT ---
  async getVideos(p=0, l=5): Promise<Video[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('videos').select('*').order('timestamp', {ascending: false}).range(p*l, (p*l)+l-1);
          return (data || []).map((v: any) => ({...v, userId: v.user_id, userName: v.user_name, userAvatar: v.user_avatar, editingData: v.editing_data, comments: v.comments_count}));
      }
      const list = getLocal<Video[]>('videos', []);
      return list.slice(p*l, (p*l)+l);
  },
  async addVideo(v: Video) {
      const safeCaption = sanitize(v.caption);
      if(USE_SUPABASE) await supabase.from('videos').insert([{ user_id: v.userId, user_name: v.userName, user_avatar: v.userAvatar, url: v.url, type: v.type, caption: safeCaption, tags: v.tags, editing_data: v.editingData, timestamp: v.timestamp }]);
      else { const l = getLocal('videos', []); l.unshift({...v, caption: safeCaption}); setLocal('videos', l); }
  },
  async incrementVideoView(id: string) {
      if(USE_SUPABASE) { const {data} = await supabase.from('videos').select('views').eq('id',id).single(); if(data) await supabase.from('videos').update({views: (data.views||0)+1}).eq('id',id); }
      else { const l = getLocal<Video[]>('videos', []); const v = l.find(x=>x.id===id); if(v) { v.views=(v.views||0)+1; setLocal('videos',l); } }
  },
  async deleteVideo(id: string) {
      if(USE_SUPABASE) await supabase.from('videos').delete().eq('id', id);
      else { const l = getLocal<Video[]>('videos', []); setLocal('videos', l.filter(x=>x.id!==id)); }
  },

  // --- MARKETPLACE ENGINE ---
  async getGigs(): Promise<Gig[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('gigs').select('*').order('timestamp', {ascending: false});
          return (data || []).map((g: any) => ({...g, sellerId: g.seller_id, sellerName: g.seller_name, secretDelivery: g.secret_delivery}));
      }
      return getLocal('gigs', []);
  },
  async createGig(g: Gig) {
      const safeTitle = sanitize(g.title);
      const safeDesc = sanitize(g.description);
      if(USE_SUPABASE) await supabase.from('gigs').insert([{ seller_id: g.sellerId, seller_name: g.sellerName, title: safeTitle, description: safeDesc, price: g.price, category: g.category, image: g.image, secret_delivery: g.secretDelivery, timestamp: Date.now() }]);
      else { const l = getLocal('gigs', []); l.unshift({...g, title: safeTitle, description: safeDesc}); setLocal('gigs', l); }
  },
  async deleteGig(id: string) {
      if(USE_SUPABASE) await supabase.from('gigs').delete().eq('id', id);
      else { const l = getLocal<Gig[]>('gigs', []); setLocal('gigs', l.filter(x=>x.id!==id)); }
  },
  
  // SECURE TRANSACTION PROCESSOR: GIGS (70/30 SPLIT)
  async processGigOrder(transactionId: string): Promise<{success: boolean}> {
      const FEE_PERCENTAGE = 0.30;
      
      if(USE_SUPABASE) {
          const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
          if(!tx) return {success: false};

          const sellerEarnings = tx.amount * (1 - FEE_PERCENTAGE); 
          const { data: gig } = await supabase.from('gigs').select('seller_id').eq('id', tx.related_gig_id).single();
          if(!gig) return {success: false};

          await supabase.from('transactions').update({status: 'completed'}).eq('id', transactionId);

          const { data: seller } = await supabase.from('profiles').select('*').eq('id', gig.seller_id).single();
          if(seller) {
              await supabase.from('profiles').update({balance: seller.balance + sellerEarnings}).eq('id', gig.seller_id);
              await supabase.from('transactions').insert([{
                  user_id: seller.id, user_name: seller.name, amount: sellerEarnings, type: 'earning', status: 'completed', method: 'Gig Sale', details: `Sale: ${tx.details} (after 30% fee)`, timestamp: Date.now()
              }]);
          }
          return {success: true};
      } else {
          // Local logic
          const transactions = getLocal<Transaction[]>('transactions', []);
          const txIndex = transactions.findIndex(t => t.id === transactionId);
          if (txIndex === -1) return {success: false};
          
          const tx = transactions[txIndex];
          if (tx.status === 'completed') return {success: false};

          const gigs = getLocal<Gig[]>('gigs', []);
          const gig = gigs.find(g => g.id === tx.relatedGigId);
          if (!gig) return {success: false};

          const sellerEarnings = tx.amount * (1 - FEE_PERCENTAGE);
          
          transactions[txIndex].status = 'completed';
          transactions[txIndex].details = `${tx.details} (Released)`;
          
          const users = getLocal<User[]>('users', []);
          const sellerIdx = users.findIndex(u => u.id === gig.sellerId);
          if (sellerIdx !== -1) {
              users[sellerIdx].balance += sellerEarnings;
              transactions.unshift({
                  id: `earn_${Date.now()}`,
                  userId: users[sellerIdx].id,
                  userName: users[sellerIdx].name,
                  amount: sellerEarnings,
                  type: 'earning',
                  status: 'completed',
                  method: 'Gig Sale',
                  details: `Sale of ${gig.title} (Net 70%)`,
                  timestamp: Date.now()
              });
              setLocal('users', users);
          }
          setLocal('transactions', transactions);
          return {success: true};
      }
  },

  // SECURE TRANSACTION PROCESSOR: DIGITAL PRODUCTS (70/30 SPLIT)
  async recordDigitalSale(productId: string, amount: number, sellerId: string) {
      const FEE_PERCENTAGE = 0.30;
      const sellerEarnings = amount * (1 - FEE_PERCENTAGE);
      
      if (USE_SUPABASE) {
          const { data: seller } = await supabase.from('profiles').select('*').eq('id', sellerId).single();
          if (seller) {
              await supabase.from('profiles').update({ balance: seller.balance + sellerEarnings }).eq('id', sellerId);
              await supabase.from('transactions').insert([{
                  user_id: sellerId,
                  user_name: seller.name,
                  amount: sellerEarnings,
                  type: 'earning',
                  status: 'completed',
                  method: 'Digital Sale',
                  details: `Digital Product Sale (Net 70%)`,
                  timestamp: Date.now()
              }]);
              
              const { data: prod } = await supabase.from('digital_products').select('sales').eq('id', productId).single();
              if(prod) await supabase.from('digital_products').update({ sales: (prod.sales || 0) + 1 }).eq('id', productId);
              
              const { data: store } = await supabase.from('storefronts').select('total_sales').eq('owner_id', sellerId).single();
              if(store) await supabase.from('storefronts').update({ total_sales: (store.total_sales || 0) + 1 }).eq('owner_id', sellerId);
          }
      } else {
          const users = getLocal<User[]>('users', []);
          const sellerIdx = users.findIndex(u => u.id === sellerId);
          if (sellerIdx !== -1) {
              users[sellerIdx].balance += sellerEarnings;
              setLocal('users', users);
              
              const transactions = getLocal<Transaction[]>('transactions', []);
              transactions.unshift({
                  id: `sale_${Date.now()}`,
                  userId: sellerId,
                  userName: users[sellerIdx].name,
                  amount: sellerEarnings,
                  type: 'earning',
                  status: 'completed',
                  method: 'Digital Sale',
                  details: `Digital Product Sale (Net 70%)`,
                  timestamp: Date.now()
              });
              setLocal('transactions', transactions);
          }
          
          const products = getLocal<DigitalProduct[]>('digital_products', []);
          const pIdx = products.findIndex(p => p.id === productId);
          if(pIdx !== -1) {
              products[pIdx].sales++;
              setLocal('digital_products', products);
          }
          
          const stores = getLocal<Storefront[]>('stores', []);
          const sIdx = stores.findIndex(s => s.ownerId === sellerId);
          if(sIdx !== -1) {
              stores[sIdx].totalSales++;
              setLocal('stores', stores);
          }
      }
  },

  // --- DIGITAL STORES ---
  async getStoreByOwner(ownerId: string): Promise<Storefront | null> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('storefronts').select('*').eq('owner_id', ownerId).single();
          if(data) return { ...data, ownerId: data.owner_id, storeName: data.store_name, bannerUrl: data.banner_url, logoUrl: data.logo_url, accentColor: data.accent_color, socialLinks: data.social_links, totalSales: data.total_sales, createdAt: data.created_at };
          return null;
      }
      return getLocal<Storefront[]>('stores', []).find(s => s.ownerId === ownerId) || null;
  },
  async createStore(s: Storefront) {
      const safeName = sanitize(s.storeName);
      const safeDesc = sanitize(s.description);
      if(USE_SUPABASE) await supabase.from('storefronts').insert([{ id: s.id, owner_id: s.ownerId, store_name: safeName, description: safeDesc, banner_url: s.bannerUrl, logo_url: s.logoUrl, accent_color: s.accentColor, theme: s.theme, social_links: s.socialLinks, created_at: s.createdAt, total_sales: 0, rating: 5 }]);
      else { const l = getLocal('stores', []); l.push({...s, storeName: safeName, description: safeDesc}); setLocal('stores', l); }
  },
  async updateStore(s: Storefront) {
      const safeName = sanitize(s.storeName);
      const safeDesc = sanitize(s.description);
      if(USE_SUPABASE) await supabase.from('storefronts').update({ store_name: safeName, description: safeDesc, banner_url: s.bannerUrl, logo_url: s.logoUrl, accent_color: s.accentColor, theme: s.theme, social_links: s.socialLinks }).eq('id', s.id);
      else { const l = getLocal<Storefront[]>('stores', []); const i = l.findIndex(x=>x.id===s.id); if(i!==-1) { l[i] = {...s, storeName: safeName, description: safeDesc}; setLocal('stores', l); } }
  },
  async getAllStores(): Promise<Storefront[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('storefronts').select('*');
          return (data || []).map((d: any) => ({...d, ownerId: d.owner_id, storeName: d.store_name, bannerUrl: d.banner_url, logoUrl: d.logo_url, accentColor: d.accent_color, socialLinks: d.social_links, totalSales: d.total_sales}));
      }
      return getLocal('stores', []);
  },
  async deleteStore(id: string) {
      if(USE_SUPABASE) {
          await supabase.from('digital_products').delete().eq('store_id', id);
          await supabase.from('storefronts').delete().eq('id', id);
      } else {
          setLocal('stores', getLocal<Storefront[]>('stores', []).filter(s => s.id !== id));
          setLocal('digital_products', getLocal<DigitalProduct[]>('digital_products', []).filter(p => p.storeId !== id));
      }
  },

  // --- DIGITAL PRODUCTS ---
  async getDigitalProducts(): Promise<DigitalProduct[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('digital_products').select('*');
          return (data || []).map((p: any) => ({ ...p, storeId: p.store_id, ownerId: p.owner_id, subCategory: p.sub_category, thumbnailUrl: p.thumbnail_url, fileUrl: p.file_url, fileType: p.file_type }));
      }
      return getLocal('digital_products', []);
  },
  async createDigitalProduct(p: DigitalProduct) {
      const safeTitle = sanitize(p.title);
      const safeDesc = sanitize(p.description);
      if(USE_SUPABASE) await supabase.from('digital_products').insert([{ id: p.id, store_id: p.storeId, owner_id: p.ownerId, title: safeTitle, description: safeDesc, price: p.price, category: p.category, sub_category: p.subCategory, thumbnail_url: p.thumbnailUrl, file_url: p.fileUrl, file_type: p.fileType, created_at: p.createdAt, sales: 0 }]);
      else { const l = getLocal('digital_products', []); l.push({...p, title: safeTitle, description: safeDesc}); setLocal('digital_products', l); }
  },
  async updateDigitalProduct(p: DigitalProduct) {
      const safeTitle = sanitize(p.title);
      const safeDesc = sanitize(p.description);
      if(USE_SUPABASE) await supabase.from('digital_products').update({ title: safeTitle, description: safeDesc, price: p.price, category: p.category, sub_category: p.subCategory, thumbnail_url: p.thumbnailUrl, file_url: p.fileUrl, file_type: p.fileType }).eq('id', p.id);
      else { const l = getLocal<DigitalProduct[]>('digital_products', []); const i = l.findIndex(x=>x.id===p.id); if(i!==-1) { l[i] = {...p, title: safeTitle, description: safeDesc}; setLocal('digital_products', l); } }
  },
  async deleteDigitalProduct(id: string) {
      if(USE_SUPABASE) await supabase.from('digital_products').delete().eq('id', id);
      else { const l = getLocal<DigitalProduct[]>('digital_products', []); setLocal('digital_products', l.filter(x=>x.id!==id)); }
  },

  // --- OTHERS ---
  async getNotifications(uid: string): Promise<Notification[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('timestamp', {ascending: false});
          return (data || []).map((n: any) => ({...n, userId: n.user_id}));
      }
      return getLocal<Notification[]>('notifications', []).filter(n => n.userId === uid);
  },
  async createNotification(n: Notification) {
      if(USE_SUPABASE) await supabase.from('notifications').insert([{ user_id: n.userId, title: n.title, message: n.message, type: n.type, read: n.read, timestamp: n.timestamp }]);
      else { const l = getLocal('notifications', []); if(!n.id) n.id=Date.now().toString(); l.unshift(n); setLocal('notifications', l); }
  },
  async markNotificationRead(id: string) {
      if(USE_SUPABASE) await supabase.from('notifications').update({ read: true }).eq('id', id);
      else { const l = getLocal<Notification[]>('notifications', []); const n = l.find(x=>x.id===id); if(n) { n.read=true; setLocal('notifications', l); } }
  },
  async markAllNotificationsRead(userId: string) {
      if(USE_SUPABASE) await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      else { const l = getLocal<Notification[]>('notifications', []); l.forEach(n => { if(n.userId === userId) n.read = true; }); setLocal('notifications', l); }
  },
  async getCommunityPosts(): Promise<CommunityPost[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('community_posts').select('*').order('timestamp', {ascending: false});
          return (data || []).map((p: any) => ({...p, userId: p.user_id, userName: p.user_name, userAvatar: p.user_avatar, likedBy: p.liked_by || [], commentsList: p.comments_list || []}));
      }
      return getLocal('community_posts', []);
  },
  async createCommunityPost(p: CommunityPost) {
      const safeContent = sanitize(p.content);
      if(USE_SUPABASE) await supabase.from('community_posts').insert([{ id: p.id, user_id: p.userId, user_name: p.userName, user_avatar: p.userAvatar, content: safeContent, image: p.image, video: p.video, audio: p.audio, likes: 0, comments: 0, comments_list: [], timestamp: p.timestamp, liked_by: [] }]);
      else { const l = getLocal('community_posts', []); l.unshift({...p, content: safeContent}); setLocal('community_posts', l); }
  },
  async likeCommunityPost(postId: string, userId: string) {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('community_posts').select('likes, liked_by').eq('id', postId).single();
          if(data) {
              const liked = (data.liked_by || []).includes(userId);
              const newLikedBy = liked ? data.liked_by.filter((id: string) => id !== userId) : [...(data.liked_by || []), userId];
              await supabase.from('community_posts').update({ likes: newLikedBy.length, liked_by: newLikedBy }).eq('id', postId);
          }
      } else {
          const l = getLocal<CommunityPost[]>('community_posts', []);
          const p = l.find(x => x.id === postId);
          if(p) {
              if (p.likedBy.includes(userId)) { p.likedBy = p.likedBy.filter(id => id !== userId); p.likes--; }
              else { p.likedBy.push(userId); p.likes++; }
              setLocal('community_posts', l);
          }
      }
  },
  async commentOnCommunityPost(postId: string, comment: CommunityComment) {
      const safeText = sanitize(comment.text);
      if(USE_SUPABASE) {
          const { data } = await supabase.from('community_posts').select('comments, comments_list').eq('id', postId).single();
          if(data) {
              const newList = [...(data.comments_list || []), {...comment, text: safeText}];
              await supabase.from('community_posts').update({ comments: newList.length, comments_list: newList }).eq('id', postId);
          }
      } else {
          const l = getLocal<CommunityPost[]>('community_posts', []);
          const p = l.find(x => x.id === postId);
          if(p) {
              if(!p.commentsList) p.commentsList = [];
              p.commentsList.push({...comment, text: safeText});
              p.comments++;
              setLocal('community_posts', l);
          }
      }
  },
  async getDrafts(uid: string): Promise<Draft[]> {
      const l = getLocal<Draft[]>('drafts', []);
      return l.filter(d => d.userId === uid);
  },
  async saveDraft(d: Draft) {
      const l = getLocal<Draft[]>('drafts', []);
      l.unshift(d);
      setLocal('drafts', l);
  },
  async toggleFollow(userId: string, targetId: string) {
      if(userId === targetId) return;
      const user = await this.getUserById(userId);
      const target = await this.getUserById(targetId);
      if(user && target) {
          const isFollowing = user.following.includes(targetId);
          if(isFollowing) {
              user.following = user.following.filter(id => id !== targetId);
              target.followers = target.followers.filter(id => id !== userId);
          } else {
              user.following.push(targetId);
              target.followers.push(userId);
          }
          await this.updateUser(user);
          await this.updateUser(target);
      }
  },
  async getMusicTracks(): Promise<MusicTrack[]> {
      const l = getLocal<MusicTrack[]>('music_tracks', []);
      return l;
  },
  async uploadMusicTrack(t: MusicTrack) {
      const safeTitle = sanitize(t.title);
      const l = getLocal<MusicTrack[]>('music_tracks', []);
      l.unshift({...t, title: safeTitle});
      setLocal('music_tracks', l);
  },
  async recordMusicPlay(trackId: string, artistId: string, price: number) {
      const l = getLocal<MusicTrack[]>('music_tracks', []);
      const t = l.find(x => x.id === trackId);
      if(t) { t.plays++; setLocal('music_tracks', l); }
      // Pay Artist (Micro-transaction)
      const users = getLocal<User[]>('users', []);
      const artist = users.find(u => u.id === artistId);
      if(artist) {
          artist.balance += price;
          setLocal('users', users);
      }
  },
  async recordGameReward(userId: string, amount: number, game: string) {
      if(amount <= 0) return;
      await this.createTransaction({
          id: `game_${Date.now()}`,
          userId, userName: 'System', amount, type: 'earning', status: 'completed', method: 'Game Reward', details: `Won in ${game}`, timestamp: Date.now()
      });
  },
  async broadcastMessage(msg: string) {
      // In a real app this would use WS, here we create notifications for all
      const users = await this.getUsers();
      const safeMsg = sanitize(msg);
      for(const u of users) {
          await this.createNotification({
              id: Date.now().toString() + Math.random(),
              userId: u.id, title: 'System Alert', message: safeMsg, type: 'info', read: false, timestamp: Date.now()
          });
      }
  }
};
