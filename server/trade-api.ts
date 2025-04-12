import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { TradeOffer, InsertTradeOffer } from "@shared/schema";

// Create a new trade offer
export async function createTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { buyerId, sellerId, productId, offerValue } = req.body;
    
    if (!buyerId || !sellerId || !productId || !offerValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if the product exists
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // User can't make a trade offer for their own product
    if (req.user!.id === product.sellerId) {
      return res.status(400).json({ error: 'Cannot make a trade offer for your own product' });
    }
    
    const tradeOffer: InsertTradeOffer = {
      buyerId,
      sellerId,
      productId,
      offerValue,
      status: 'pending',
      buyerConfirmed: false,
      sellerConfirmed: false
    };
    
    const newTradeOffer = await storage.createTradeOffer(tradeOffer);
    
    // Create a message to notify the seller about the trade offer
    const messageContent = `
**Trade Offer for: ${product.title}**

A user has made a trade offer for your product:
- **Offer Value:** ${(offerValue / 1000).toFixed(3)} ₫

Please check your trade offers to review this.
    `;
    
    const message = await storage.createMessage({
      senderId: buyerId,
      receiverId: sellerId,
      content: messageContent,
      isTrade: true,
      productId,
      tradeOfferId: newTradeOffer.id,
      tradeConfirmedBuyer: false,
      tradeConfirmedSeller: false
    });
    
    // Check if conversation exists, if not create one
    let conversation = await storage.getConversationByUsers(buyerId, sellerId);
    if (!conversation) {
      conversation = await storage.createConversation({
        user1Id: buyerId,
        user2Id: sellerId,
        lastMessageId: message.id
      });
    } else {
      // Update last message id
      await storage.updateConversation(conversation.id, {
        lastMessageId: message.id,
      });
    }
    
    // Update the trade offer with the related message ID
    await storage.updateTradeOffer(newTradeOffer.id, {
      relatedMessageId: message.id
    });
    
    return res.status(201).json({ 
      tradeOffer: newTradeOffer,
      message,
      conversation
    });
  } catch (error) {
    console.error('Error creating trade offer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all trade offers for the current user
export async function getUserTradeOffers(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = req.user!.id;
    const tradeOffers = await storage.getUserTradeOffers(userId);
    
    return res.status(200).json(tradeOffers);
  } catch (error) {
    console.error('Error getting user trade offers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get pending trade offers
export async function getPendingTradeOffers(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = req.user!.id;
    const pendingOffers = await storage.getPendingTradeOffers(userId);
    
    return res.status(200).json(pendingOffers);
  } catch (error) {
    console.error('Error getting pending trade offers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get a specific trade offer
export async function getTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: 'Trade offer not found' });
    }
    
    // Users can only view their own trade offers
    if (tradeOffer.buyerId !== req.user!.id && tradeOffer.sellerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return res.status(200).json(tradeOffer);
  } catch (error) {
    console.error('Error getting trade offer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Accept a trade offer
export async function acceptTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: 'Trade offer not found' });
    }
    
    // Only the seller can accept the trade offer
    if (tradeOffer.sellerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the seller can accept trade offers' });
    }
    
    // Cannot accept already completed or rejected offers
    if (tradeOffer.status !== 'pending') {
      return res.status(400).json({ error: `Trade offer is already ${tradeOffer.status}` });
    }
    
    // Get product information
    const product = await storage.getProduct(tradeOffer.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check that users have enough balance
    const buyer = await storage.getUser(tradeOffer.buyerId);
    const seller = await storage.getUser(tradeOffer.sellerId);
    
    if (!buyer || !seller) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tradeValue = tradeOffer.offerValue;
    const platformFee = Math.round(tradeValue * 0.10); // 10% middleman fee
    
    if (buyer.balance < (tradeValue + platformFee)) {
      return res.status(400).json({ error: 'Buyer does not have enough balance' });
    }
    
    // Update the trade offer status
    const updatedTradeOffer = await storage.updateTradeOffer(tradeOffer.id, {
      status: 'accepted',
      sellerConfirmed: true
    });
    
    // Update the related message
    if (tradeOffer.relatedMessageId) {
      await storage.updateMessage(tradeOffer.relatedMessageId, {
        tradeConfirmedSeller: true
      });
    }
    
    // Move the buyer's money to escrow
    await storage.updateUser(buyer.id, {
      balance: buyer.balance - (tradeValue + platformFee),
      escrowBalance: buyer.escrowBalance + tradeValue
    });
    
    // Create a transaction record
    const transaction = await storage.createTransaction({
      transactionId: uuidv4(),
      productId: product.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: tradeValue,
      platformFee,
      status: 'pending',
      type: 'trade',
      tradeDetails: {
        tradeOfferId: tradeOffer.id,
        offerValue: tradeValue
      },
      timeline: [
        {
          status: 'created',
          timestamp: new Date().toISOString(),
          notes: 'Trade offer accepted by seller'
        }
      ]
    });
    
    return res.status(200).json({
      tradeOffer: updatedTradeOffer,
      transaction
    });
  } catch (error) {
    console.error('Error accepting trade offer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Confirm a trade (by buyer)
export async function confirmTrade(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: 'Trade offer not found' });
    }
    
    // Only the buyer can confirm the trade after the seller accepts
    if (tradeOffer.buyerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the buyer can confirm trades' });
    }
    
    // Can only confirm accepted trades
    if (tradeOffer.status !== 'accepted') {
      return res.status(400).json({ error: 'Trade offer must be accepted first' });
    }
    
    // Update the trade offer
    const updatedTradeOffer = await storage.updateTradeOffer(tradeOffer.id, {
      status: 'completed',
      buyerConfirmed: true
    });
    
    // Update the related message
    if (tradeOffer.relatedMessageId) {
      await storage.updateMessage(tradeOffer.relatedMessageId, {
        tradeConfirmedBuyer: true
      });
    }
    
    // Get users and product
    const buyer = await storage.getUser(tradeOffer.buyerId);
    const seller = await storage.getUser(tradeOffer.sellerId);
    const product = await storage.getProduct(tradeOffer.productId);
    
    if (!buyer || !seller || !product) {
      return res.status(404).json({ error: 'User or product not found' });
    }
    
    const tradeValue = tradeOffer.offerValue;
    
    // Transfer money from buyer's escrow to seller's balance
    await storage.updateUser(buyer.id, {
      escrowBalance: buyer.escrowBalance - tradeValue
    });
    
    await storage.updateUser(seller.id, {
      balance: seller.balance + tradeValue
    });
    
    // Mark the product as sold
    await storage.updateProduct(product.id, {
      status: 'sold'
    });
    
    // Update transaction status
    const transactions = await storage.getUserTransactions(buyer.id);
    const transaction = transactions.find(t => 
      t.type === 'trade' && 
      t.productId === product.id && 
      t.buyerId === buyer.id && 
      t.sellerId === seller.id
    );
    
    if (transaction) {
      const timeline = [...transaction.timeline, {
        status: 'completed',
        timestamp: new Date().toISOString(),
        notes: 'Trade confirmed by buyer, product marked as sold'
      }];
      
      await storage.updateTransaction(transaction.id, {
        status: 'completed',
        timeline
      });
    }
    
    return res.status(200).json({
      tradeOffer: updatedTradeOffer,
      product
    });
  } catch (error) {
    console.error('Error confirming trade:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Reject a trade offer
export async function rejectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: 'Trade offer not found' });
    }
    
    // Both buyer and seller can reject, but only if pending
    if (tradeOffer.buyerId !== req.user!.id && tradeOffer.sellerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (tradeOffer.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject a trade that is ${tradeOffer.status}` });
    }
    
    // Update the trade offer
    const updatedTradeOffer = await storage.updateTradeOffer(tradeOffer.id, {
      status: 'rejected'
    });
    
    return res.status(200).json(updatedTradeOffer);
  } catch (error) {
    console.error('Error rejecting trade offer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}