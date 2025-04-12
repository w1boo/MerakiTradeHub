/**
 * Trade API for handling trade operations
 */
import { Request, Response } from "express";
import { storage } from "./storage";
import { InsertTradeOffer } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Creates a new trade offer
 */
export async function createTradeOffer(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sellerId, productId, offerValue } = req.body;
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

    // Create a message to notify the seller about the trade offer
    const content = `
**Trade Offer for: ${product.title}**

I'd like to offer my item for trade:
- **Item:** ${req.body.offerItemName || "Unnamed item"}
- **Description:** ${req.body.offerItemDescription || "No description"}
- **Trade Value:** ${(offerValue / 1000).toFixed(3)} ₫


Please let me know if you're interested in this trade.
      `;

    const message = await storage.createMessage({
      senderId: buyerId,
      receiverId: sellerId,
      content,
      images: req.body.offerItemImages || [],
      isTrade: true,
      productId,
      tradeOfferId: newTradeOffer.id,
      tradeDetails: req.body.tradeDetails || null,
      tradeConfirmedBuyer: false,
      tradeConfirmedSeller: false,
    });

    // Check if a conversation exists between the two users
    let conversation = await storage.getConversationByUsers(buyerId, sellerId);
    if (!conversation) {
      // Create a new conversation
      conversation = await storage.createConversation({
        user1Id: buyerId,
        user2Id: sellerId,
        lastMessageId: message.id,
      });
    } else {
      // Update the last message in the conversation
      await storage.updateConversation(conversation.id, {
        lastMessageId: message.id,
      });
    }

    // Update the trade offer with the related message ID
    await storage.updateTradeOffer(newTradeOffer.id, {
      relatedMessageId: message.id,
    });

    return res.status(201).json({ message, tradeOffer: newTradeOffer });
  } catch (error: any) {
    console.error("Error creating trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Gets all trade offers for a user
 */
export async function getUserTradeOffers(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const tradeOffers = await storage.getUserTradeOffers(userId);

    return res.status(200).json(tradeOffers);
  } catch (error: any) {
    console.error("Error getting user trade offers:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Gets all pending trade offers for a user
 */
export async function getPendingTradeOffers(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const pendingTradeOffers = await storage.getPendingTradeOffers(userId);

    return res.status(200).json(pendingTradeOffers);
  } catch (error: any) {
    console.error("Error getting pending trade offers:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Gets a trade offer by ID
 */
export async function getTradeOffer(req: Request, res: Response) {
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
    console.error("Error getting trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Accepts a trade offer
 */
export async function acceptTradeOffer(req: Request, res: Response) {
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

    // Update the related message if it exists
    if (tradeOffer.relatedMessageId) {
      const message = await storage.getMessage(tradeOffer.relatedMessageId);
      if (message) {
        await storage.updateMessage(message.id, {
          tradeConfirmedSeller: true,
        });

        // Add a system message to the conversation
        await storage.createMessage({
          senderId: userId,
          receiverId: tradeOffer.buyerId,
          content: `Trade offer for "${req.body.productTitle || 'Product'}" has been accepted. Buyer must confirm to complete the trade.`,
          isTrade: false,
        });
      }
    }

    return res.status(200).json(updatedTradeOffer);
  } catch (error: any) {
    console.error("Error accepting trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Confirms a trade (after it has been accepted)
 */
export async function confirmTrade(req: Request, res: Response) {
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

      // Update related message
      if (tradeOffer.relatedMessageId) {
        const message = await storage.getMessage(tradeOffer.relatedMessageId);
        if (message) {
          await storage.updateMessage(message.id, {
            tradeConfirmedBuyer: true,
          });
        }
      }
    }
    // Seller confirmation
    else if (isSeller && !tradeOffer.sellerConfirmed) {
      await storage.updateTradeOffer(tradeOfferId, {
        sellerConfirmed: true,
      });

      // Update related message
      if (tradeOffer.relatedMessageId) {
        const message = await storage.getMessage(tradeOffer.relatedMessageId);
        if (message) {
          await storage.updateMessage(message.id, {
            tradeConfirmedSeller: true,
          });
        }
      }
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

        // Add a system message to the conversation
        await storage.createMessage({
          senderId: 1, // Admin user ID
          receiverId: tradeOffer.buyerId,
          content: `Trade for "${product.title}" has been completed successfully! A 10% fee (${(feeAmount / 1000).toFixed(3)} ₫) was applied.`,
          isTrade: false,
        });

        // Notify the seller too
        await storage.createMessage({
          senderId: 1, // Admin user ID
          receiverId: tradeOffer.sellerId,
          content: `Trade for "${product.title}" has been completed successfully! A 10% fee (${(feeAmount / 1000).toFixed(3)} ₫) was applied.`,
          isTrade: false,
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
    console.error("Error confirming trade:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Rejects a trade offer
 */
export async function rejectTradeOffer(req: Request, res: Response) {
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

    // Update the related message if it exists
    if (tradeOffer.relatedMessageId) {
      const message = await storage.getMessage(tradeOffer.relatedMessageId);
      if (message) {
        await storage.updateMessage(message.id, {
          tradeConfirmedBuyer: false,
          tradeConfirmedSeller: false,
        });

        // Add a system message to the conversation
        const isRejectedByBuyer = userId === tradeOffer.buyerId;
        const receiverId = isRejectedByBuyer ? tradeOffer.sellerId : tradeOffer.buyerId;
        
        await storage.createMessage({
          senderId: userId,
          receiverId,
          content: `Trade offer has been rejected by ${isRejectedByBuyer ? 'buyer' : 'seller'}.`,
          isTrade: false,
        });
      }
    }

    return res.status(200).json(updatedTradeOffer);
  } catch (error: any) {
    console.error("Error rejecting trade offer:", error);
    return res.status(500).json({ error: error.message });
  }
}