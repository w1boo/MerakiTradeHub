/**
 * Trade acceptance handlers
 */
import { Request, Response } from "express";
import { storage } from "./storage";
import { DirectTradeOffer } from "@shared/schema";

export async function handleTradeAcceptance(req: Request, res: Response) {
  try {
    console.log("=== SIMPLE TRADE ACCEPTANCE ===");
    
    // Get the logged in user
    const userId = req.user!.id;
    const { messageId } = req.body;
    
    console.log(`User ${userId} accepting trade for message ${messageId}`);
    
    // Basic validation
    if (!messageId) {
      return res.status(400).json({ error: "Message ID is required" });
    }
    
    // Get the trade message
    const message = await storage.getMessage(messageId);
    if (!message) {
      return res.status(404).json({ error: "Trade message not found" });
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
    
    console.log(`Processing trade for product: ${product.title} (ID: ${product.id})`);
    
    // Check if current user is seller
    const isSeller = userId === product.sellerId;
    console.log(`User is ${isSeller ? 'seller' : 'buyer'} of the product`);
    
    // Mark the product as sold
    await storage.updateProduct(product.id, { status: 'sold' });
    console.log(`Marked product ${product.id} as sold`);
    
    // Calculate fee based on trade value
    const tradeValue = product.tradeValue || 0;
    const fee = Math.round(tradeValue * 0.1); // 10% fee
    
    // Create transaction record
    const transaction = await storage.createTransaction({
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
        messageId: messageId,
        productName: product.title,
        fee: fee
      },
      timeline: [
        {
          status: 'completed',
          timestamp: new Date(),
          note: `Trade accepted directly. Fee: ${fee.toLocaleString('vi-VN')} ₫`
        }
      ]
    });
    
    console.log(`Created transaction record: ${transaction.id}`);
    
    // Return success response
    res.json({
      success: true,
      message: "Trade accepted successfully"
    });
    
  } catch (error) {
    console.error("Error in simple trade acceptance:", error);
    res.status(500).json({
      error: "Failed to process trade"
    });
  }
}

/**
 * Handle direct trade offer acceptance with custom items
 */
export async function handleDirectTradeAcceptance(req: Request, res: Response) {
  try {
    console.log("=== DIRECT TRADE ACCEPTANCE ===");
    
    // Get the logged in user
    const userId = req.user!.id;
    const { offerId } = req.body;
    
    console.log(`User ${userId} accepting direct trade offer ${offerId}`);
    
    // Basic validation
    if (!offerId) {
      return res.status(400).json({ error: "Offer ID is required" });
    }
    
    // Get the trade offer
    const offer = await storage.getDirectTradeOffer(offerId);
    if (!offer) {
      return res.status(404).json({ error: "Trade offer not found" });
    }
    
    // Make sure the user is either the buyer or seller
    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      return res.status(403).json({ error: "Not authorized to accept this trade offer" });
    }
    
    // Check if the offer is already processed
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `This trade offer is already ${offer.status}` });
    }
    
    // Get the product
    const product = await storage.getProduct(offer.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    console.log(`Processing direct trade for product: ${product.title} (ID: ${product.id}) and offered item: ${offer.offeredItemName}`);
    
    // Get both users
    const buyer = await storage.getUser(offer.buyerId);
    const seller = await storage.getUser(offer.sellerId);
    
    if (!buyer || !seller) {
      return res.status(404).json({ error: "One or both users not found" });
    }
    
    // Determine the higher value (escrow amount) - this is the amount that will be held from both users
    const escrowAmount = Math.max(
      offer.offeredItemValue, 
      product.tradeValue || 0
    );
    
    // Check if both users have enough balance for the escrow
    if (buyer.balance < escrowAmount) {
      return res.status(400).json({ error: "Buyer doesn't have enough balance for escrow" });
    }
    
    if (seller.balance < escrowAmount) {
      return res.status(400).json({ error: "Seller doesn't have enough balance for escrow" });
    }
    
    // Calculate the 10% platform fee
    const platformFee = Math.round(escrowAmount * 0.1);
    
    // Move money to escrow for both users
    await storage.updateUser(buyer.id, {
      balance: buyer.balance - escrowAmount,
      escrowBalance: buyer.escrowBalance + escrowAmount
    });
    
    await storage.updateUser(seller.id, {
      balance: seller.balance - escrowAmount,
      escrowBalance: seller.escrowBalance + escrowAmount
    });
    
    // Mark the offer as accepted
    await storage.updateDirectTradeOffer(offer.id, {
      status: 'accepted',
      escrowAmount: escrowAmount
    });
    
    // Mark the product as sold
    await storage.updateProduct(product.id, { 
      status: 'sold' 
    });
    
    // Create a transaction record
    const transaction = await storage.createTransaction({
      transactionId: `DIRECT-TRADE-${Date.now()}`,
      productId: product.id,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      amount: escrowAmount,
      platformFee: platformFee,
      shipping: 0,
      status: 'pending',
      type: 'direct-trade',
      tradeDetails: {
        offerId: offer.id,
        sellerProductName: product.title,
        sellerProductValue: product.tradeValue,
        buyerItemName: offer.offeredItemName,
        buyerItemValue: offer.offeredItemValue,
        escrowAmount: escrowAmount,
        fee: platformFee
      },
      timeline: [
        {
          status: 'accepted',
          timestamp: new Date(),
          note: `Direct trade accepted. Escrow amount: ${escrowAmount.toLocaleString('vi-VN')} ₫, Fee: ${platformFee.toLocaleString('vi-VN')} ₫`
        }
      ]
    });
    
    console.log(`Created transaction record: ${transaction.id}`);
    
    // Return success response
    res.json({
      success: true,
      message: "Direct trade accepted successfully",
      transaction: transaction
    });
    
  } catch (error) {
    console.error("Error in direct trade acceptance:", error);
    res.status(500).json({
      error: "Failed to process direct trade"
    });
  }
}

/**
 * Complete a trade transaction
 */
export async function completeDirectTrade(req: Request, res: Response) {
  try {
    console.log("=== COMPLETING DIRECT TRADE ===");
    
    // Get the logged in user
    const userId = req.user!.id;
    const { transactionId } = req.body;
    
    console.log(`User ${userId} confirming completion of trade transaction ${transactionId}`);
    
    // Basic validation
    if (!transactionId) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }
    
    // Get the transaction
    const transaction = await storage.getTransaction(parseInt(transactionId));
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Make sure it's a direct trade
    if (transaction.type !== 'direct-trade') {
      return res.status(400).json({ error: "Not a direct trade transaction" });
    }
    
    // Make sure the user is either the buyer or seller
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      return res.status(403).json({ error: "Not authorized to complete this transaction" });
    }
    
    // Check if the transaction is already completed
    if (transaction.status === 'completed') {
      return res.status(400).json({ error: "This transaction is already completed" });
    }
    
    // Get the trade details and update the confirmation status
    const tradeDetails = transaction.tradeDetails ? { ...transaction.tradeDetails } : {};
    
    if (userId === transaction.buyerId) {
      tradeDetails.buyerConfirmed = true;
    } else {
      tradeDetails.sellerConfirmed = true;
    }
    
    // Update the transaction with the new details
    await storage.updateTransaction(transaction.id, {
      tradeDetails: tradeDetails
    });
    
    // If both parties have confirmed, complete the transaction
    if (tradeDetails.buyerConfirmed && tradeDetails.sellerConfirmed) {
      console.log("Both parties confirmed, completing transaction");
      
      // Get the users
      const buyer = await storage.getUser(transaction.buyerId);
      const seller = await storage.getUser(transaction.sellerId);
      
      if (!buyer || !seller) {
        return res.status(404).json({ error: "One or both users not found" });
      }
      
      // Calculate the amount to return (escrow amount minus fee)
      const returnAmount = transaction.amount - transaction.platformFee;
      
      // Return funds from escrow to both users (minus fee for platform)
      await storage.updateUser(buyer.id, {
        escrowBalance: buyer.escrowBalance - transaction.amount,
        balance: buyer.balance + returnAmount
      });
      
      await storage.updateUser(seller.id, {
        escrowBalance: seller.escrowBalance - transaction.amount,
        balance: seller.balance + returnAmount
      });
      
      // Update the transaction status to completed
      const timeline = Array.isArray(transaction.timeline)
        ? [...transaction.timeline, {
            status: 'completed',
            timestamp: new Date(),
            note: `Trade completed by both parties. Each party received ${returnAmount.toLocaleString('vi-VN')} ₫ back.`
          }]
        : [{
            status: 'completed',
            timestamp: new Date(),
            note: `Trade completed by both parties. Each party received ${returnAmount.toLocaleString('vi-VN')} ₫ back.`
          }];
      
      await storage.updateTransaction(transaction.id, {
        status: 'completed',
        timeline: timeline
      });
      
      return res.json({
        success: true,
        message: "Trade completed successfully. Funds have been returned to both parties (minus platform fee).",
        completed: true
      });
    }
    
    // If only one party has confirmed
    return res.json({
      success: true,
      message: "Your confirmation has been recorded. Waiting for the other party to confirm.",
      completed: false
    });
    
  } catch (error) {
    console.error("Error completing direct trade:", error);
    res.status(500).json({
      error: "Failed to complete direct trade"
    });
  }
}