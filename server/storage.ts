import { users, products, transactions, messages, conversations, deposits, withdrawals, productCategories } from "@shared/schema";
import type { 
  User, InsertUser, Product, InsertProduct, Transaction, InsertTransaction, 
  Message, InsertMessage, Conversation, InsertConversation,
  Deposit, InsertDeposit, Withdrawal, InsertWithdrawal,
  ProductCategory, InsertProductCategory
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { hashPassword } from "./auth";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>; // Added
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Product methods
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProductsBySeller(sellerId: number): Promise<Product[]>;
  getProductsByUser(userId: number): Promise<Product[]>; //Added
  getRecentProducts(limit: number): Promise<Product[]>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined>;

  // Category methods
  createCategory(category: InsertProductCategory): Promise<ProductCategory>;
  getCategories(): Promise<ProductCategory[]>;
  getCategory(id: number): Promise<ProductCategory | undefined>;

  // Trade Offer methods
  createTradeOffer(tradeOffer: InsertTradeOffer): Promise<TradeOffer>;
  getTradeOffer(id: number): Promise<TradeOffer | undefined>;
  getUserTradeOffers(userId: number): Promise<TradeOffer[]>;
  getPendingTradeOffers(userId: number): Promise<TradeOffer[]>;
  updateTradeOffer(id: number, updates: Partial<TradeOffer>): Promise<TradeOffer | undefined>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  getMessage(id: number): Promise<Message | undefined>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined>;

  // Conversation methods
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  getConversationByUsers(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;

  // Financial methods
  createDeposit(deposit: InsertDeposit): Promise<Deposit>;
  getDeposit(id: number): Promise<Deposit | undefined>;
  getUserDeposits(userId: number): Promise<Deposit[]>;
  updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit | undefined>;

  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getUserWithdrawals(userId: number): Promise<Withdrawal[]>;
  updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined>;

  // Session store
  sessionStore: any; // Use 'any' to avoid SessionStore type errors
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private categories: Map<number, ProductCategory>;
  private transactions: Map<number, Transaction>;
  private tradeOffers: Map<number, TradeOffer>;
  private messages: Map<number, Message>;
  private conversations: Map<number, Conversation>;
  private deposits: Map<number, Deposit>;
  private withdrawals: Map<number, Withdrawal>;

  currentUserId: number;
  currentProductId: number;
  currentCategoryId: number;
  currentTransactionId: number;
  currentTradeOfferId: number;
  currentMessageId: number;
  currentConversationId: number;
  currentDepositId: number;
  currentWithdrawalId: number;

  sessionStore: any; // Changed from session.SessionStore to any

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.tradeOffers = new Map();
    this.messages = new Map();
    this.conversations = new Map();
    this.deposits = new Map();
    this.withdrawals = new Map();

    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentCategoryId = 1;
    this.currentTransactionId = 1;
    this.currentTradeOfferId = 1;
    this.currentMessageId = 1;
    this.currentConversationId = 1;
    this.currentDepositId = 1;
    this.currentWithdrawalId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize the store with some categories
    this.seedCategories();
    
    // Create admin user - this is async but we can't make constructor async
    // So we handle it by calling it and logging any errors
    this.seedAdminUser().catch(err => {
      console.error('Failed to seed admin user:', err);
    });
  }
  
  // Create an admin user for testing
  private async seedAdminUser() {
    try {
      // Generate a fresh password hash for 'admin123'
      const adminPasswordHash = await hashPassword('admin123');
      
      const adminUser: User = {
        id: this.currentUserId++,
        username: 'admin',
        password: adminPasswordHash,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        avatar: null,
        location: null,
        balance: 1000, // Give admin some balance to work with
        escrowBalance: 0,
        isAdmin: true,
        createdAt: new Date()
      };
      
      this.users.set(adminUser.id, adminUser);
      console.log('Admin user created with ID:', adminUser.id);
      console.log('Admin password hash:', adminPasswordHash);
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  // Initialize basic categories
  private seedCategories() {
    const categories = [
      { name: "Electronics", icon: "ri-computer-line", color: "secondary" },
      { name: "Fashion", icon: "ri-t-shirt-line", color: "accent" },
      { name: "Books & Media", icon: "ri-book-open-line", color: "primary" }
    ];

    categories.forEach(category => {
      const id = this.currentCategoryId++;
      this.categories.set(id, { 
        id, 
        name: category.name, 
        icon: category.icon, 
        color: category.color 
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string | null | undefined): Promise<User | undefined> { // Added
    if (!email) return undefined; // Early return if email is null or undefined
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Check for duplicate email only if provided
    if (insertUser.email) {
      const existingUser = await this.getUserByEmail(insertUser.email);
      if (existingUser) {
        throw new Error("Email already exists");
      }
    }
    
    const id = this.currentUserId++;
    const timestamp = new Date();
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      email: insertUser.email || null,
      avatar: insertUser.avatar || null,
      location: insertUser.location || null,
      balance: 0, 
      escrowBalance: 0,
      isAdmin: insertUser.isAdmin || false,
      createdAt: timestamp
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Product methods
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const timestamp = new Date();
    const newProduct: Product = { 
      id,
      title: product.title,
      description: product.description,
      price: product.price || null,
      images: product.images,
      categoryId: product.categoryId || null,
      sellerId: product.sellerId,
      location: product.location || null,
      allowTrade: product.allowTrade || false,
      allowBuy: product.allowBuy || false,
      tradeValue: product.tradeValue || null,
      status: product.status || 'active',
      createdAt: timestamp
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    console.log('Filtering products by categoryId:', categoryId);
    const allProducts = Array.from(this.products.values());
    console.log('All products:', JSON.stringify(allProducts));

    return allProducts.filter(product => {
      console.log(`Product ${product.id} categoryId:`, product.categoryId, 'Comparing with:', categoryId, 'Result:', product.categoryId === categoryId);
      return product.categoryId === categoryId;
    });
  }

  async getProductsBySeller(sellerId: number): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.sellerId === sellerId);
  }

  async getProductsByUser(userId: number): Promise<Product[]> { // Added
    return Array.from(this.products.values()).filter(p => p.sellerId === userId);
  }

  async getRecentProducts(limit: number): Promise<Product[]> {
    return Array.from(this.products.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;

    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  // Category methods
  async createCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const id = this.currentCategoryId++;
    const newCategory: ProductCategory = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async getCategories(): Promise<ProductCategory[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<ProductCategory | undefined> {
    return this.categories.get(id);
  }
  
  // Trade Offer methods
  async createTradeOffer(tradeOffer: InsertTradeOffer): Promise<TradeOffer> {
    const id = this.currentTradeOfferId++;
    const timestamp = new Date();
    const newTradeOffer: TradeOffer = {
      id,
      buyerId: tradeOffer.buyerId,
      sellerId: tradeOffer.sellerId,
      productId: tradeOffer.productId,
      offerValue: tradeOffer.offerValue,
      status: tradeOffer.status || 'pending',
      buyerConfirmed: tradeOffer.buyerConfirmed || false,
      sellerConfirmed: tradeOffer.sellerConfirmed || false,
      relatedMessageId: tradeOffer.relatedMessageId || null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.tradeOffers.set(id, newTradeOffer);
    return newTradeOffer;
  }
  
  async getTradeOffer(id: number): Promise<TradeOffer | undefined> {
    return this.tradeOffers.get(id);
  }
  
  async getUserTradeOffers(userId: number): Promise<TradeOffer[]> {
    return Array.from(this.tradeOffers.values())
      .filter(tradeOffer => 
        tradeOffer.buyerId === userId || tradeOffer.sellerId === userId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getPendingTradeOffers(userId: number): Promise<TradeOffer[]> {
    return Array.from(this.tradeOffers.values())
      .filter(tradeOffer => 
        (tradeOffer.buyerId === userId || tradeOffer.sellerId === userId) &&
        tradeOffer.status === 'pending'
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async updateTradeOffer(id: number, updates: Partial<TradeOffer>): Promise<TradeOffer | undefined> {
    const tradeOffer = await this.getTradeOffer(id);
    if (!tradeOffer) return undefined;
    
    const updatedTradeOffer = {
      ...tradeOffer,
      ...updates,
      updatedAt: new Date()
    };
    this.tradeOffers.set(id, updatedTradeOffer);
    return updatedTradeOffer;
  }

  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const timestamp = new Date();
    const newTransaction: Transaction = { 
      id,
      transactionId: transaction.transactionId,
      productId: transaction.productId,
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      amount: transaction.amount,
      platformFee: transaction.platformFee,
      shipping: transaction.shipping || null,
      status: transaction.status,
      type: transaction.type,
      tradeDetails: transaction.tradeDetails || null,
      timeline: transaction.timeline || [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values())
      .find(transaction => transaction.transactionId === transactionId);
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => 
        transaction.buyerId === userId || transaction.sellerId === userId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = await this.getTransaction(id);
    if (!transaction) return undefined;

    const updatedTransaction = { 
      ...transaction, 
      ...updates,
      updatedAt: new Date()
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  // Message methods
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const timestamp = new Date();
    const newMessage: Message = { 
      id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      images: message.images || null,
      isRead: false,
      isTrade: message.isTrade || false,
      productId: message.productId || null,
      tradeOfferId: message.tradeOfferId || null,
      tradeDetails: message.tradeDetails || null,
      tradeConfirmedBuyer: message.tradeConfirmedBuyer || false,
      tradeConfirmedSeller: message.tradeConfirmedSeller || false,
      createdAt: timestamp
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return [];

    // Get all messages between these two users
    const user1Id = conversation.user1Id;
    const user2Id = conversation.user2Id;
    
    return Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === user1Id && message.receiverId === user2Id) ||
        (message.senderId === user2Id && message.receiverId === user1Id)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;

    const updatedMessage = { ...message, isRead: true };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...updates };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  // Conversation methods
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const timestamp = new Date();
    const newConversation: Conversation = { 
      id,
      user1Id: conversation.user1Id,
      user2Id: conversation.user2Id,
      lastMessageId: conversation.lastMessageId || null,
      updatedAt: timestamp
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conversation => 
        conversation.user1Id === userId || conversation.user2Id === userId
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getConversationByUsers(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
    console.log(`Looking for conversation between users ${user1Id} and ${user2Id}`);
    
    // Make sure we're working with numbers
    const u1 = Number(user1Id);
    const u2 = Number(user2Id);
    
    if (isNaN(u1) || isNaN(u2)) {
      console.error(`Invalid user IDs: ${user1Id}, ${user2Id}`);
      return undefined;
    }
    
    const allConversations = Array.from(this.conversations.values());
    console.log(`Total conversations: ${allConversations.length}`);
    
    // Find conversation regardless of which user is user1 or user2
    const conversation = allConversations.find(c => 
      (c.user1Id === u1 && c.user2Id === u2) ||
      (c.user1Id === u2 && c.user2Id === u1)
    );
    
    if (conversation) {
      console.log(`Found conversation: ${JSON.stringify(conversation)}`);
    } else {
      console.log(`No conversation found between users ${u1} and ${u2}`);
    }
    
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = await this.getConversation(id);
    if (!conversation) return undefined;

    const updatedConversation = { 
      ...conversation, 
      ...updates,
      updatedAt: new Date()
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  // Financial methods
  async createDeposit(deposit: InsertDeposit): Promise<Deposit> {
    const id = this.currentDepositId++;
    const timestamp = new Date();
    const newDeposit: Deposit = { 
      ...deposit, 
      id, 
      createdAt: timestamp
    };
    this.deposits.set(id, newDeposit);
    return newDeposit;
  }
  
  async getDeposit(id: number): Promise<Deposit | undefined> {
    return this.deposits.get(id);
  }

  async getUserDeposits(userId: number): Promise<Deposit[]> {
    return Array.from(this.deposits.values())
      .filter(deposit => deposit.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit | undefined> {
    const deposit = this.deposits.get(id);
    if (!deposit) return undefined;

    const updatedDeposit = { ...deposit, ...updates };
    this.deposits.set(id, updatedDeposit);
    return updatedDeposit;
  }

  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const id = this.currentWithdrawalId++;
    const timestamp = new Date();
    const newWithdrawal: Withdrawal = { 
      ...withdrawal, 
      id, 
      createdAt: timestamp
    };
    this.withdrawals.set(id, newWithdrawal);
    return newWithdrawal;
  }

  async getUserWithdrawals(userId: number): Promise<Withdrawal[]> {
    return Array.from(this.withdrawals.values())
      .filter(withdrawal => withdrawal.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const withdrawal = this.withdrawals.get(id);
    if (!withdrawal) return undefined;

    const updatedWithdrawal = { ...withdrawal, ...updates };
    this.withdrawals.set(id, updatedWithdrawal);
    return updatedWithdrawal;
  }
}

export const storage = new MemStorage();