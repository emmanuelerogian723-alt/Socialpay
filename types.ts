
export type Role = 'creator' | 'engager' | 'admin';

export type Platform = 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'linkedin';

export type TaskType = 'like' | 'comment' | 'follow' | 'share' | 'view';

export type VerificationStatus = 'unpaid' | 'pending' | 'verified' | 'rejected';

export interface Certificate {
  id: string;
  title: string;
  description: string;
  issuedAt: number;
  theme: 'gold' | 'silver' | 'bronze' | 'platinum';
}

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
  isHuman?: boolean; // New field for seller verification
  certificates?: Certificate[]; // New field for certificate engine
}

export interface Campaign {
  id: string;
  creatorId: string;
  creatorName: string;
  platform: Platform;
  type: TaskType;
  title: string;
  description: string;
  targetUrl?: string;
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
  type: 'earning' | 'withdrawal' | 'deposit' | 'fee' | 'adjustment' | 'purchase' | 'gig_sale' | 'digital_sale';
  status: 'pending' | 'completed' | 'rejected' | 'pending_delivery';
  method: string;
  details: string;
  timestamp: number;
  relatedGigId?: string;
  relatedGigSecret?: string;
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
    participants: string[];
    participantNames: Record<string, string>;
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
    isFlagged?: boolean;
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
  secretDelivery?: string;
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
  likedBy: string[];
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
  price: number;
  createdAt: number;
}

export type DigitalCategory = 
  | 'architecture' 
  | 'graphics' 
  | 'templates' 
  | 'memes' 
  | 'mechanical' 
  | 'other';

export type MechanicalSubCategory = 'car' | 'engine' | 'robot' | 'motor_parts' | 'general';

export interface Storefront {
  id: string;
  ownerId: string;
  storeName: string;
  description: string;
  bannerUrl: string;
  logoUrl: string;
  accentColor: string;
  createdAt: number;
  totalSales: number;
  rating: number;
}

export interface DigitalProduct {
  id: string;
  storeId: string;
  ownerId: string;
  title: string;
  description: string;
  price: number;
  category: DigitalCategory;
  subCategory?: MechanicalSubCategory;
  thumbnailUrl: string;
  fileUrl: string;
  fileType: string;
  previewImages?: string[];
  createdAt: number;
  sales: number;
}
