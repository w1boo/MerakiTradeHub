// Types for the client side app
export interface User {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatar: string | null;
  location: string | null;
  balance: number;
  escrowBalance: number;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number | null;
  images: string[];
  categoryId: number | null;
  sellerId: number;
  location: string | null;
  allowTrade: boolean;
  allowBuy: boolean;
  tradeValue: number | null;
  status: string;
  createdAt: Date;
}

export interface ProductCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: number;
  transactionId: string;
  productId: number;
  buyerId: number;
  sellerId: number;
  amount: number;
  platformFee: number;
  shipping: number | null;
  status: string;
  type: string;
  tradeDetails: any;
  timeline: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  images: string[] | null;
  isRead: boolean;
  isTrade: boolean;
  productId: number | null;
  tradeConfirmedBuyer: boolean;
  tradeConfirmedSeller: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: number;
  user1Id: number;
  user2Id: number;
  lastMessageId: number | null;
  updatedAt: Date;
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