import { pgTable, text, serial, integer, boolean, timestamp, real, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  profileImage: text("profile_image"),
  balance: real("balance").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: real("price"),
  allowTrade: boolean("allow_trade").default(true).notNull(),
  status: text("status").default("available").notNull(), // available, sold, reserved
  images: text("images").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull(),
  user2Id: integer("user2_id").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  productId: integer("product_id").notNull(),
  amount: real("amount").notNull(),
  fee: real("fee").notNull(),
  status: text("status").default("pending").notNull(), // pending, completed, cancelled, disputed
  escrowAmount: real("escrow_amount").notNull(),
  escrowReleased: boolean("escrow_released").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  fullName: z.string().min(2),
}).omit({ id: true, createdAt: true, isAdmin: true, balance: true });

export const insertProductSchema = createInsertSchema(products, {
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  price: z.number().min(0).optional(),
  images: z.array(z.string()).min(1),
  category: z.string(),
}).omit({ id: true, createdAt: true, status: true, userId: true });

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1),
}).omit({ id: true, createdAt: true, read: true });

export const insertTransactionSchema = createInsertSchema(transactions, {
  amount: z.number().min(0),
  productId: z.number(),
}).omit({ id: true, createdAt: true, updatedAt: true, status: true, fee: true, escrowReleased: true, escrowAmount: true, buyerId: true, sellerId: true });

// Types for schema
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Conversation = typeof conversations.$inferSelect;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
