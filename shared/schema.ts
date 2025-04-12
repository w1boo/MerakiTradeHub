import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  avatar: text("avatar"),
  location: text("location"),
  balance: doublePrecision("balance").default(0).notNull(),
  escrowBalance: doublePrecision("escrow_balance").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price"),
  images: text("images").array().notNull(),
  categoryId: integer("category_id").references(() => productCategories.id),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  location: text("location"),
  allowTrade: boolean("allow_trade").default(true).notNull(),
  allowBuy: boolean("allow_buy").default(true).notNull(),
  tradeValue: doublePrecision("trade_value"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  productId: integer("product_id").references(() => products.id).notNull(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  platformFee: doublePrecision("platform_fee").notNull(),
  shipping: doublePrecision("shipping").default(0),
  status: text("status").notNull(),
  type: text("type").notNull(), // 'purchase' or 'trade'
  tradeDetails: jsonb("trade_details"),
  timeline: jsonb("timeline").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  images: text("images").array(),
  isRead: boolean("is_read").default(false).notNull(),
  isTrade: boolean("is_trade").default(false).notNull(),
  productId: integer("product_id").references(() => products.id),
  tradeDetails: text("trade_details"),
  tradeConfirmedBuyer: boolean("trade_confirmed_buyer").default(false).notNull(),
  tradeConfirmedSeller: boolean("trade_confirmed_seller").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => users.id).notNull(),
  user2Id: integer("user2_id").references(() => users.id).notNull(),
  lastMessageId: integer("last_message_id").references(() => messages.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
  location: true,
  isAdmin: true,
});

export const insertProductCategorySchema = createInsertSchema(productCategories);

export const insertProductSchema = createInsertSchema(products).pick({
  title: true,
  description: true,
  price: true,
  images: true,
  categoryId: true,
  sellerId: true,
  location: true,
  allowTrade: true,
  allowBuy: true,
  tradeValue: true,
  status: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  transactionId: true,
  productId: true,
  buyerId: true,
  sellerId: true,
  amount: true,
  platformFee: true,
  shipping: true,
  status: true,
  type: true,
  tradeDetails: true,
  timeline: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  images: true,
  isTrade: true,
  productId: true,
  tradeDetails: true,
  tradeConfirmedBuyer: true,
  tradeConfirmedSeller: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  user1Id: true,
  user2Id: true,
  lastMessageId: true,
});

export const insertDepositSchema = createInsertSchema(deposits).pick({
  userId: true,
  amount: true,
  method: true,
  status: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).pick({
  userId: true,
  amount: true,
  method: true,
  status: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;

export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
