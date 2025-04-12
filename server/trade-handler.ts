/**
 * Simple trade acceptance handler
 */
import { Request, Response } from "express";
import { storage } from "./storage";

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