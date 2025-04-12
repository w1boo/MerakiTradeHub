/**
 * Direct Trade API for handling trade operations without using messages
 */
import { Request, Response } from "express";
import { randomBytes } from "crypto";
import { insertTradeOfferSchema, insertTransactionSchema } from "@shared/schema";
import { storage } from "./storage";
import { z } from "zod";

/**
 * Creates a new direct trade offer without a message
 */
export async function createDirectTradeOffer(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    
    // Validate request data
    const { 
      productId, 
      sellerId, 
      offerValue,
      offerItemName,
      offerItemDescription,
      offerItemImages = [],
      isDirect = true
    } = req.body;
    
    // Ensure we can fetch the product
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Prevent sending trade offers to yourself
    if (userId === sellerId) {
      return res.status(400).json({ error: "Cannot send trade offers to yourself" });
    }
    
    // Create the trade offer
    const tradeOffer = {
      buyerId: userId,
      sellerId,
      productId,
      offerValue,
      offerItemName,
      offerItemDescription,
      offerItemImages,
      status: "pending",
      buyerConfirmed: false,
      sellerConfirmed: false,
      isDirect: true,
    };
    
    // Validate with schema
    const validatedOffer = insertTradeOfferSchema.parse(tradeOffer);
    
    // Store the trade offer
    const newOffer = await storage.createTradeOffer(validatedOffer);
    
    return res.status(201).json(newOffer);
  } catch (error) {
    console.error("Error creating direct trade offer:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create direct trade offer" });
  }
}

/**
 * Gets all trade offers for a user that are direct (not via messages)
 */
export async function getDirectTradeOffers(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    
    // Get all trade offers (as buyer or seller) that are direct
    const allOffers = await storage.getUserTradeOffers(userId);
    const directOffers = allOffers.filter(offer => offer.isDirect === true);
    
    res.json(directOffers);
  } catch (error) {
    console.error("Error fetching direct trade offers:", error);
    res.status(500).json({ error: "Failed to fetch direct trade offers" });
  }
}

/**
 * Gets a direct trade offer by ID
 */
export async function getDirectTradeOffer(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const offerId = parseInt(req.params.id);
    
    if (isNaN(offerId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }
    
    // Get the trade offer
    const offer = await storage.getTradeOffer(offerId);
    
    if (!offer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify that the user is the buyer or seller
    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      return res.status(403).json({ error: "Unauthorized to view this trade offer" });
    }
    
    // Verify that it's a direct trade offer
    if (!offer.isDirect) {
      return res.status(400).json({ error: "This is not a direct trade offer" });
    }
    
    res.json(offer);
  } catch (error) {
    console.error("Error fetching direct trade offer:", error);
    res.status(500).json({ error: "Failed to fetch direct trade offer" });
  }
}

/**
 * Accepts a direct trade offer
 */
export async function acceptDirectTradeOffer(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const offerId = parseInt(req.params.id);
    
    if (isNaN(offerId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }
    
    // Get the trade offer
    const offer = await storage.getTradeOffer(offerId);
    
    if (!offer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify that the user is the seller (only sellers can accept trade offers)
    if (offer.sellerId !== userId) {
      return res.status(403).json({ error: "Only the seller can accept trade offers" });
    }
    
    // Check offer status
    if (offer.status !== "pending") {
      return res.status(400).json({ error: `Cannot accept trade offer with status ${offer.status}` });
    }
    
    // Update the trade offer to accepted
    const updatedOffer = await storage.updateTradeOffer(offerId, {
      status: "accepted",
      sellerConfirmed: true,
    });
    
    if (!updatedOffer) {
      return res.status(500).json({ error: "Failed to update trade offer" });
    }
    
    // Get related product and buyer
    const product = await storage.getProduct(offer.productId);
    const buyer = await storage.getUser(offer.buyerId);
    
    if (!product || !buyer) {
      return res.status(404).json({ error: "Related product or buyer not found" });
    }
    
    // Create a transaction for the trade
    // Generate transaction ID
    const transactionId = `TRX${Date.now().toString().slice(-5)}${randomBytes(2).toString('hex').toUpperCase()}`;
    
    // Create initial timeline
    const timeline = [{
      timestamp: new Date(),
      status: 'initiated',
      description: 'Trade initiated and accepted by seller'
    }];
    
    // Calculate platform fee (10% for trades)
    const platformFee = offer.offerValue * 0.1;
    
    const transactionData = insertTransactionSchema.parse({
      transactionId,
      productId: offer.productId,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      amount: offer.offerValue,
      platformFee,
      status: "pending",
      type: "trade",
      timeline,
      tradeDetails: {
        tradeOfferId: offer.id,
        offerItemName: offer.offerItemName,
        offerItemDescription: offer.offerItemDescription,
        offerItemImages: offer.offerItemImages || []
      }
    });
    
    // Create the transaction
    const transaction = await storage.createTransaction(transactionData);
    
    // Handle escrow for buyer
    if (buyer) {
      if (buyer.balance < offer.offerValue) {
        // If buyer has insufficient balance, mark the trade as pending payment
        await storage.updateTradeOffer(offerId, {
          status: "pending_payment"
        });
        
        return res.status(400).json({ 
          error: "Buyer has insufficient balance", 
          tradeStatus: "pending_payment",
          transaction
        });
      }
      
      // Deduct from balance and add to escrow
      await storage.updateUser(buyer.id, {
        balance: buyer.balance - offer.offerValue,
        escrowBalance: buyer.escrowBalance + offer.offerValue
      });
    }
    
    // Return the updated offer and transaction
    res.json({ 
      offer: updatedOffer, 
      transaction 
    });
  } catch (error) {
    console.error("Error accepting direct trade offer:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to accept direct trade offer" });
  }
}

/**
 * Confirms a direct trade (after it has been accepted)
 */
export async function confirmDirectTrade(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const offerId = parseInt(req.params.id);
    
    if (isNaN(offerId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }
    
    // Get the trade offer
    const offer = await storage.getTradeOffer(offerId);
    
    if (!offer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify that the user is the buyer or seller
    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      return res.status(403).json({ error: "Unauthorized to confirm this trade" });
    }
    
    // Check offer status
    if (offer.status !== "accepted") {
      return res.status(400).json({ error: `Cannot confirm trade with status ${offer.status}` });
    }
    
    // Update confirmation flags based on who is confirming
    const updates: Record<string, any> = {};
    
    if (userId === offer.buyerId) {
      updates.buyerConfirmed = true;
    } else {
      updates.sellerConfirmed = true;
    }
    
    // Update the trade offer
    const updatedOffer = await storage.updateTradeOffer(offerId, updates);
    
    if (!updatedOffer) {
      return res.status(500).json({ error: "Failed to update trade offer" });
    }
    
    // Check if both parties have confirmed
    if (updatedOffer.buyerConfirmed && updatedOffer.sellerConfirmed) {
      // Get the transaction associated with this trade
      const transactions = await storage.getUserTransactions(userId);
      const transaction = transactions.find(t => 
        t.type === "trade" && 
        t.productId === offer.productId && 
        t.buyerId === offer.buyerId &&
        t.sellerId === offer.sellerId
      );
      
      if (transaction) {
        // Create new timeline event
        const timelineEntry = {
          timestamp: new Date(),
          status: 'completed',
          description: 'Trade completed and confirmed by both parties'
        };
        
        // Create new timeline or append to existing one
        const timeline = Array.isArray(transaction.timeline) 
          ? [...transaction.timeline, timelineEntry]
          : [timelineEntry];
        
        // Update transaction to completed
        await storage.updateTransaction(transaction.id, {
          status: 'completed',
          timeline
        });
        
        // Update trade offer status
        await storage.updateTradeOffer(offerId, {
          status: "completed"
        });
        
        // Handle completion - move money from escrow to seller and mark product as sold
        const buyer = await storage.getUser(transaction.buyerId);
        const seller = await storage.getUser(transaction.sellerId);
        
        if (buyer && seller) {
          // Return 90% to buyer's regular balance for trade
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
          
          // Mark product as sold
          await storage.updateProduct(transaction.productId, {
            status: 'sold'
          });
        }
      }
    }
    
    res.json(updatedOffer);
  } catch (error) {
    console.error("Error confirming direct trade:", error);
    res.status(500).json({ error: "Failed to confirm direct trade" });
  }
}

/**
 * Rejects a direct trade offer
 */
export async function rejectDirectTradeOffer(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const offerId = parseInt(req.params.id);
    
    if (isNaN(offerId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }
    
    // Get the trade offer
    const offer = await storage.getTradeOffer(offerId);
    
    if (!offer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify that the user is the buyer or seller
    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      return res.status(403).json({ error: "Unauthorized to reject this trade offer" });
    }
    
    // Check offer status (can only reject pending or accepted trades)
    if (offer.status !== "pending" && offer.status !== "accepted") {
      return res.status(400).json({ error: `Cannot reject trade with status ${offer.status}` });
    }
    
    // If it's already accepted and has a transaction, handle refund
    if (offer.status === "accepted") {
      const transactions = await storage.getUserTransactions(userId);
      const transaction = transactions.find(t => 
        t.type === "trade" && 
        t.productId === offer.productId && 
        t.buyerId === offer.buyerId &&
        t.sellerId === offer.sellerId
      );
      
      if (transaction) {
        // Create new timeline event
        const timelineEntry = {
          timestamp: new Date(),
          status: 'cancelled',
          description: `Trade rejected by ${userId === offer.buyerId ? 'buyer' : 'seller'}`
        };
        
        // Create new timeline or append to existing one
        const timeline = Array.isArray(transaction.timeline) 
          ? [...transaction.timeline, timelineEntry]
          : [timelineEntry];
        
        // Update transaction to cancelled
        await storage.updateTransaction(transaction.id, {
          status: 'cancelled',
          timeline
        });
        
        // Handle refund to buyer
        const buyer = await storage.getUser(transaction.buyerId);
        
        if (buyer) {
          await storage.updateUser(buyer.id, {
            escrowBalance: buyer.escrowBalance - transaction.amount,
            balance: buyer.balance + transaction.amount
          });
        }
      }
    }
    
    // Update the trade offer to rejected
    const updatedOffer = await storage.updateTradeOffer(offerId, {
      status: "rejected"
    });
    
    if (!updatedOffer) {
      return res.status(500).json({ error: "Failed to update trade offer" });
    }
    
    res.json(updatedOffer);
  } catch (error) {
    console.error("Error rejecting direct trade offer:", error);
    res.status(500).json({ error: "Failed to reject direct trade offer" });
  }
}