import { InsertUser, User, InsertProduct, Product, InsertMessage, Message, Conversation, Transaction, InsertTransaction } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Product operations
  createProduct(product: InsertProduct & { userId: number }): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByUser(userId: number): Promise<Product[]>;
  updateProductStatus(id: number, status: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  
  // Message operations
  createMessage(message: InsertMessage & { senderId: number, receiverId: number }): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  getConversation(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  createConversation(user1Id: number, user2Id: number): Promise<Conversation>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction & { buyerId: number, sellerId: number, fee: number, escrowAmount: number }): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined>;
  releaseEscrow(id: number): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<Transaction[]>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private messages: Map<number, Message>;
  private conversations: Map<number, Conversation>;
  private transactions: Map<number, Transaction>;
  
  currentUserId: number;
  currentProductId: number;
  currentMessageId: number;
  currentConversationId: number;
  currentTransactionId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.messages = new Map();
    this.conversations = new Map();
    this.transactions = new Map();
    
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentMessageId = 1;
    this.currentConversationId = 1;
    this.currentTransactionId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const timestamp = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      balance: 0,
      isAdmin: false,
      profileImage: null,
      createdAt: timestamp
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = {
      ...user,
      balance: user.balance + amount
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Product operations
  async createProduct(product: InsertProduct & { userId: number }): Promise<Product> {
    const id = this.currentProductId++;
    const timestamp = new Date();
    const newProduct: Product = {
      ...product,
      id,
      createdAt: timestamp,
      status: "available"
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByUser(userId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.userId === userId
    );
  }

  async updateProductStatus(id: number, status: string): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) {
      return undefined;
    }
    const updatedProduct = {
      ...product,
      status
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  // Message operations
  async createMessage(message: InsertMessage & { senderId: number, receiverId: number }): Promise<Message> {
    const id = this.currentMessageId++;
    const timestamp = new Date();
    const newMessage: Message = {
      ...message,
      id,
      read: false,
      createdAt: timestamp
    };
    this.messages.set(id, newMessage);
    
    // Update or create conversation
    let conversation = await this.getConversation(message.senderId, message.receiverId);
    if (!conversation) {
      conversation = await this.createConversation(message.senderId, message.receiverId);
    } else {
      conversation.lastMessageAt = timestamp;
      this.conversations.set(conversation.id, conversation);
    }
    
    return newMessage;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const conversation = await this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }
    
    return Array.from(this.messages.values()).filter(
      (message) => 
        (message.senderId === conversation.user1Id && message.receiverId === conversation.user2Id) ||
        (message.senderId === conversation.user2Id && message.receiverId === conversation.user1Id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getConversation(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conversation) => 
        (conversation.user1Id === user1Id && conversation.user2Id === user2Id) ||
        (conversation.user1Id === user2Id && conversation.user2Id === user1Id)
    );
  }

  async createConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    const id = this.currentConversationId++;
    const timestamp = new Date();
    const conversation: Conversation = {
      id,
      user1Id,
      user2Id,
      lastMessageAt: timestamp
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conversation) => conversation.user1Id === userId || conversation.user2Id === userId
    ).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction & { 
    buyerId: number, sellerId: number, fee: number, escrowAmount: number 
  }): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const timestamp = new Date();
    const newTransaction: Transaction = {
      ...transaction,
      id,
      status: "pending",
      escrowReleased: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.buyerId === userId || transaction.sellerId === userId
    );
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    const transaction = await this.getTransaction(id);
    if (!transaction) {
      return undefined;
    }
    const timestamp = new Date();
    const updatedTransaction = {
      ...transaction,
      status,
      updatedAt: timestamp
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async releaseEscrow(id: number): Promise<Transaction | undefined> {
    const transaction = await this.getTransaction(id);
    if (!transaction) {
      return undefined;
    }
    const timestamp = new Date();
    const updatedTransaction = {
      ...transaction,
      escrowReleased: true,
      updatedAt: timestamp
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }
}

export const storage = new MemStorage();
