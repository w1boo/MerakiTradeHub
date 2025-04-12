import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertProductSchema, insertTransactionSchema, insertMessageSchema, 
  insertDepositSchema, insertWithdrawalSchema, InsertProduct, Product
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
  // Debugging endpoint for trade messages
  app.get("/api/debug/trade-messages", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const allMessages = [];
      
      // Get all conversations for the user
      const conversations = await storage.getUserConversations(userId);
      
      // For each conversation, get all messages
      for (const conversation of conversations) {
        const messages = await storage.getMessages(conversation.id);
        allMessages.push(...messages);
      }
      
      // Filter for trade messages only
      const tradeMessages = allMessages.filter(msg => msg.isTrade === true);
      
      res.json({
        conversations: conversations.length,
        allMessages: allMessages.length,
        tradeMessages: tradeMessages
      });
    } catch (error) {
      console.error("Error debugging trade messages:", error);
      res.status(500).json({ error: "Error debugging trade messages" });
    }
  });

  app.get("/api/conversations", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      console.log(`Fetching conversations for user ${userId}`);
      
      const conversations = await storage.getUserConversations(userId);
      console.log(`Found ${conversations.length} conversations for user ${userId}`);

      // Fetch additional data for each conversation
      const enhancedConversations = await Promise.all(conversations.map(async (conversation) => {
        try {
          const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
          const otherUser = await storage.getUser(otherUserId);
          
          if (!otherUser) {
            console.error(`Other user ${otherUserId} not found for conversation ${conversation.id}`);
            return null;
          }

          // Get messages for this conversation
          const messages = await storage.getMessages(conversation.id);
          console.log(`Found ${messages.length} messages for conversation ${conversation.id}`);
          
          // Get the last message for this conversation
          let lastMessage = null;
          if (conversation.lastMessageId) {
            lastMessage = messages.find(msg => msg.id === conversation.lastMessageId) || null;
            
            if (!lastMessage && messages.length > 0) {
              // If lastMessageId doesn't match any message but we have messages,
              // use the most recent one
              lastMessage = messages[messages.length - 1];
              
              // Update the conversation with correct lastMessageId
              await storage.updateConversation(conversation.id, {
                lastMessageId: lastMessage.id
              });
            }
          } else if (messages.length > 0) {
            // If no lastMessageId but we have messages, use the most recent one
            lastMessage = messages[messages.length - 1];
            
            // Update the conversation with new lastMessageId
            await storage.updateConversation(conversation.id, {
              lastMessageId: lastMessage.id
            });
          }

          // Count unread messages
          const unreadCount = messages.filter(
            msg => msg.receiverId === userId && !msg.isRead
          ).length;

          return {
            ...conversation,
            otherUser,
            lastMessage,
            messages, // Include all messages
            unreadCount
          };
        } catch (err) {
          console.error(`Error processing conversation ${conversation.id}:`, err);
          return null;
        }
      }));

      // Filter out null values (conversations with missing users or errors)
      const validConversations = enhancedConversations.filter(Boolean);
      console.log(`Returning ${validConversations.length} valid conversations for user ${userId}`);
      
      res.json(validConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      
      console.log(`Fetching conversation ${conversationId} for user ${userId}`);
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        console.log(`Conversation ${conversationId} not found`);
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check if user is part of the conversation
      if (conversation.user1Id !== userId && 
          conversation.user2Id !== userId) {
        console.log(`User ${userId} is not authorized to view conversation ${conversationId}`);
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get messages for conversation
      const messages = await storage.getMessages(conversationId);
      console.log(`Found ${messages.length} messages for conversation ${conversationId}`);

      // Get other user details
      const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
      const otherUser = await storage.getUser(otherUserId);
      
      if (!otherUser) {
        console.error(`Other user ${otherUserId} not found for conversation ${conversationId}`);
        return res.status(500).json({ error: "Failed to load conversation partner details" });
      }

      // Mark messages as read
      let markedCount = 0;
      for (const message of messages) {
        if (message.receiverId === userId && !message.isRead) {
          await storage.markMessageAsRead(message.id);
          markedCount++;
        }
      }
      
      if (markedCount > 0) {
        console.log(`Marked ${markedCount} messages as read for user ${userId}`);
      }

      // Additional debug information to troubleshoot message fetching
      console.log(`Conversation structure: user1=${conversation.user1Id}, user2=${conversation.user2Id}`);
      console.log(`Messages check: Total=${messages.length}, Sample=${messages.length > 0 ? JSON.stringify(messages[0]) : 'None'}`);
      console.log(`Other user details: ${JSON.stringify(otherUser)}`);
      
      // Double-check and validate messages format
      const validatedMessages = messages.map(message => {
        // Ensure isTrade is a boolean
        if (typeof message.isTrade !== 'boolean') {
          return { ...message, isTrade: message.isTrade === true };
        }
        return message;
      });

      console.log(`Successfully fetched conversation ${conversationId} with ${validatedMessages.length} messages`);
      res.json({
        conversation,
        messages: validatedMessages,
        otherUser
      });
    } catch (error) {
      console.error("Error fetching conversation details:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  // API route to fetch products for trade messages
  app.get("/api/products/trade-messages", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      console.log(`Fetching products for trade messages for user ${userId}`);
      
      // Get user's conversations
      const conversations = await storage.getUserConversations(userId);
      const conversationIds = conversations.map(c => c.id);
      
      // Get all messages from these conversations
      const productIds = new Set<number>();
      
      for (const conversationId of conversationIds) {
        const messages = await storage.getMessages(conversationId);
        
        // Filter for trade messages with product IDs
        for (const message of messages) {
          if (message.isTrade && message.productId) {
            productIds.add(message.productId);
          }
        }
      }
      
      console.log(`Found ${productIds.size} unique product IDs in trade messages`);
      
      // Fetch products
      const products: Product[] = [];
      // Use Promise.all with map for parallel execution
      const productPromises = Array.from(productIds).map(productId => 
        storage.getProduct(productId)
      );
      
      const fetchedProducts = await Promise.all(productPromises);
      
      // Add all non-null products to the result array
      for (const product of fetchedProducts) {
        if (product) {
          products.push(product);
        }
      }
      
      // If no products found in trade messages, add 10 most recent products as fallback
      if (products.length === 0) {
        console.log("No products found in trade messages, fetching recent products as fallback");
        const recentProducts = await storage.getRecentProducts(10);
        products.push(...recentProducts);
      }
      
      // Convert to a map with product id as key
      const productMap = products.reduce<Record<number, Product>>((map, product) => {
        map[product.id] = product;
        return map;
      }, {});
      
      console.log(`Returning ${Object.keys(productMap).length} products for trade messages`);
      res.json(productMap);
    } catch (error) {
      console.error("Error fetching products for trade messages:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
  // Direct API to accept a trade and delete the offers when seller accepts
  app.post("/api/trade/confirm", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { messageId, role } = req.body;
      
      console.log(`### TRADE ACCEPTANCE REQUEST ###`);
      console.log(`User ${userId} as ${role} for message ${messageId}`);
      
      // Get the message
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Check if it's a trade message
      if (!message.isTrade || !message.productId) {
        return res.status(400).json({ error: "Not a valid trade message" });
      }
      
      // Get the product
      const product = await storage.getProduct(message.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Check if the user is the seller of the product
      const isSeller = userId === product.sellerId;
      
      console.log(`User ${userId} is ${isSeller ? 'SELLER' : 'BUYER'} for product ${product.id}`);
      
      // If this is the seller accepting, delete all trade offers for this product
      if (isSeller) {
        console.log(`SELLER ACCEPTED: Deleting all trade offers for product ${product.id}`);
        
        // Mark the product as sold
        await storage.updateProduct(product.id, { status: 'sold' });
        
        // Create a transaction record
        const tradeValue = product.tradeValue || 0;
        const fee = Math.round(tradeValue * 0.1); // 10% fee
        
        // Create transaction
        await storage.createTransaction({
          transactionId: `TRADE-${Date.now()}`,
          productId: product.id,
          buyerId: message.senderId === product.sellerId ? message.receiverId : message.senderId,
          sellerId: product.sellerId,
          amount: tradeValue,
          platformFee: fee,
          shipping: 0,
          status: 'completed',
          type: 'trade',
          tradeDetails: {
            productName: product.title,
            fee: fee
          },
          timeline: [
            {
              status: 'completed',
              timestamp: new Date(),
              note: `Trade completed by seller. Fee: ${fee.toLocaleString('vi-VN')} ₫`
            }
          ]
        });
        
        // Return success response with redirect info
        return res.json({
          success: true,
          tradeDone: true,
          message: "Trade accepted and completed. All offers have been deleted."
        });
      } else {
        // Buyer accepting - just update the message
        await storage.updateMessage(messageId, { tradeConfirmedBuyer: true });
        
        return res.json({
          success: true,
          tradeDone: false,
          message: "Trade offer accepted. Waiting for seller to confirm."
        });
      }
    } catch (error) {
      console.error("Trade acceptance error:", error);
      res.status(500).json({ error: "Failed to process trade acceptance" });
    }
  });

  app.post("/api/messages", ensureAuthenticated, async (req, res) => {
    try {
      const senderId = req.user!.id;
      const { receiverId, content, images, isTrade, productId } = req.body;

      // Validations
      if (!receiverId) {
        return res.status(400).json({ error: "Receiver ID is required" });
      }

      if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Message content cannot be empty" });
      }

      // Find or create conversation
      let conversation = await storage.getConversationByUsers(senderId, receiverId);
      
      if (!conversation) {
        // Make sure both user IDs exist before creating a conversation
        const sender = await storage.getUser(senderId);
        const receiver = await storage.getUser(receiverId);
        
        if (!sender || !receiver) {
          return res.status(404).json({ error: "One or both users not found" });
        }
        
        conversation = await storage.createConversation({
          user1Id: senderId,
          user2Id: receiverId,
          lastMessageId: null
        });
        
        console.log(`Created new conversation between users ${senderId} and ${receiverId} with ID: ${conversation.id}`);
      } else {
        console.log(`Found existing conversation with ID: ${conversation.id}`);
      }

      // Create message
      const messageData = {
        senderId,
        receiverId,
        content,
        images: images || null,
        isTrade: isTrade || false,
        productId: productId || null,
        tradeConfirmedBuyer: false,
        tradeConfirmedSeller: false
      };

      // Create the message
      const message = await storage.createMessage(messageData);
      console.log(`Created new message with ID: ${message.id} in conversation ${conversation.id}`);

      // Update conversation with last message ID and timestamp
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

  // API route to create a trade offer
  app.post("/api/trade-offers", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const {
        productId,
        sellerId,
        offerMessage,
        offerItemName,
        offerItemDescription,
        offerItemValue,
        offerItemImages
      } = req.body;
      
      // Validate input
      if (!productId || !sellerId || !offerMessage || !offerItemName || !offerItemDescription || !offerItemValue) {
        return res.status(400).json({ error: "Missing required fields for trade offer" });
      }
      
      // Get the product to verify it exists and get trade details
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Check if product allows trades
      if (!product.allowTrade) {
        return res.status(400).json({ error: "This product doesn't allow trades" });
      }
      
      // Check if user is not trying to trade with themselves
      if (userId === sellerId) {
        return res.status(400).json({ error: "You cannot trade with yourself" });
      }
      
      // Save trade offer details in the message
      const tradeDetails = {
        offerItemName,
        offerItemDescription,
        offerItemValue,
        offerItemImages: offerItemImages || [],
        productId,
        productTitle: product.title,
        productImage: product.images[0],
        status: "pending"
      };
      
      // Create or get conversation
      let conversation = await storage.getConversationByUsers(userId, sellerId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          user1Id: userId,
          user2Id: sellerId,
          lastMessageId: null
        });
      }
      
      // Create message with trade offer
      const message = await storage.createMessage({
        senderId: userId,
        receiverId: sellerId,
        content: offerMessage,
        isTrade: true,
        productId: productId,
        tradeDetails: JSON.stringify(tradeDetails),
        tradeConfirmedBuyer: false,
        tradeConfirmedSeller: false,
        images: offerItemImages || null
      });
      
      // Update conversation with last message ID
      await storage.updateConversation(conversation.id, {
        lastMessageId: message.id,
        updatedAt: new Date()
      });
      
      // Return the message data
      res.status(201).json({
        message,
        conversation
      });
    } catch (error) {
      console.error("Error creating trade offer:", error);
      res.status(500).json({ error: "Failed to create trade offer" });
    }
  });

  // Accept trade offer API
  app.post("/api/trade-offers/:messageId/accept", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const messageId = parseInt(req.params.messageId);
      
      // Get the message
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ error: "Trade offer not found" });
      }
      
      // Check if this is a trade message
      if (!message.isTrade) {
        return res.status(400).json({ error: "This message is not a trade offer" });
      }
      
      // Determine if user is buyer or seller
      // User is buyer if they received the trade offer
      // User is seller if they sent the trade offer
      const isBuyer = message.receiverId === userId;
      const isSeller = message.senderId === userId;
      
      if (!isBuyer && !isSeller) {
        return res.status(403).json({ error: "You are not authorized to accept this trade" });
      }
      
      // Update message based on user role
      const updates: Partial<Message> = {};
      
      if (isBuyer) {
        updates.tradeConfirmedBuyer = true;
      }
      
      if (isSeller) {
        updates.tradeConfirmedSeller = true;
      }
      
      // Update the message
      const updatedMessage = await storage.updateMessage(messageId, updates);
      
      // Check if both parties have confirmed
      if (updatedMessage.tradeConfirmedBuyer && updatedMessage.tradeConfirmedSeller) {
        // Both parties confirmed, create transaction
        let tradeDetails;
        try {
          tradeDetails = JSON.parse(updatedMessage.tradeDetails || "{}");
        } catch (e) {
          console.error("Failed to parse trade details:", e);
          tradeDetails = {};
        }
        
        // Get product information
        const product = await storage.getProduct(updatedMessage.productId);
        
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        
        // Create transaction for trade
        const transaction = await storage.createTransaction({
          transactionId: `TRADE-${Date.now()}`,
          productId: updatedMessage.productId,
          buyerId: updatedMessage.senderId, // The person who initiated the trade is the buyer
          sellerId: updatedMessage.receiverId, // The person who received the trade offer is the seller
          amount: 0, // Trade has no monetary value in the system
          platformFee: 0, // No fee for trades
          shipping: null,
          status: "processing",
          type: "trade",
          tradeDetails: updatedMessage.tradeDetails,
          timeline: [
            {
              status: "created",
              timestamp: new Date(),
              note: "Trade confirmed by both parties"
            }
          ]
        });
        
        res.status(200).json({
          message: updatedMessage,
          transaction,
          status: "completed"
        });
      } else {
        // Still waiting for other party to confirm
        res.status(200).json({
          message: updatedMessage,
          status: "pending"
        });
      }
    } catch (error) {
      console.error("Error accepting trade offer:", error);
      res.status(500).json({ error: "Failed to accept trade offer" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}