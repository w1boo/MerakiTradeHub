import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertProductSchema, insertTransactionSchema, insertMessageSchema, 
  insertDepositSchema, insertWithdrawalSchema, InsertProduct
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
      // Filter out sold products
      const availableProducts = products.filter(product => product.status !== 'sold');
      res.json(availableProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/category/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      // Get products and filter out sold ones
      const products = await storage.getProductsByCategory(categoryId);
      const availableProducts = products.filter(product => product.status !== 'sold');
      console.log(`Returning ${availableProducts.length} products for category ${categoryId}`);
      res.json(availableProducts);
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

        // Handle completion - move money from escrow to seller and mark product as sold
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

            // Mark product as sold
            await storage.updateProduct(transaction.productId, {
              status: 'sold'
            });
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

        // Get the last message for this conversation
        let lastMessage = null;
        if (conversation.lastMessageId) {
          // Find and get the message by id
          const messages = await storage.getMessages(conversation.id);
          lastMessage = messages.find(msg => msg.id === conversation.lastMessageId) || null;
        }

        // Count unread messages
        const messages = await storage.getMessages(conversation.id);
        const unreadCount = messages.filter(
          msg => msg.receiverId === req.user!.id && !msg.isRead
        ).length;

        return {
          ...conversation,
          otherUser,
          lastMessage,
          unreadCount
        };
      }));

      res.json(enhancedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
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
  
  // API route to fetch products for trade messages
  app.get("/api/products/trade-messages", ensureAuthenticated, async (req, res) => {
    try {
      // Get all products - in a real app we'd filter by the ones referenced in messages
      const products = [];
      for (let i = 1; i <= 100; i++) {
        const product = await storage.getProduct(i);
        if (product) {
          products.push(product);
        }
      }
      
      // Convert to a map with product id as key
      const productMap = products.reduce((map, product) => {
        map[product.id] = product;
        return map;
      }, {});
      
      res.json(productMap);
    } catch (error) {
      console.error("Error fetching products for trade messages:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
  // API route to confirm a trade
  app.post("/api/trade/confirm", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { messageId, role } = req.body;
      
      if (!messageId || !role || (role !== 'buyer' && role !== 'seller')) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }
      
      // Get the message
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Verify it's a trade message
      if (!message.isTrade || !message.productId) {
        return res.status(400).json({ error: "Not a trade message" });
      }
      
      // Get the product
      const product = await storage.getProduct(message.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Verify user's role and permissions
      if (role === 'buyer') {
        // For simplicity, we consider the sender as buyer if not the seller
        if (userId !== message.senderId && userId !== message.receiverId) {
          return res.status(403).json({ error: "Not authorized as buyer" });
        }
      } else if (role === 'seller') {
        if (userId !== product.sellerId) {
          return res.status(403).json({ error: "Not authorized as seller" });
        }
      }
      
      // Update the message with confirmation
      const updates = role === 'buyer' 
        ? { tradeConfirmedBuyer: true } 
        : { tradeConfirmedSeller: true };
      
      const updatedMessage = await storage.updateMessage(messageId, updates);
      
      // Check if trade is fully confirmed
      const isFullyConfirmed = updatedMessage.tradeConfirmedBuyer && updatedMessage.tradeConfirmedSeller;
      
      // If fully confirmed, create a transaction
      if (isFullyConfirmed) {
        const buyerId = message.senderId === product.sellerId 
          ? message.receiverId 
          : message.senderId;
          
        const tradeTransaction = await storage.createTransaction({
          transactionId: `TRADE${Date.now()}`,
          productId: product.id,
          buyerId,
          sellerId: product.sellerId,
          amount: product.tradeValue || 0,
          platformFee: (product.tradeValue || 0) * 0.1, // 10% fee
          shipping: 0,
          status: 'completed',
          type: 'trade',
          tradeDetails: {
            messageId,
            tradeOffer: message.content
          },
          timeline: [
            {
              status: 'created',
              timestamp: new Date(),
              note: 'Trade offer accepted by both parties'
            },
            {
              status: 'completed',
              timestamp: new Date(),
              note: 'Trade completed successfully'
            }
          ]
        });
        
        // Update product status
        await storage.updateProduct(product.id, { status: 'sold' });
      }
      
      res.json({
        message: updatedMessage,
        isFullyConfirmed
      });
      
    } catch (error) {
      console.error("Error confirming trade:", error);
      res.status(500).json({ error: "Failed to confirm trade" });
    }
  });

  app.post("/api/messages", ensureAuthenticated, async (req, res) => {
    try {
      const senderId = req.user!.id;
      const { receiverId, content, images, isTrade, productId } = req.body;

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
        images,
        isTrade: isTrade || false,
        productId: productId || null,
        tradeConfirmedBuyer: false,
        tradeConfirmedSeller: false
      });

      // Create the message
      const message = await storage.createMessage(messageData);

      // Update conversation with last message ID only
      await storage.updateConversation(conversation.id, {
        lastMessageId: message.id,
        updatedAt: new Date()
      });

      // Return the full message data
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
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
        status: 'pending' // Changed to pending - requires admin approval
      });

      const deposit = await storage.createDeposit(depositData);

      // Don't automatically add to user balance - admin will need to approve
      
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

  // Admin route to update user balance
app.post("/api/admin/users/:id/balance", ensureAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount } = req.body;
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await storage.updateUser(userId, {
      balance: user.balance + amount
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update user balance" });
  }
});

// Admin route to get all deposits
app.get("/api/admin/deposits", ensureAdmin, async (req, res) => {
  try {
    // For simplicity, fetch deposits with IDs 1-100
    const deposits = [];
    for (let i = 1; i <= 100; i++) {
      const deposit = await storage.getDeposit(i);
      if (deposit) {
        // Fetch username for the deposit
        const user = await storage.getUser(deposit.userId);
        deposits.push({ 
          ...deposit, 
          username: user?.username || 'Unknown'
        });
      }
    }
    
    // Sort by newest first
    deposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deposits" });
  }
});

// Admin route to approve a deposit
app.post("/api/admin/deposits/:id/approve", ensureAdmin, async (req, res) => {
  try {
    const depositId = parseInt(req.params.id);
    const deposit = await storage.getDeposit(depositId);
    
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: "Deposit is not in pending status" });
    }
    
    // Update deposit status
    const updatedDeposit = await storage.updateDeposit(depositId, {
      status: 'completed'
    });
    
    // Add to user balance
    const user = await storage.getUser(deposit.userId);
    if (user) {
      await storage.updateUser(deposit.userId, {
        balance: user.balance + deposit.amount
      });
    }
    
    res.json(updatedDeposit);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve deposit" });
  }
});

// Admin route to reject a deposit
app.post("/api/admin/deposits/:id/reject", ensureAdmin, async (req, res) => {
  try {
    const depositId = parseInt(req.params.id);
    const deposit = await storage.getDeposit(depositId);
    
    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }
    
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: "Deposit is not in pending status" });
    }
    
    // Update deposit status
    const updatedDeposit = await storage.updateDeposit(depositId, {
      status: 'rejected'
    });
    
    res.json(updatedDeposit);
  } catch (error) {
    res.status(500).json({ error: "Failed to reject deposit" });
  }
});

// Admin route to delete product
app.delete("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await storage.getProduct(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await storage.updateProduct(productId, { status: 'deleted' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
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

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).send("Username already exists");
      }

      // Check for existing email
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).send("Email already registered");
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "Failed to register user" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}