/**
 * Direct Trade API for handling trade operations without using messages
 */
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { User } from "@shared/schema";

/**
 * Creates a new direct trade offer without a message
 */
export async function createDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const user = req.user as User;
    
    const { 
      productId, 
      sellerId, 
      offerValue, 
      offerItemName,
      offerItemDescription,
      status
    } = req.body;

    // Validate request
    if (!productId || !sellerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Can't trade with yourself
    if (user.id === sellerId) {
      return res.status(400).json({ error: "You cannot trade with yourself" });
    }

    // Get the product
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Create the trade offer
    const tradeOffer = await storage.createTradeOffer({
      productId,
      sellerId,
      buyerId: user.id,
      status: status || "pending", // pending, accepted, rejected, completed
      offerValue,
      offerItemName,
      offerItemDescription,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json(tradeOffer);
  } catch (error: any) {
    console.error("Error creating direct trade offer:", error);
    res.status(500).json({ error: error.message || "Failed to create trade offer" });
  }
}

/**
 * Gets all trade offers for a user that are direct (not via messages)
 */
export async function getDirectTradeOffers(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const user = req.user as User;
    const tradeOffers = await storage.getUserTradeOffers(user.id);

    res.json(tradeOffers);
  } catch (error: any) {
    console.error("Error getting trade offers:", error);
    res.status(500).json({ error: error.message || "Failed to get trade offers" });
  }
}

/**
 * Gets a direct trade offer by ID
 */
export async function getDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const { id } = req.params;
    const tradeOffer = await storage.getTradeOffer(Number(id));

    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }

    res.json(tradeOffer);
  } catch (error: any) {
    console.error("Error getting trade offer:", error);
    res.status(500).json({ error: error.message || "Failed to get trade offer" });
  }
}

/**
 * Accepts a direct trade offer
 */
export async function acceptDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const user = req.user as User;
    const { id } = req.params;
    
    // Get the trade offer
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify this user is the seller
    if (tradeOffer.sellerId !== user.id) {
      return res.status(403).json({ error: "Only the seller can accept a trade offer" });
    }
    
    // Verify the offer is still pending
    if (tradeOffer.status !== "pending") {
      return res.status(400).json({ error: `Trade offer is already ${tradeOffer.status}` });
    }
    
    // Determine which value is higher - the product or the offered item
    const product = await storage.getProduct(tradeOffer.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // The higher of the two values will be held in escrow
    const escrowAmount = Math.max(
      product.tradeValue || 0, 
      tradeOffer.offerValue || 0
    );
    
    // Check if the seller has enough funds for escrow
    if (user.balance < escrowAmount) {
      return res.status(400).json({ 
        error: `You need at least ${escrowAmount.toLocaleString('vi-VN')} ₫ in your account to accept this trade. This amount will be held in escrow until the trade is completed.` 
      });
    }
    
    // Get the buyer
    const buyer = await storage.getUser(tradeOffer.buyerId);
    if (!buyer) {
      return res.status(404).json({ error: "Buyer not found" });
    }
    
    // Check if the buyer has enough funds for escrow
    if (buyer.balance < escrowAmount) {
      return res.status(400).json({ 
        error: `The buyer doesn't have enough funds (${escrowAmount.toLocaleString('vi-VN')} ₫) to complete this trade.` 
      });
    }
    
    // Withdraw funds from seller for escrow
    await storage.updateUser(user.id, {
      balance: user.balance - escrowAmount
    });
    
    // Withdraw funds from buyer for escrow
    await storage.updateUser(buyer.id, {
      balance: buyer.balance - escrowAmount
    });
    
    // Update the trade offer status to accepted and save escrow amount
    const updatedOffer = await storage.updateTradeOffer(Number(id), {
      status: "accepted",
      escrowAmount: escrowAmount,
      updatedAt: new Date()
    });
    
    res.json(updatedOffer);
  } catch (error: any) {
    console.error("Error accepting trade offer:", error);
    res.status(500).json({ error: error.message || "Failed to accept trade offer" });
  }
}

/**
 * Confirms a direct trade (after it has been accepted)
 */
export async function confirmDirectTrade(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const user = req.user as User;
    const { id } = req.params;
    
    // Get the trade offer
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify this user is the buyer
    if (tradeOffer.buyerId !== user.id) {
      return res.status(403).json({ error: "Only the buyer can confirm a trade" });
    }
    
    // Verify the offer is accepted
    if (tradeOffer.status !== "accepted") {
      return res.status(400).json({ error: `Trade offer must be accepted first` });
    }
    
    // Get the product
    const product = await storage.getProduct(tradeOffer.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Determine the trade value (use the higher of the two values)
    const productValue = product.tradeValue || 0;
    const offerValue = tradeOffer.offerValue || 0;
    const tradeValue = Math.max(productValue, offerValue);
    
    // Calculate platform fee (10% of trade value)
    const platformFee = Math.round(tradeValue * 0.1);
    
    // Get the escrow amount that was held
    const escrowAmount = tradeOffer.escrowAmount || 0;
    
    // Get the seller to return funds (minus fee)
    const seller = await storage.getUser(tradeOffer.sellerId);
    if (seller) {
      // Return the escrow amount to the seller (minus platform fee)
      const amountToReturn = escrowAmount - platformFee;
      await storage.updateUser(seller.id, {
        balance: seller.balance + amountToReturn
      });
    }
    
    // Return the buyer's escrow minus fee too
    const buyer = await storage.getUser(tradeOffer.buyerId);
    if (buyer && buyer.id !== user.id) {
      // This is a safety check, but in reality, the confirming user should be the buyer
      await storage.updateUser(buyer.id, {
        balance: buyer.balance + escrowAmount - platformFee
      });
    } else {
      // Since the current user is the buyer, update their balance
      await storage.updateUser(user.id, {
        balance: user.balance + escrowAmount - platformFee
      });
    }
    
    // Create a transaction for this trade
    const transaction = await storage.createTransaction({
      productId: tradeOffer.productId,
      sellerId: tradeOffer.sellerId,
      buyerId: tradeOffer.buyerId,
      type: "trade",
      status: "completed",
      amount: tradeValue,
      platformFee,
      transactionId: uuidv4(),
      timeline: [
        {
          status: "created",
          timestamp: new Date().toISOString(),
          note: "Trade initiated"
        },
        {
          status: "completed",
          timestamp: new Date().toISOString(),
          note: "Trade completed successfully, escrow released minus platform fee"
        }
      ],
      tradeDetails: {
        tradeOfferId: tradeOffer.id,
        offerItemName: tradeOffer.offerItemName,
        offerItemDescription: tradeOffer.offerItemDescription,
        offerValue: tradeOffer.offerValue,
        escrowAmount: escrowAmount,
        escrowReleased: escrowAmount - platformFee
      }
    });
    
    // Update the trade offer status to completed
    const updatedOffer = await storage.updateTradeOffer(Number(id), {
      status: "completed"
    });
    
    // Remove the product as it's been traded
    await storage.updateProduct(product.id, {
      status: "sold"
    });
    
    res.json({
      tradeOffer: updatedOffer,
      transaction
    });
  } catch (error: any) {
    console.error("Error confirming trade:", error);
    res.status(500).json({ error: error.message || "Failed to confirm trade" });
  }
}

/**
 * Rejects a direct trade offer
 */
export async function rejectDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const user = req.user as User;
    const { id } = req.params;
    
    // Get the trade offer
    const tradeOffer = await storage.getTradeOffer(Number(id));
    
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Verify this user is either the buyer or seller
    if (tradeOffer.sellerId !== user.id && tradeOffer.buyerId !== user.id) {
      return res.status(403).json({ error: "Only the buyer or seller can reject a trade offer" });
    }
    
    // Verify the offer is still pending or accepted (not completed or already rejected)
    if (tradeOffer.status !== "pending" && tradeOffer.status !== "accepted") {
      return res.status(400).json({ error: `Trade offer cannot be rejected when it's ${tradeOffer.status}` });
    }
    
    // If the trade was already accepted, return the escrow amount to both parties
    if (tradeOffer.status === "accepted" && tradeOffer.escrowAmount) {
      // Return the full escrow amount to the seller
      const seller = await storage.getUser(tradeOffer.sellerId);
      if (seller) {
        await storage.updateUser(seller.id, {
          balance: seller.balance + tradeOffer.escrowAmount
        });
      }
      
      // Return the full escrow amount to the buyer as well
      const buyer = await storage.getUser(tradeOffer.buyerId);
      if (buyer) {
        await storage.updateUser(buyer.id, {
          balance: buyer.balance + tradeOffer.escrowAmount
        });
      }
    }
    
    // Update the trade offer status to rejected
    const updatedOffer = await storage.updateTradeOffer(Number(id), {
      status: "rejected"
    });
    
    res.json(updatedOffer);
  } catch (error: any) {
    console.error("Error rejecting trade offer:", error);
    res.status(500).json({ error: error.message || "Failed to reject trade offer" });
  }
}