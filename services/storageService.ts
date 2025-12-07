
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Campaign, Transaction, Notification, Video, Gig, CommunityPost, CommunityComment, Draft, ChatMessage } from '../types';

// Helper to determine mode
const USE_SUPABASE = isSupabaseConfigured();

// --- LOCAL MOCK HELPERS (Fallback) ---
const getLocal = <T>(key: string, def: T): T => {
  try {
    const item = localStorage.getItem(`socialpay_${key}`);
    return item ? JSON.parse(item) : def;
  } catch { return def; }
};
const setLocal = (key: string, val: any) => localStorage.setItem(`socialpay_${key}`, JSON.stringify(val));

export const loadMediaFromDB = async (key: string): Promise<string | null> => {
  if (USE_SUPABASE) return null; // Supabase uses public URLs directly
  
  // IDB Fallback for Mock Mode
  return new Promise((resolve) => {
    const request = indexedDB.open('SocialPayMediaDB', 1);
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result ? getReq.result.data : null);
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
};

const saveMediaToIDB = async (blobStr: string): Promise<string> => {
    return new Promise((resolve) => {
        const request = indexedDB.open('SocialPayMediaDB', 1);
        request.onupgradeneeded = (e: any) => {
            e.target.result.createObjectStore('media');
        };
        request.onsuccess = (e: any) => {
            const db = e.target.result;
            const tx = db.transaction('media', 'readwrite');
            const id = `media_${Date.now()}_${Math.random()}`;
            tx.objectStore('media').put({ data: blobStr }, id);
            tx.oncomplete = () => resolve(`idb:${id}`);
        };
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
            emailRedirectTo: window.location.origin // Redirect back to current page
        }
      });
      if (error) throw error;
      return data;
    } else {
        // Mock Signup
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
      // We wait briefly to ensure session is set before fetching profile
      return this.getUserById(data.user.id);
    } else {
        // Mock Login
        const users = getLocal<User[]>('users', []);
        const user = users.find(u => u.email === email); // In mock, ignore password
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
                // Fix for "Invalid Refresh Token" loop
                if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
                    console.warn("Detected stale session. Clearing local storage to recover.");
                    await supabase.auth.signOut();
                    return null;
                }
                console.error("Session check error:", error);
                return null;
            }

            if (session?.user) {
                return this.getUserById(session.user.id);
            }
            return null;
          } catch (err) {
              console.error("Unexpected session handling error:", err);
              return null;
          }
      } else {
          return getLocal<User | null>('currentUser', null);
      }
  },

  // --- USERS ---
  async getUserById(id: string): Promise<User | null> {
    if (USE_SUPABASE) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        
        // If profile found, return it
        if (data) {
             return {
                ...data,
                verificationStatus: data.verification_status,
                joinedAt: data.joined_at,
                totalViews: 0, 
                totalLikes: 0
            } as User;
        }

        // AUTO-RECOVERY: If profile NOT found (likely first login after email confirm), check auth user
        // This acts as a client-side trigger to create the profile
        if (!data || error) {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            const user = authData?.user;

            // Only create profile if the requested ID matches the currently authenticated user
            if (user && user.id === id && !authError) {
                console.log("Profile not found in DB, creating from Auth Metadata...");
                
                const metadata = user.user_metadata || {};
                const newProfile = {
                    id: user.id,
                    email: user.email || '',
                    name: metadata.name || user.email?.split('@')[0] || 'User',
                    avatar: metadata.avatar || `https://ui-avatars.com/api/?name=${(metadata.name || 'User').replace(' ', '+')}&background=random`,
                    role: metadata.role || 'engager',
                    balance: 0,
                    xp: 0,
                    badges: [],
                    verification_status: 'unpaid',
                    joined_at: Date.now(),
                    followers: [],
                    following: []
                };

                const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
                
                if (insertError && insertError.code !== '23505') { // Ignore unique violation if parallel creation
                    console.warn("Auto-creation log (safe to ignore):", JSON.stringify(insertError));
                }

                return {
                    ...newProfile,
                    verificationStatus: newProfile.verification_status,
                    joinedAt: newProfile.joined_at,
                 } as User;
            }
            
            return null;
        }
        return null; // Should not reach here if data exists
      } catch (err) {
          console.error("Unexpected error fetching user", err);
          return null;
      }
    } else {
        const users = getLocal<User[]>('users', []);
        return users.find(u => u.id === id) || null;
    }
  },

  async updateUser(user: Partial<User>) {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('profiles').update({
        name: user.name, avatar: user.avatar, balance: user.balance,
        bio: user.bio, xp: user.xp, verification_status: user.verificationStatus,
        followers: user.followers
      }).eq('id', user.id);
      if (error) console.error("Error updating user", error);
    } else {
        const users = getLocal<User[]>('users', []);
        const idx = users.findIndex(u => u.id === user.id);
        if(idx !== -1) {
            users[idx] = { ...users[idx], ...user };
            setLocal('users', users);
            const current = getLocal<User>('currentUser', {} as User);
            if(current.id === user.id) setLocal('currentUser', users[idx]);
        }
    }
  },

  async getUsers(): Promise<User[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) { console.error("Error fetching users", error); return []; }
      return (data || []).map((u: any) => ({
        ...u, verificationStatus: u.verification_status, joinedAt: u.joined_at
      }));
    } else {
        return getLocal<User[]>('users', []);
    }
  },

  async adminAdjustBalance(userId: string, amount: number, reason: string) {
      // Common logic mostly, but implementing mock separately
      if (USE_SUPABASE) {
        const user = await this.getUserById(userId);
        if(user) {
            const newBalance = user.balance + amount;
            await this.updateUser({ ...user, balance: newBalance });
            await this.createTransaction({
                id: '', userId: user.id, userName: user.name, amount: Math.abs(amount),
                type: 'adjustment', status: 'completed', method: 'Admin', details: reason, timestamp: Date.now()
            });
        }
      } else {
         const user = await this.getUserById(userId);
         if(user) {
             const updated = { ...user, balance: user.balance + amount };
             await this.updateUser(updated);
             await this.createTransaction({
                 id: Date.now().toString(), userId, userName: user.name, amount: Math.abs(amount),
                 type: 'adjustment', status: 'completed', method: 'Admin', details: reason, timestamp: Date.now()
             });
         }
      }
  },

  // --- GAMES ---
  async recordGameReward(userId: string, amount: number, gameName: string) {
      if (USE_SUPABASE) {
          const user = await this.getUserById(userId);
          if (user) {
              const newBalance = user.balance + amount;
              const newXp = user.xp + 50;
              await this.updateUser({ ...user, balance: newBalance, xp: newXp });
              await this.createTransaction({
                  id: '', 
                  userId: user.id, 
                  userName: user.name, 
                  amount: amount,
                  type: 'earning', 
                  status: 'completed', 
                  method: 'System', 
                  details: `Game Win: ${gameName}`, 
                  timestamp: Date.now()
              });
          }
      } else {
          const user = await this.getUserById(userId);
          if (user) {
              const updated = { ...user, balance: user.balance + amount, xp: user.xp + 50 };
              await this.updateUser(updated);
              await this.createTransaction({
                  id: Date.now().toString(), 
                  userId, 
                  userName: user.name, 
                  amount: amount,
                  type: 'earning', 
                  status: 'completed', 
                  method: 'System', 
                  details: `Game Win: ${gameName}`, 
                  timestamp: Date.now()
              });
          }
      }
  },

  // --- CAMPAIGNS ---
  async getCampaigns(): Promise<Campaign[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (error) { console.error("Error fetching campaigns", error); return []; }
      return data.map((c: any) => ({
        ...c, creatorId: c.creator_id, creatorName: c.creator_name, targetUrl: c.target_url,
        rewardPerTask: c.reward_per_task, totalBudget: c.total_budget, remainingBudget: c.remaining_budget,
        completedCount: c.completed_count, createdAt: c.created_at
      }));
    } else {
        return getLocal<Campaign[]>('campaigns', []);
    }
  },

  async createCampaign(campaign: Campaign) {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('campaigns').insert([{
        creator_id: campaign.creatorId, creator_name: campaign.creatorName,
        platform: campaign.platform, type: campaign.type, title: campaign.title,
        description: campaign.description, target_url: campaign.targetUrl,
        reward_per_task: campaign.rewardPerTask, total_budget: campaign.totalBudget,
        remaining_budget: campaign.remainingBudget, status: campaign.status, created_at: Date.now()
      }]);
      if(error) throw error;
    } else {
        const list = getLocal<Campaign[]>('campaigns', []);
        list.unshift(campaign);
        setLocal('campaigns', list);
    }
  },

  async deleteCampaign(id: string) {
    if(USE_SUPABASE) await supabase.from('campaigns').delete().eq('id', id);
    else {
        const list = getLocal<Campaign[]>('campaigns', []);
        setLocal('campaigns', list.filter(c => c.id !== id));
    }
  },

  // --- TRANSACTIONS ---
  async getTransactions(userId?: string): Promise<Transaction[]> {
    if (USE_SUPABASE) {
      let query = supabase.from('transactions').select('*').order('timestamp', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) { console.error("Error fetching tx", error); return []; }
      return (data || []).map((t: any) => ({ ...t, userId: t.user_id, userName: t.user_name }));
    } else {
        const list = getLocal<Transaction[]>('transactions', []);
        return userId ? list.filter(t => t.userId === userId) : list;
    }
  },

  async createTransaction(tx: Transaction) {
    if (USE_SUPABASE) {
      await supabase.from('transactions').insert([{
        user_id: tx.userId, user_name: tx.userName, amount: tx.amount,
        type: tx.type, status: tx.status, method: tx.method, details: tx.details, timestamp: Date.now()
      }]);
    } else {
        const list = getLocal<Transaction[]>('transactions', []);
        if(!tx.id) tx.id = Date.now().toString();
        list.unshift(tx);
        setLocal('transactions', list);
    }
  },

  async updateTransactionStatus(id: string, status: string) {
    if (USE_SUPABASE) await supabase.from('transactions').update({ status }).eq('id', id);
    else {
        const list = getLocal<Transaction[]>('transactions', []);
        const idx = list.findIndex(t => t.id === id);
        if(idx !== -1) {
            list[idx].status = status as any;
            setLocal('transactions', list);
        }
    }
  },

  // --- MEDIA ---
  async uploadMedia(file: File): Promise<string> {
    if (USE_SUPABASE) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from('socialpay-media').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('socialpay-media').getPublicUrl(fileName);
      return data.publicUrl;
    } else {
        // Mock IDB Storage
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const idbUrl = await saveMediaToIDB(reader.result as string);
                resolve(idbUrl);
            };
            reader.readAsDataURL(file);
        });
    }
  },

  // --- VIDEOS ---
  async getVideos(page: number = 0, limit: number = 5): Promise<Video[]> {
    if (USE_SUPABASE) {
      const from = page * limit;
      const to = from + limit - 1;
      const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('timestamp', { ascending: false })
          .range(from, to);
          
      if (error) return [];
      return (data || []).map((v: any) => ({
        ...v, userId: v.user_id, userName: v.user_name, userAvatar: v.user_avatar,
        editingData: v.editing_data, comments: v.comments_count || 0
      }));
    } else {
        const list = getLocal<Video[]>('videos', []);
        const start = page * limit;
        return list.slice(start, start + limit);
    }
  },

  async addVideo(video: Video) {
    if (USE_SUPABASE) {
      const dbVideo = {
          user_id: video.userId,
          user_name: video.userName,
          user_avatar: video.userAvatar,
          url: video.url,
          caption: video.caption,
          tags: video.tags,
          editing_data: video.editingData,
          timestamp: video.timestamp,
          likes: 0,
          views: 0
      };
      await supabase.from('videos').insert([dbVideo]);
    } else {
        const list = getLocal<Video[]>('videos', []);
        list.unshift(video);
        setLocal('videos', list);
    }
  },

  async deleteVideo(id: string) {
    if(USE_SUPABASE) await supabase.from('videos').delete().eq('id', id);
    else {
        const list = getLocal<Video[]>('videos', []);
        setLocal('videos', list.filter(v => v.id !== id));
    }
  },

  async incrementVideoView(id: string) {
    if(USE_SUPABASE) {
         // Simple read-modify-write for demo (production should use RPC)
         const { data } = await supabase.from('videos').select('views').eq('id', id).single();
         if(data) {
             await supabase.from('videos').update({ views: (data.views || 0) + 1 }).eq('id', id);
         }
    } else {
        const list = getLocal<Video[]>('videos', []);
        const v = list.find(v => v.id === id);
        if(v) { v.views = (v.views || 0) + 1; setLocal('videos', list); }
    }
  },

  // --- DRAFTS ---
  async getDrafts(userId: string): Promise<Draft[]> {
    if(USE_SUPABASE) {
          const { data, error } = await supabase.from('drafts').select('*').eq('user_id', userId);
          if (error) return [];
          return data.map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              videoFile: d.video_file,
              caption: d.caption,
              tags: d.tags,
              editingData: d.editing_data,
              timestamp: d.timestamp
          }));
    } else {
        const list = getLocal<Draft[]>('drafts', []);
        return list.filter(d => d.userId === userId);
    }
  },

  async saveDraft(draft: Draft) {
    if(USE_SUPABASE) {
          const dbDraft = {
              user_id: draft.userId,
              video_file: draft.videoFile,
              caption: draft.caption,
              tags: draft.tags,
              editing_data: draft.editingData,
              timestamp: draft.timestamp
          };
          await supabase.from('drafts').insert([dbDraft]);
    } else {
        const list = getLocal<Draft[]>('drafts', []);
        list.push(draft);
        setLocal('drafts', list);
    }
  },

  // --- GIGS ---
  async getGigs(): Promise<Gig[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('gigs').select('*').order('timestamp', { ascending: false });
      if (error) return [];
      return (data || []).map((g: any) => ({ ...g, sellerId: g.seller_id, sellerName: g.seller_name, ratingCount: g.rating_count }));
    } else {
        return getLocal<Gig[]>('gigs', []);
    }
  },

  async createGig(gig: Gig) {
    if (USE_SUPABASE) {
      await supabase.from('gigs').insert([{
        seller_id: gig.sellerId, seller_name: gig.sellerName, title: gig.title,
        description: gig.description, price: gig.price, category: gig.category, image: gig.image, timestamp: Date.now()
      }]);
    } else {
        const list = getLocal<Gig[]>('gigs', []);
        list.unshift(gig);
        setLocal('gigs', list);
    }
  },

  async deleteGig(id: string) {
    if(USE_SUPABASE) await supabase.from('gigs').delete().eq('id', id);
    else {
        const list = getLocal<Gig[]>('gigs', []);
        setLocal('gigs', list.filter(g => g.id !== id));
    }
  },

  // --- COMMUNITY ---
  async getCommunityPosts(): Promise<CommunityPost[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('community_posts').select('*, post_comments(*)').order('timestamp', { ascending: false });
      if (error) return [];
      return (data || []).map((p: any) => ({
        ...p, userId: p.user_id, userName: p.user_name, userAvatar: p.user_avatar, likedBy: p.liked_by || [],
        commentsList: p.post_comments?.map((c: any) => ({ ...c, userId: c.user_id, userName: c.user_name, userAvatar: c.user_avatar })) || []
      }));
    } else {
        return getLocal<CommunityPost[]>('community_posts', []);
    }
  },

  async createCommunityPost(post: CommunityPost) {
    if (USE_SUPABASE) {
      await supabase.from('community_posts').insert([{
        user_id: post.userId, user_name: post.userName, user_avatar: post.userAvatar,
        content: post.content, image: post.image, video: post.video, audio: post.audio, timestamp: Date.now()
      }]);
    } else {
        const list = getLocal<CommunityPost[]>('community_posts', []);
        list.unshift(post);
        setLocal('community_posts', list);
    }
  },

  async likeCommunityPost(postId: string, userId: string) {
    if(USE_SUPABASE) {
          const { data } = await supabase.from('community_posts').select('liked_by, likes').eq('id', postId).single();
          if(data) {
              let likedBy = data.liked_by || [];
              let likes = data.likes || 0;
              if (likedBy.includes(userId)) {
                  likedBy = likedBy.filter((id: string) => id !== userId);
                  likes = Math.max(0, likes - 1);
              } else {
                  likedBy.push(userId);
                  likes = likes + 1;
              }
              await supabase.from('community_posts').update({ liked_by: likedBy, likes }).eq('id', postId);
          }
    } else {
        const list = getLocal<CommunityPost[]>('community_posts', []);
        const p = list.find(x => x.id === postId);
        if(p) {
            if(p.likedBy.includes(userId)) {
                p.likedBy = p.likedBy.filter(id => id !== userId);
                p.likes--;
            } else {
                p.likedBy.push(userId);
                p.likes++;
            }
            setLocal('community_posts', list);
        }
    }
  },

  async commentOnCommunityPost(postId: string, comment: CommunityComment) {
      if(USE_SUPABASE) {
          await supabase.from('post_comments').insert([{
              post_id: postId, user_id: comment.userId, user_name: comment.userName,
              user_avatar: comment.userAvatar, text: comment.text, timestamp: comment.timestamp
          }]);
      } else {
          const list = getLocal<CommunityPost[]>('community_posts', []);
          const p = list.find(x => x.id === postId);
          if(p) {
              if(!p.commentsList) p.commentsList = [];
              p.commentsList.push(comment);
              p.comments++;
              setLocal('community_posts', list);
          }
      }
  },

  // --- SOCIAL & NOTIFICATIONS ---
  async toggleFollow(userId: string, targetId: string) {
      if(USE_SUPABASE) {
          const { data } = await supabase.from('profiles').select('followers').eq('id', targetId).single();
          if(data) {
              let followers = data.followers || [];
              if (followers.includes(userId)) {
                  followers = followers.filter((id: string) => id !== userId);
              } else {
                  followers.push(userId);
              }
              await supabase.from('profiles').update({ followers }).eq('id', targetId);
          }
      } else {
          const users = getLocal<User[]>('users', []);
          const target = users.find(u => u.id === targetId);
          if(target) {
              if(!target.followers) target.followers = [];
              if(target.followers.includes(userId)) target.followers = target.followers.filter(id => id !== userId);
              else target.followers.push(userId);
              setLocal('users', users);
          }
      }
  },

  async getMessages(u1: string, u2: string): Promise<ChatMessage[]> {
    if(USE_SUPABASE) {
          const { data, error } = await supabase.from('messages')
            .select('*')
            .or(`and(sender_id.eq.${u1},receiver_id.eq.${u2}),and(sender_id.eq.${u2},receiver_id.eq.${u1})`)
            .order('timestamp', { ascending: true });
            
          if(error) return [];
          return data.map((m: any) => ({
              id: m.id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              text: m.text,
              timestamp: m.timestamp
          }));
    } else {
        const msgs = getLocal<ChatMessage[]>('messages', []);
        return msgs.filter(m => (m.senderId === u1 && m.receiverId === u2) || (m.senderId === u2 && m.receiverId === u1))
                   .sort((a,b) => a.timestamp - b.timestamp);
    }
  },

  async sendMessage(msg: ChatMessage) {
      if(USE_SUPABASE) {
          await supabase.from('messages').insert([{
              sender_id: msg.senderId,
              receiver_id: msg.receiverId,
              text: msg.text,
              timestamp: msg.timestamp
          }]);
      } else {
          const list = getLocal<ChatMessage[]>('messages', []);
          list.push(msg);
          setLocal('messages', list);
      }
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    if(USE_SUPABASE) {
        const { data, error } = await supabase.from('notifications')
          .select('*')
          .or(`user_id.eq.${userId},user_id.eq.all`)
          .order('timestamp', { ascending: false });
        
        if(error) {
            console.error("Error fetching notifications", error);
            return [];
        }
        return (data || []).map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            read: n.read,
            timestamp: n.timestamp
        }));
    } else {
        const list = getLocal<Notification[]>('notifications', []);
        return list.filter(n => n.userId === userId || n.userId === 'all')
                   .sort((a,b) => b.timestamp - a.timestamp);
    }
  },

  async createNotification(notification: Notification) {
      if(USE_SUPABASE) {
          await supabase.from('notifications').insert([{
              user_id: notification.userId,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              read: notification.read,
              timestamp: notification.timestamp
          }]);
      } else {
          const list = getLocal<Notification[]>('notifications', []);
          list.push(notification);
          setLocal('notifications', list);
      }
  },

  async broadcastMessage(message: string) {
      const notification: Notification = {
          id: Date.now().toString(),
          userId: 'all',
          title: 'Admin Broadcast',
          message: message,
          type: 'info',
          read: false,
          timestamp: Date.now()
      };
      await this.createNotification(notification);
  }
};
