export interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  location?: string;
  balance: number;
  escrowBalance: number;
  isAdmin: boolean;
  createdAt: Date;
}

export interface ProductCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price?: number;
  images: string[];
  categoryId?: number;
  sellerId: number;
  location?: string;
  allowTrade: boolean;
  allowBuy: boolean;
  tradeValue?: number;
  status: string;
  createdAt: Date;
  seller?: User;
  category?: ProductCategory;
}

export interface TimelineEvent {
  timestamp: Date;
  status: string;
  description: string;
  updatedBy?: number;
}

export interface Transaction {
  id: number;
  transactionId: string;
  productId: number;
  buyerId: number;
  sellerId: number;
  amount: number;
  platformFee: number;
  shipping?: number;
  status: string;
  type: 'purchase' | 'trade';
  tradeDetails?: any;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  buyer?: User;
  seller?: User;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  images?: string[];
  isRead: boolean;
  createdAt: Date;
  sender?: User;
}

export interface Conversation {
  id: number;
  user1Id: number;
  user2Id: number;
  lastMessageId?: number;
  updatedAt: Date;
  otherUser?: User;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Deposit {
  id: number;
  userId: number;
  amount: number;
  method: string;
  status: string;
  createdAt: Date;
}

export interface Withdrawal {
  id: number;
  userId: number;
  amount: number;
  method: string;
  status: string;
  createdAt: Date;
}
