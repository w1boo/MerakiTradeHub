import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertProductSchema, insertTransactionSchema, insertMessageSchema, 
  insertDepositSchema, insertWithdrawalSchema
} from "@shared/schema";
import { randomBytes } from "crypto";

function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}

function ensureAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).send("Forbidden");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const products = await storage.getRecentProducts(limit);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/category/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      // Create a test product for this category if no products exist
      // This is just for debugging our filtering issue
      const existingProducts = await storage.getProductsByCategory(categoryId);
      
      if (existingProducts.length === 0 && categoryId === 2) {
        // Create a test fashion product if none exist
        const testProduct: InsertProduct = {
          title: "Test Fashion Item",
          description: "A test fashion item for category filtering",
          price: 49.99,
          images: ["https://example.com/image.jpg"],
          categoryId: 2,
          sellerId: 1,
          location: "Test Location",
          allowTrade: true,
          allowBuy: true,
          tradeValue: 45,
          status: "active"
        };
        
        await storage.createProduct(testProduct);
        console.log("Created test product in category 2");
      }
      
      // Get products after potential test item creation
      const products = await storage.getProductsByCategory(categoryId);
      console.log(`Returning ${products.length} products for category ${categoryId}`);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products by category" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", ensureAuthenticated, async (req, res) => {
    try {
      const productData = insertProductSchema.parse({
        ...req.body,
        sellerId: req.user!.id
      });
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", ensureAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      if (product.sellerId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const updates = req.body;
      const updatedProduct = await storage.updateProduct(productId, updates);
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", ensureAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.user!.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      if (transaction.buyerId !== req.user!.id && 
          transaction.sellerId !== req.user!.id && 
          !req.user!.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", ensureAuthenticated, async (req, res) => {
    try {
      const buyerId = req.user!.id;
      const product = await storage.getProduct(req.body.productId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      if (product.sellerId === buyerId) {
        return res.status(400).json({ error: "Cannot buy/trade your own product" });
      }
      
      // Calculate platform fee (10-20%)
      const feePercentage = req.body.type === 'trade' ? 0.1 : 0.15;
      const platformFee = req.body.amount * feePercentage;
      
      // Generate transaction ID
      const transactionId = `TRX${Date.now().toString().slice(-5)}${randomBytes(2).toString('hex').toUpperCase()}`;
      
      // Create initial timeline
      const timeline = [{
        timestamp: new Date(),
        status: 'initiated',
        description: req.body.type === 'trade' ? 'Trade initiated' : 'Payment initiated'
      }];
      
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        transactionId,
        buyerId,
        sellerId: product.sellerId,
        platformFee,
        status: 'pending',
        timeline
      });
      
      // Create the transaction
      const transaction = await storage.createTransaction(transactionData);
      
      // Handle escrow for buyer
      const buyer = await storage.getUser(buyerId);
      if (buyer) {
        if (buyer.balance < req.body.amount) {
          return res.status(400).json({ error: "Insufficient balance" });
        }
        
        // Deduct from balance and add to escrow
        await storage.updateUser(buyerId, {
          balance: buyer.balance - req.body.amount,
          escrowBalance: buyer.escrowBalance + req.body.amount
        });
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.put("/api/transactions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      // Only buyer, seller or admin can update transaction
      if (transaction.buyerId !== req.user!.id && 
          transaction.sellerId !== req.user!.id && 
          !req.user!.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Handle status change logic
      if (req.body.status && req.body.status !== transaction.status) {
        const newStatus = req.body.status;
        
        // Create new timeline event
        const timelineEntry = {
          timestamp: new Date(),
          status: newStatus,
          description: `Transaction ${newStatus}`,
          updatedBy: req.user!.id
        };
        
        // Create new timeline or append to existing one
        const timeline = Array.isArray(transaction.timeline) 
          ? [...transaction.timeline, timelineEntry]
          : [timelineEntry];
        
        // Handle completion - move money from escrow to seller
        if (newStatus === 'completed') {
          const buyer = await storage.getUser(transaction.buyerId);
          const seller = await storage.getUser(transaction.sellerId);
          
          if (buyer && seller) {
            // Return 90% to buyer's regular balance if it's a trade
            if (transaction.type === 'trade') {
              const refundAmount = transaction.amount * 0.9;
              await storage.updateUser(buyer.id, {
                escrowBalance: buyer.escrowBalance - transaction.amount,
                balance: buyer.balance + refundAmount
              });
              
              // Give seller their share
              const sellerAmount = transaction.amount - transaction.platformFee;
              await storage.updateUser(seller.id, {
                balance: seller.balance + sellerAmount
              });
            } else {
              // Regular purchase - release from escrow to seller
              await storage.updateUser(buyer.id, {
                escrowBalance: buyer.escrowBalance - transaction.amount
              });
              
              // Give seller their share
              const sellerAmount = transaction.amount - transaction.platformFee;
              await storage.updateUser(seller.id, {
                balance: seller.balance + sellerAmount
              });
            }
          }
        }
        
        // Handle dispute/cancellation - return to buyer
        if (newStatus === 'cancelled' || newStatus === 'refunded') {
          const buyer = await storage.getUser(transaction.buyerId);
          
          if (buyer) {
            await storage.updateUser(buyer.id, {
              escrowBalance: buyer.escrowBalance - transaction.amount,
              balance: buyer.balance + transaction.amount
            });
          }
        }
        
        // Update transaction with new timeline
        req.body.timeline = timeline;
      }
      
      const updatedTransaction = await storage.updateTransaction(transactionId, req.body);
      res.json(updatedTransaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Messaging routes
  app.get("/api/conversations", ensureAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user!.id);
      
      // Fetch additional data for each conversation
      const enhancedConversations = await Promise.all(conversations.map(async (conversation) => {
        const otherUserId = conversation.user1Id === req.user!.id ? conversation.user2Id : conversation.user1Id;
        const otherUser = await storage.getUser(otherUserId);
        
        // We don't need to get the last message, as it's loaded through other means
        
        // Count unread messages
        const messages = await storage.getMessages(conversation.id);
        const unreadCount = messages.filter(
          msg => msg.receiverId === req.user!.id && !msg.isRead
        ).length;
        
        return {
          ...conversation,
          otherUser,
          unreadCount
        };
      }));
      
      res.json(enhancedConversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", ensureAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Check if user is part of the conversation
      if (conversation.user1Id !== req.user!.id && 
          conversation.user2Id !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Get messages for conversation
      const messages = await storage.getMessages(conversationId);
      
      // Get other user details
      const otherUserId = conversation.user1Id === req.user!.id ? conversation.user2Id : conversation.user1Id;
      const otherUser = await storage.getUser(otherUserId);
      
      // Mark messages as read
      for (const message of messages) {
        if (message.receiverId === req.user!.id && !message.isRead) {
          await storage.markMessageAsRead(message.id);
        }
      }
      
      res.json({
        conversation,
        messages,
        otherUser
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages", ensureAuthenticated, async (req, res) => {
    try {
      const senderId = req.user!.id;
      const { receiverId, content, images } = req.body;
      
      // Find or create conversation
      let conversation = await storage.getConversationByUsers(senderId, receiverId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          user1Id: senderId,
          user2Id: receiverId,
          lastMessageId: null
        });
      }
      
      // Create message
      const messageData = insertMessageSchema.parse({
        senderId,
        receiverId,
        content,
        images
      });
      
      const message = await storage.createMessage(messageData);
      
      // Update conversation with last message
      await storage.updateConversation(conversation.id, {
        lastMessageId: message.id,
        updatedAt: new Date()
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Financial routes
  app.post("/api/deposits", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const depositData = insertDepositSchema.parse({
        ...req.body,
        userId,
        status: 'completed' // Auto-approve for demo purposes
      });
      
      const deposit = await storage.createDeposit(depositData);
      
      // Add to user balance
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          balance: user.balance + deposit.amount
        });
      }
      
      res.status(201).json(deposit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process deposit" });
    }
  });

  app.post("/api/withdrawals", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { amount, method } = req.body;
      
      // Check if user has enough balance
      const user = await storage.getUser(userId);
      if (!user || user.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const withdrawalData = insertWithdrawalSchema.parse({
        userId,
        amount,
        method,
        status: 'pending'
      });
      
      const withdrawal = await storage.createWithdrawal(withdrawalData);
      
      // Deduct from user balance
      await storage.updateUser(userId, {
        balance: user.balance - amount
      });
      
      res.status(201).json(withdrawal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process withdrawal" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", ensureAdmin, async (req, res) => {
    try {
      // Get all users from storage
      const users = await Promise.all(
        Array.from({ length: 100 }, (_, i) => i + 1)
          .map(id => storage.getUser(id))
      );
      
      res.json(users.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/transactions", ensureAdmin, async (req, res) => {
    try {
      // For simplicity, just fetch the last 50 transactions by ID
      const transactions = [];
      
      for (let i = 1; i <= 100; i++) {
        const transaction = await storage.getTransaction(i);
        if (transaction) {
          transactions.push(transaction);
        }
      }
      
      transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
