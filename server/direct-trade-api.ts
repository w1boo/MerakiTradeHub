/**
 * Direct Trade API for handling trade operations without using messages
 */
import { Request, Response } from "express";
import { storage } from "./storage";
import { InsertTradeOffer } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Creates a new direct trade offer without a message
 */
export async function createDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sellerId, productId, offerValue, offerItemName, offerItemDescription, offerItemImages } = req.body;
    const buyerId = req.user.id;

    // Check if product exists
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Create a trade offer
    const tradeOffer: InsertTradeOffer = {
      buyerId,
      sellerId,
      productId,
      offerValue,
      status: "pending",
      buyerConfirmed: false,
      sellerConfirmed: false,
    };

    const newTradeOffer = await storage.createTradeOffer(tradeOffer);

    // Store trade details in the tradeDetailsData field of the database
    // This avoids the need for a message
    const tradeDetailsData = {
      offerItemName,
      offerItemDescription,
      offerItemImages: offerItemImages || [],
      productTitle: product.title,
      productId: product.id,
      timestamp: new Date().toISOString()
    };

    // We'll add this trade details to the trade offer
    const updatedTradeOffer = await storage.updateTradeOffer(newTradeOffer.id, {
      tradeDetailsData: JSON.stringify(tradeDetailsData),
    });

    return res.status(201).json({ tradeOffer: updatedTradeOffer });
  } catch (error: any) {
    console.error("Error creating direct trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Gets all trade offers for a user that are direct (not via messages)
 */
export async function getDirectTradeOffers(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const tradeOffers = await storage.getUserTradeOffers(userId);
    
    // We may need to filter these in the future if there's a distinction
    // between direct and message-based trade offers

    return res.status(200).json(tradeOffers);
  } catch (error: any) {
    console.error("Error getting direct trade offers:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Gets a direct trade offer by ID
 */
export async function getDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tradeOfferId = parseInt(req.params.id);
    if (isNaN(tradeOfferId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }

    const tradeOffer = await storage.getTradeOffer(tradeOfferId);
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }

    // Check if the user is either the buyer or seller of the trade offer
    const userId = req.user.id;
    if (tradeOffer.buyerId !== userId && tradeOffer.sellerId !== userId) {
      return res.status(403).json({ error: "You don't have permission to view this trade offer" });
    }

    return res.status(200).json(tradeOffer);
  } catch (error: any) {
    console.error("Error getting direct trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Accepts a direct trade offer
 */
export async function acceptDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tradeOfferId = parseInt(req.params.id);
    if (isNaN(tradeOfferId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }

    const tradeOffer = await storage.getTradeOffer(tradeOfferId);
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }

    // Check if the user is the seller of the trade offer
    const userId = req.user.id;
    if (tradeOffer.sellerId !== userId) {
      return res.status(403).json({ error: "Only the seller can accept a trade offer" });
    }

    // Check if the trade offer is already accepted
    if (tradeOffer.status !== "pending") {
      return res.status(400).json({ error: `This trade offer has already been ${tradeOffer.status}` });
    }

    // Update the trade offer status
    const updatedTradeOffer = await storage.updateTradeOffer(tradeOfferId, {
      status: "accepted",
      sellerConfirmed: true,
    });

    return res.status(200).json(updatedTradeOffer);
  } catch (error: any) {
    console.error("Error accepting direct trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Confirms a direct trade (after it has been accepted)
 */
export async function confirmDirectTrade(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tradeOfferId = parseInt(req.params.id);
    if (isNaN(tradeOfferId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }

    const tradeOffer = await storage.getTradeOffer(tradeOfferId);
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }

    // Get buyer and seller IDs
    const { buyerId, sellerId } = tradeOffer;
    const userId = req.user.id;

    // Check if the user is either the buyer or seller
    if (buyerId !== userId && sellerId !== userId) {
      return res.status(403).json({ error: "You don't have permission to confirm this trade" });
    }

    // A user can only confirm their respective side of the trade
    const isBuyer = buyerId === userId;
    const isSeller = sellerId === userId;

    // Check if the trade offer is in the correct state
    if (tradeOffer.status !== "accepted") {
      return res.status(400).json({ error: "This trade offer must be accepted first" });
    }

    // Buyer confirmation
    if (isBuyer && !tradeOffer.buyerConfirmed) {
      await storage.updateTradeOffer(tradeOfferId, {
        buyerConfirmed: true,
      });
    }
    // Seller confirmation
    else if (isSeller && !tradeOffer.sellerConfirmed) {
      await storage.updateTradeOffer(tradeOfferId, {
        sellerConfirmed: true,
      });
    } else {
      // User is trying to confirm a side that's already confirmed
      return res.status(400).json({ error: "You have already confirmed this trade" });
    }

    // Fetch the updated trade offer
    const updatedTradeOffer = await storage.getTradeOffer(tradeOfferId);
    if (!updatedTradeOffer) {
      return res.status(404).json({ error: "Trade offer not found after update" });
    }

    // Check if both parties have confirmed
    if (updatedTradeOffer.buyerConfirmed && updatedTradeOffer.sellerConfirmed) {
      // Complete the trade
      await storage.updateTradeOffer(tradeOfferId, {
        status: "completed",
      });

      // Get the product being traded
      const product = await storage.getProduct(tradeOffer.productId);
      if (product) {
        // Update product status to sold
        await storage.updateProduct(product.id, {
          status: "sold",
        });

        // Calculate fee (10% of offer value)
        const feeAmount = updatedTradeOffer.offerValue * 0.1;
        const remainingAmount = updatedTradeOffer.offerValue - feeAmount;

        // Create a transaction record
        const transaction = await storage.createTransaction({
          buyerId: updatedTradeOffer.buyerId,
          sellerId: updatedTradeOffer.sellerId,
          productId: updatedTradeOffer.productId,
          amount: updatedTradeOffer.offerValue,
          fee: feeAmount,
          transactionId: uuidv4(),
          status: "completed",
          paymentMethod: "trade",
        });

        return res.status(200).json({ 
          tradeOffer: { 
            ...updatedTradeOffer, 
            status: "completed" 
          }, 
          transaction 
        });
      }
    }

    return res.status(200).json(updatedTradeOffer);
  } catch (error: any) {
    console.error("Error confirming direct trade:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Rejects a direct trade offer
 */
export async function rejectDirectTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tradeOfferId = parseInt(req.params.id);
    if (isNaN(tradeOfferId)) {
      return res.status(400).json({ error: "Invalid trade offer ID" });
    }

    const tradeOffer = await storage.getTradeOffer(tradeOfferId);
    if (!tradeOffer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }

    // Check if the user is either the buyer or seller
    const userId = req.user.id;
    if (tradeOffer.buyerId !== userId && tradeOffer.sellerId !== userId) {
      return res.status(403).json({ error: "You don't have permission to reject this trade offer" });
    }

    // Check if the trade offer is in a state that can be rejected
    if (tradeOffer.status === "completed") {
      return res.status(400).json({ error: "This trade has already been completed and cannot be rejected" });
    }
    
    if (tradeOffer.status === "rejected") {
      return res.status(400).json({ error: "This trade has already been rejected" });
    }

    // Update the trade offer status
    const updatedTradeOffer = await storage.updateTradeOffer(tradeOfferId, {
      status: "rejected",
    });

    return res.status(200).json(updatedTradeOffer);
  } catch (error: any) {
    console.error("Error rejecting direct trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}