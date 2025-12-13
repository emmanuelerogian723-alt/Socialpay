

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Campaign, Transaction, Notification, Video, Gig, CommunityPost, CommunityComment, Draft, ChatMessage, MusicTrack, Conversation, Storefront, DigitalProduct } from '../types';

// Helper to determine mode
const USE_SUPABASE = isSupabaseConfigured();

// --- INDEXED DB ADAPTER (Robust Fallback for Media) ---
// This ensures that even if Supabase isn't connected, we can store 
// large blobs (images/videos) locally in the browser so the user sees their data.

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
        // Read file first to prevent transaction auto-commit during async read
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
            
            // Handle transaction level errors/completion
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
  if (!key.startsWith('idb:')) return key; // Return as is if it's a normal URL
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

// --- LOCAL MOCK HELPERS (Metadata) ---
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
    if (USE_SUPABASE) {
      const avatar = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { 
            data: { name, role, avatar },
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
            email, name, role: role as any,
            avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`,
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

  // --- USERS & LOCATION ---
  async getUserById(id: string): Promise<User | null> {
    if (USE_SUPABASE) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) {
             return { 
                ...data, 
                verificationStatus: data.verification_status, 
                joinedAt: data.joined_at,
                badges: data.badges || [],
                followers: data.followers || [],
                following: data.following || [] 
             } as User;
        }
        if (!data || error) {
            // Auto-recovery for first login
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;
            if (user && user.id === id) {
                const metadata = user.user_metadata || {};
                const newProfile = {
                    id: user.id, email: user.email, name: metadata.name || 'User',
                    avatar: metadata.avatar, role: metadata.role || 'engager',
                    balance: 0, xp: 0, verification_status: 'unpaid', joined_at: Date.now(),
                    badges: [], followers: [], following: []
                };
                await supabase.from('profiles').insert([newProfile]);
                return { 
                    ...newProfile, 
                    verificationStatus: 'unpaid', 
                    joinedAt: Date.now(),
                    badges: [], followers: [], following: []
                } as unknown as User;
            }
        }
        return null;
      } catch { return null; }
    } else {
        return getLocal<User[]>('users', []).find(u => u.id === id) || null;
    }
  },

  async updateUser(user: Partial<User>) {
    if (USE_SUPABASE) {
      await supabase.from('profiles').update({
        name: user.name, avatar: user.avatar, balance: user.balance,
        bio: user.bio, xp: user.xp, verification_status: user.verificationStatus,
        followers: user.followers
      }).eq('id', user.id);
    } else {
        const users = getLocal<User[]>('users', []);
        const idx = users.findIndex(u => u.id === user.id);
        if(idx !== -1) {
            users[idx] = { ...users[idx], ...user };
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

  // --- MEDIA STORAGE ---
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
            console.warn("Cloud upload failed, falling back to local IndexedDB storage.", error);
            return await saveMediaToIDB(fileToUpload);
        }
    } else {
        return await saveMediaToIDB(fileToUpload);
    }
  },

  // --- CHAT & MESSAGING ---
  async getConversations(userId: string): Promise<Conversation[]> {
      if (USE_SUPABASE) {
          const { data } = await supabase.from('conversations').select('*').contains('participants', [userId]).order('last_message_time', { ascending: false });
          return (data || []).map((c: any) => ({
              ...c, participantNames: c.participant_names, lastMessage: c.last_message, lastMessageTime: c.last_message_time, relatedGigId: c.related_gig_id
          }));
      } else {
          const all = getLocal<Conversation[]>('conversations', []);
          return all.filter(c => c.participants.includes(userId)).sort((a,b) => b.lastMessageTime - a.lastMessageTime);
      }
  },

  async createConversation(participants: string[], names: Record<string, string>, gigId?: string): Promise<Conversation> {
      // Check if exists
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
          await supabase.from('conversations').insert([{
              id: newConv.id,
              participants: newConv.participants,
              participant_names: newConv.participantNames,
              last_message: '',
              last_message_time: newConv.lastMessageTime,
              related_gig_id: gigId
          }]);
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
          return (data || []).map((m: any) => ({
              ...m, conversationId: m.conversation_id, senderId: m.sender_id, isFlagged: m.is_flagged
          }));
      } else {
          const all = getLocal<ChatMessage[]>('messages', []);
          return all.filter(m => m.conversationId === conversationId).sort((a, b) => a.timestamp - b.timestamp);
      }
  },

  async sendMessage(msg: ChatMessage) {
      // Update Conversation Last Message
      if (USE_SUPABASE) {
          await supabase.from('messages').insert([{
              conversation_id: msg.conversationId, sender_id: msg.senderId, text: msg.text, timestamp: msg.timestamp, is_flagged: msg.isFlagged
          }]);
          await supabase.from('conversations').update({
              last_message: msg.text,
              last_message_time: msg.timestamp
          }).eq('id', msg.conversationId);
      } else {
          const msgs = getLocal<ChatMessage[]>('messages', []);
          msgs.push(msg);
          setLocal('messages', msgs);

          const convs = getLocal<Conversation[]>('conversations', []);
          const idx = convs.findIndex(c => c.id === msg.conversationId);
          if (idx !== -1) {
              convs[idx].lastMessage = msg.text;
              convs[idx].lastMessageTime = msg.timestamp;
              setLocal('conversations', convs);
          }
      }
  },

  // --- GENERIC DATA OPERATIONS ---
  async getCampaigns(): Promise<Campaign[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('campaigns').select('*').order('created_at', {ascending: false});
          return (data || []).map((c: any) => ({
              ...c, creatorId: c.creator_id, creatorName: c.creator_name, rewardPerTask: c.reward_per_task, totalBudget: c.total_budget, remainingBudget: c.remaining_budget, completedCount: c.completed_count
          }));
      }
      return getLocal('campaigns', []);
  },
  async createCampaign(c: Campaign) {
      if(USE_SUPABASE) await supabase.from('campaigns').insert([{
          creator_id: c.creatorId, creator_name: c.creatorName, platform: c.platform, type: c.type, title: c.title,
          description: c.description, reward_per_task: c.rewardPerTask, total_budget: c.totalBudget, remaining_budget: c.remainingBudget, status: c.status, created_at: Date.now()
      }]);
      else { const l = getLocal<Campaign[]>('campaigns', []); l.unshift(c); setLocal('campaigns', l); }
  },
  async deleteCampaign(id: string) {
      if(USE_SUPABASE) await supabase.from('campaigns').delete().eq('id', id);
      else { const l = getLocal<Campaign[]>('campaigns', []); setLocal('campaigns', l.filter(x=>x.id!==id)); }
  },

  // Transactions
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
      if(USE_SUPABASE) await supabase.from('transactions').insert([{
          user_id: tx.userId, user_name: tx.userName, amount: tx.amount, type: tx.type, status: tx.status, method: tx.method, details: tx.details, timestamp: Date.now(), related_gig_id: tx.relatedGigId
      }]);
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
          await this.createTransaction({
              id: Date.now().toString(),
              userId: user.id,
              userName: user.name,
              amount: Math.abs(amount),
              type: amount >= 0 ? 'adjustment' : 'fee',
              status: 'completed',
              method: 'Admin',
              details: reason,
              timestamp: Date.now()
          });
      }
  },

  // Videos
  async getVideos(p=0, l=5): Promise<Video[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('videos').select('*').order('timestamp', {ascending: false}).range(p*l, (p*l)+l-1);
          return (data || []).map((v: any) => ({...v, userId: v.user_id, userName: v.user_name, userAvatar: v.user_avatar, editingData: v.editing_data, comments: v.comments_count}));
      }
      const list = getLocal<Video[]>('videos', []);
      return list.slice(p*l, (p*l)+l);
  },
  async addVideo(v: Video) {
      if(USE_SUPABASE) await supabase.from('videos').insert([{
          user_id: v.userId, user_name: v.userName, user_avatar: v.userAvatar, url: v.url, type: v.type, caption: v.caption, tags: v.tags, editing_data: v.editingData, timestamp: v.timestamp
      }]);
      else { const l = getLocal('videos', []); l.unshift(v); setLocal('videos', l); }
  },
  async incrementVideoView(id: string) {
      if(USE_SUPABASE) { const {data} = await supabase.from('videos').select('views').eq('id',id).single(); if(data) await supabase.from('videos').update({views: (data.views||0)+1}).eq('id',id); }
      else { const l = getLocal<Video[]>('videos', []); const v = l.find(x=>x.id===id); if(v) { v.views=(v.views||0)+1; setLocal('videos',l); } }
  },
  async deleteVideo(id: string) {
      if(USE_SUPABASE) await supabase.from('videos').delete().eq('id', id);
      else { const l = getLocal<Video[]>('videos', []); setLocal('videos', l.filter(x=>x.id!==id)); }
  },

  // Gigs
  async getGigs(): Promise<Gig[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('gigs').select('*').order('timestamp', {ascending: false});
          return (data || []).map((g: any) => ({...g, sellerId: g.seller_id, sellerName: g.seller_name, secretDelivery: g.secret_delivery}));
      }
      return getLocal('gigs', []);
  },
  async createGig(g: Gig) {
      if(USE_SUPABASE) await supabase.from('gigs').insert([{ seller_id: g.sellerId, seller_name: g.sellerName, title: g.title, description: g.description, price: g.price, category: g.category, image: g.image, secret_delivery: g.secretDelivery, timestamp: Date.now() }]);
      else { const l = getLocal('gigs', []); l.unshift(g); setLocal('gigs', l); }
  },
  async deleteGig(id: string) {
      if(USE_SUPABASE) await supabase.from('gigs').delete().eq('id', id);
      else { const l = getLocal<Gig[]>('gigs', []); setLocal('gigs', l.filter(x=>x.id!==id)); }
  },
  
  async processGigOrder(transactionId: string): Promise<{success: boolean}> {
      // Logic for releasing order funds
      if(USE_SUPABASE) {
          const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
          if(!tx) return {success: false};

          const sellerEarnings = tx.amount * 0.70;
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
          const transactions = getLocal<Transaction[]>('transactions', []);
          const txIndex = transactions.findIndex(t => t.id === transactionId);
          if (txIndex === -1) return {success: false};
          
          const tx = transactions[txIndex];
          const sellerEarnings = tx.amount * 0.70;

          transactions[txIndex].status = 'completed';
          setLocal('transactions', transactions);

          const gigs = getLocal<Gig[]>('gigs', []);
          const gig = gigs.find(g => g.id === tx.relatedGigId);
          if (!gig) return {success: false};

          const users = getLocal<User[]>('users', []);
          const sellerIndex = users.findIndex(u => u.id === gig.sellerId);
          if (sellerIndex !== -1) {
              users[sellerIndex].balance += sellerEarnings;
              setLocal('users', users);
              transactions.unshift({
                  id: Date.now().toString(), userId: users[sellerIndex].id, userName: users[sellerIndex].name, amount: sellerEarnings, type: 'earning', status: 'completed', method: 'Gig Sale', details: `Sale: ${tx.details} (after 30% fee)`, timestamp: Date.now()
              } as any);
              setLocal('transactions', transactions);
          }
          return {success: true};
      }
  },

  // Community
  async getCommunityPosts(): Promise<CommunityPost[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('community_posts').select('*, post_comments(*)').order('timestamp', {ascending: false});
          return (data || []).map((p: any) => ({
              ...p, userId: p.user_id, userName: p.user_name, userAvatar: p.user_avatar, likedBy: p.liked_by||[],
              commentsList: p.post_comments?.map((c:any) => ({...c, userId: c.user_id, userName: c.user_name, userAvatar: c.user_avatar})) || []
          }));
      }
      return getLocal('community_posts', []);
  },
  async createCommunityPost(p: CommunityPost) {
      if(USE_SUPABASE) await supabase.from('community_posts').insert([{ user_id: p.userId, user_name: p.userName, user_avatar: p.userAvatar, content: p.content, image: p.image, video: p.video, audio: p.audio, timestamp: Date.now() }]);
      else { const l = getLocal('community_posts', []); l.unshift(p); setLocal('community_posts', l); }
  },
  async likeCommunityPost(pid: string, uid: string) {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('community_posts').select('liked_by, likes').eq('id', pid).single();
          if(data) {
              let arr = data.liked_by || [];
              let cnt = data.likes || 0;
              if(arr.includes(uid)) { arr = arr.filter((x:string)=>x!==uid); cnt--; } else { arr.push(uid); cnt++; }
              await supabase.from('community_posts').update({liked_by: arr, likes: cnt}).eq('id', pid);
          }
      } else {
          const l = getLocal<CommunityPost[]>('community_posts', []);
          const p = l.find(x=>x.id===pid);
          if(p) { 
              if(p.likedBy.includes(uid)) { p.likedBy = p.likedBy.filter(x=>x!==uid); p.likes--; } else { p.likedBy.push(uid); p.likes++; }
              setLocal('community_posts', l); 
          }
      }
  },
  async commentOnCommunityPost(postId: string, comment: CommunityComment) {
      if(USE_SUPABASE) {
          await supabase.from('post_comments').insert([{
              post_id: postId, user_id: comment.userId, user_name: comment.userName, user_avatar: comment.userAvatar, text: comment.text, timestamp: comment.timestamp
          }]);
          const { data } = await supabase.from('community_posts').select('comments').eq('id', postId).single();
          if(data) await supabase.from('community_posts').update({comments: (data.comments||0)+1}).eq('id', postId);
      } else {
          const l = getLocal<CommunityPost[]>('community_posts', []);
          const p = l.find(x=>x.id===postId);
          if(p) {
              if(!p.commentsList) p.commentsList = [];
              p.commentsList.push(comment);
              p.comments++;
              setLocal('community_posts', l);
          }
      }
  },

  // Music
  async getMusicTracks(): Promise<MusicTrack[]> {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('music_tracks').select('*').order('created_at', {ascending: false});
          return (data || []).map((t:any) => ({...t, artistId: t.artist_id, artistName: t.artist_name, coverUrl: t.cover_url, audioUrl: t.audio_url, createdAt: t.created_at}));
      }
      return getLocal('music_tracks', []);
  },
  async uploadMusicTrack(t: MusicTrack) {
      if(USE_SUPABASE) await supabase.from('music_tracks').insert([{ artist_id: t.artistId, artist_name: t.artistName, title: t.title, cover_url: t.coverUrl, audio_url: t.audioUrl, genre: t.genre, price: t.price, created_at: t.createdAt }]);
      else { const l = getLocal('music_tracks', []); l.unshift(t); setLocal('music_tracks', l); }
  },
  async recordMusicPlay(tid: string, aid: string, price: number) {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('music_tracks').select('plays').eq('id', tid).single();
          if(data) await supabase.from('music_tracks').update({plays: (data.plays||0)+1}).eq('id', tid);
          // Pay artist
          const artist = await this.getUserById(aid);
          if(artist) await this.updateUser({...artist, balance: artist.balance + price});
      } else {
          const l = getLocal<MusicTrack[]>('music_tracks', []);
          const t = l.find(x=>x.id===tid);
          if(t) { t.plays++; setLocal('music_tracks', l); }
          // Pay mock artist
          const users = getLocal<User[]>('users', []);
          const a = users.find(u=>u.id===aid);
          if(a) { a.balance += price; setLocal('users', users); }
      }
  },
  
  // Games
  async recordGameReward(userId: string, amount: number, gameName: string) {
      const user = await this.getUserById(userId);
      if(user) {
          await this.updateUser({...user, balance: user.balance + amount, xp: user.xp + 50});
          await this.createTransaction({
              id: '', userId: user.id, userName: user.name, amount, type: 'earning', status: 'completed', method: 'System', details: `Game: ${gameName}`, timestamp: Date.now()
          });
      }
  },

  // Drafts
  async getDrafts(uid: string): Promise<Draft[]> {
      if(USE_SUPABASE) {
          const {data} = await supabase.from('drafts').select('*').eq('user_id', uid);
          return (data||[]).map((d:any)=>({id:d.id, userId:d.user_id, videoFile:d.video_file, type:d.type, caption:d.caption, tags:d.tags, editingData:d.editing_data, timestamp:d.timestamp}));
      }
      return getLocal<Draft[]>('drafts', []).filter(d => d.userId === uid);
  },
  async saveDraft(d: Draft) {
      if(USE_SUPABASE) await supabase.from('drafts').insert([{user_id:d.userId, video_file:d.videoFile, type:d.type, caption:d.caption, tags:d.tags, editing_data:d.editingData, timestamp:d.timestamp}]);
      else { const l = getLocal('drafts', []); l.push(d); setLocal('drafts', l); }
  },
  
  // Follows
  async toggleFollow(uid: string, targetId: string) {
      if(USE_SUPABASE) {
          const {data} = await supabase.from('profiles').select('followers').eq('id', targetId).single();
          if(data) {
              let arr = data.followers || [];
              if(arr.includes(uid)) arr = arr.filter((x:string)=>x!==uid); else arr.push(uid);
              await supabase.from('profiles').update({followers: arr}).eq('id', targetId);
          }
      } else {
          const users = getLocal<User[]>('users', []);
          const t = users.find(u=>u.id===targetId);
          if(t) { if(t.followers.includes(uid)) t.followers=t.followers.filter(x=>x!==uid); else t.followers.push(uid); setLocal('users', users); }
      }
  },
  
  // Notifications
  async getNotifications(uid: string): Promise<Notification[]> {
      if(USE_SUPABASE) {
          const {data} = await supabase.from('notifications').select('*').or(`user_id.eq.${uid},user_id.eq.all`).order('timestamp', {ascending: false});
          return (data||[]).map((n:any)=>({id:n.id, userId:n.user_id, title:n.title, message:n.message, type:n.type, read:n.read, timestamp:n.timestamp}));
      }
      return getLocal<Notification[]>('notifications', []).filter(n => n.userId === uid || n.userId === 'all').sort((a,b) => b.timestamp - a.timestamp);
  },
  async createNotification(n: Notification) {
      if(USE_SUPABASE) await supabase.from('notifications').insert([{user_id:n.userId, title:n.title, message:n.message, type:n.type, read:n.read, timestamp:n.timestamp}]);
      else { const l = getLocal('notifications', []); l.push(n); setLocal('notifications', l); }
  },
  async markNotificationRead(id: string) {
      if(USE_SUPABASE) {
          await supabase.from('notifications').update({ read: true }).eq('id', id);
      } else {
          const l = getLocal<Notification[]>('notifications', []);
          const n = l.find(x => x.id === id);
          if (n) { n.read = true; setLocal('notifications', l); }
      }
  },
  async markAllNotificationsRead(userId: string) {
      if(USE_SUPABASE) {
          await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      } else {
          const l = getLocal<Notification[]>('notifications', []);
          l.forEach(n => { if(n.userId === userId) n.read = true; });
          setLocal('notifications', l);
      }
  },
  async broadcastMessage(msg: string) {
      await this.createNotification({id:Date.now().toString(), userId:'all', title:'Admin Broadcast', message:msg, type:'info', read:false, timestamp:Date.now()});
  },

  // --- DIGITAL MARKET (STORES & PRODUCTS) ---
  async getStoreByOwner(userId: string): Promise<Storefront | null> {
      if (USE_SUPABASE) {
          const { data } = await supabase.from('storefronts').select('*').eq('owner_id', userId).single();
          if (data) {
              return {
                  id: data.id, ownerId: data.owner_id, storeName: data.store_name, description: data.description,
                  bannerUrl: data.banner_url, logoUrl: data.logo_url, accentColor: data.accent_color,
                  createdAt: data.created_at, totalSales: data.total_sales, rating: data.rating
              };
          }
          return null;
      }
      return getLocal<Storefront[]>('storefronts', []).find(s => s.ownerId === userId) || null;
  },
  async createStore(s: Storefront) {
      if (USE_SUPABASE) await supabase.from('storefronts').insert([{
          id: s.id, owner_id: s.ownerId, store_name: s.storeName, description: s.description,
          banner_url: s.bannerUrl, logo_url: s.logoUrl, accent_color: s.accentColor, created_at: s.createdAt,
          total_sales: 0, rating: 5
      }]);
      else { const l = getLocal('storefronts', []); l.push(s); setLocal('storefronts', l); }
  },
  async updateStore(s: Storefront) {
      if (USE_SUPABASE) await supabase.from('storefronts').update({
          store_name: s.storeName, description: s.description, banner_url: s.bannerUrl, 
          logo_url: s.logoUrl, accent_color: s.accentColor
      }).eq('id', s.id);
      else { 
          const l = getLocal<Storefront[]>('storefronts', []); 
          const idx = l.findIndex(x => x.id === s.id); 
          if(idx!==-1) { l[idx]=s; setLocal('storefronts', l); }
      }
  },
  async getDigitalProducts(storeId?: string): Promise<DigitalProduct[]> {
      if (USE_SUPABASE) {
          let q = supabase.from('digital_products').select('*');
          if(storeId) q = q.eq('store_id', storeId);
          const { data } = await q.order('created_at', {ascending: false});
          return (data || []).map((p: any) => ({
              id: p.id, storeId: p.store_id, ownerId: p.owner_id, title: p.title, description: p.description,
              price: p.price, category: p.category, subCategory: p.sub_category, thumbnailUrl: p.thumbnail_url,
              fileUrl: p.file_url, fileType: p.file_type, previewImages: p.preview_images, createdAt: p.created_at, sales: p.sales
          }));
      }
      const l = getLocal<DigitalProduct[]>('digital_products', []);
      return storeId ? l.filter(p => p.storeId === storeId) : l;
  },
  async createDigitalProduct(p: DigitalProduct) {
      if(USE_SUPABASE) await supabase.from('digital_products').insert([{
          id: p.id, store_id: p.storeId, owner_id: p.ownerId, title: p.title, description: p.description,
          price: p.price, category: p.category, sub_category: p.subCategory, thumbnail_url: p.thumbnailUrl,
          file_url: p.fileUrl, file_type: p.fileType, preview_images: p.previewImages, created_at: p.createdAt, sales: 0
      }]);
      else { const l = getLocal('digital_products', []); l.unshift(p); setLocal('digital_products', l); }
  },
  async recordDigitalSale(productId: string, price: number, sellerId: string) {
      // 1. Increment Sales
      // 2. Pay Seller (85% to seller, 15% platform fee for digital goods)
      const sellerEarnings = price * 0.85;
      
      if(USE_SUPABASE) {
          const { data } = await supabase.from('digital_products').select('sales').eq('id', productId).single();
          if(data) await supabase.from('digital_products').update({sales: (data.sales||0)+1}).eq('id', productId);
          
          const { data: seller } = await supabase.from('profiles').select('*').eq('id', sellerId).single();
          if(seller) {
              await supabase.from('profiles').update({balance: seller.balance + sellerEarnings}).eq('id', sellerId);
              await supabase.from('storefronts').update({total_sales: (await supabase.from('storefronts').select('total_sales').eq('owner_id', sellerId).single()).data?.total_sales + 1}).eq('owner_id', sellerId);
          }
      } else {
          const l = getLocal<DigitalProduct[]>('digital_products', []);
          const p = l.find(x=>x.id===productId);
          if(p) { p.sales++; setLocal('digital_products', l); }
          
          const users = getLocal<User[]>('users', []);
          const u = users.find(x=>x.id===sellerId);
          if(u) { u.balance += sellerEarnings; setLocal('users', users); }
          
          const stores = getLocal<Storefront[]>('storefronts', []);
          const s = stores.find(x=>x.ownerId===sellerId);
          if(s) { s.totalSales++; setLocal('storefronts', stores); }
      }
  }
};
