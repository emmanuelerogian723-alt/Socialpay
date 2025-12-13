

export type Role = 'creator' | 'engager' | 'admin';

export type Platform = 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'linkedin';

export type TaskType = 'like' | 'comment' | 'follow' | 'share' | 'view';

export type VerificationStatus = 'unpaid' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: Role;
  balance: number;
  xp: number;
  badges: string[];
  verificationStatus: VerificationStatus;
  joinedAt: number;
  bio?: string;
  followers: string[];
  following: string[];
  totalViews?: number;
  totalLikes?: number;
}

export interface Campaign {
  id: string;
  creatorId: string;
  creatorName: string;
  platform: Platform;
  type: TaskType;
  title: string;
  description: string;
  targetUrl?: string; // Added target URL
  rewardPerTask: number;
  totalBudget: number;
  remainingBudget: number;
  status: 'active' | 'completed' | 'paused';
  completedCount: number;
  createdAt: number;
}

export interface Task {
  id: string;
  campaignId: string;
  platform: Platform;
  type: TaskType;
  title: string;
  reward: number;
  status: 'available' | 'completed';
  targetUrl?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'earning' | 'withdrawal' | 'deposit' | 'fee' | 'adjustment' | 'purchase' | 'gig_sale';
  status: 'pending' | 'completed' | 'rejected' | 'pending_delivery';
  method: string;
  details: string;
  timestamp: number;
  relatedGigId?: string; // Links transaction to a specific gig
  relatedGigSecret?: string; // Stores the secret snapshot if needed
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
}

export interface VideoEditingData {
    filter: string;
    stickers: { id: string, emoji?: string, imageUrl?: string, x: number, y: number }[];
    textOverlays: { id: string, text: string, x: number, y: number, color: string }[];
    trim?: { start: number, end: number };
    voiceoverUrl?: string;
}

export interface Video {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  url: string;
  type: 'video' | 'image';
  caption: string;
  likes: number;
  views?: number;
  comments: number;
  commentsList?: { text: string, user: string, avatar: string }[];
  tags?: string[];
  editingData?: VideoEditingData;
  timestamp: number;
}

export interface Draft {
    id: string;
    userId: string;
    videoFile: string;
    type: 'video' | 'image';
    caption: string;
    tags: string;
    editingData: VideoEditingData;
    timestamp: number;
}

export interface Conversation {
    id: string;
    participants: string[]; // User IDs
    participantNames: Record<string, string>; // ID -> Name mapping for easy lookup
    lastMessage: string;
    lastMessageTime: number;
    relatedGigId?: string;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    timestamp: number;
    isFlagged?: boolean; // True if AI detects fraud/scam attempt
}

export interface Gig {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  category: 'graphics' | 'video' | 'writing' | 'marketing' | 'numbers' | 'social_accounts' | 'email_accounts';
  image: string;
  secretDelivery?: string; // The sensitive data (login/codes) revealed after purchase
  timestamp: number;
  rating?: number;
  ratingCount?: number;
}

export interface CommunityComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    timestamp: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  likes: number;
  comments: number;
  commentsList?: CommunityComment[];
  timestamp: number;
  likedBy: string[]; // User IDs
}

export interface MusicTrack {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  coverUrl: string;
  audioUrl: string;
  genre: string;
  plays: number;
  price: number; // Pay per play to artist
  createdAt: number;
}