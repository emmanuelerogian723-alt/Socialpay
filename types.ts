
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
  xp: number; // For gamification
  badges: string[];
  verificationStatus: VerificationStatus; // Replaces hasPaidEntryFee
  joinedAt: number;
  bio?: string;
}

export interface Campaign {
  id: string;
  creatorId: string;
  creatorName: string;
  platform: Platform;
  type: TaskType;
  title: string;
  description: string;
  rewardPerTask: number;
  totalBudget: number;
  remainingBudget: number;
  status: 'active' | 'paused' | 'completed';
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
  status: 'available' | 'pending' | 'verified' | 'rejected';
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'withdrawal' | 'deposit' | 'earning' | 'fee' | 'adjustment' | 'purchase';
  status: 'pending' | 'completed' | 'rejected';
  method: string; // e.g., 'PayPal', 'Bank Transfer', 'Admin'
  details: string; // e.g., 'Bank: Chase, Account: ****1234, Country: USA'
  timestamp: number;
}

export interface Notification {
  id: string;
  userId: string; // 'all' or specific userId
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
}

export interface Comment {
  text: string;
  user: string;
  avatar: string;
}

export interface VideoEditingData {
  filter: string; // CSS filter class or style
  stickers: Array<{ id: string; emoji: string; x: number; y: number }>;
  textOverlays: Array<{ id: string; text: string; x: number; y: number; color: string }>;
}

export interface Video {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  url: string; // URL to video resource
  caption: string;
  likes: number;
  comments: number;
  commentsList?: Comment[];
  tags?: string[];
  editingData?: VideoEditingData;
  timestamp: number;
}

export interface Gig {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  category: 'graphics' | 'video' | 'writing' | 'marketing';
  image: string; // Thumbnail
  timestamp: number;
  rating?: number;
  ratingCount?: number;
}
