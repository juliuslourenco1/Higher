import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Business Profiles ───────────────────────────────────────────────────────

export const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Marketing",
  "Legal",
  "Real Estate",
  "Education",
  "Logistics",
  "Energy",
  "Media",
  "Consulting",
  "Other",
] as const;

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export const PARTNERSHIP_GOALS = [
  "Co-marketing",
  "Technology Integration",
  "Distribution",
  "Investment",
  "Joint Venture",
  "Supplier / Vendor",
  "Reseller",
  "Strategic Alliance",
  "Other",
] as const;

export const businessProfiles = mysqlTable("business_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // one profile per user
  companyName: varchar("companyName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 64 }).notNull(),
  companySize: varchar("companySize", { length: 32 }).notNull(),
  description: text("description").notNull(),
  logoUrl: text("logoUrl"),
  logoKey: text("logoKey"),
  partnershipGoals: text("partnershipGoals").notNull(), // JSON array stored as text
  website: varchar("website", { length: 512 }),
  location: varchar("location", { length: 255 }),
  profileType: mysqlEnum("profileType", ["business", "freelance"]).default("business").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

// ─── Swipes ──────────────────────────────────────────────────────────────────

export const swipes = mysqlTable("swipes", {
  id: int("id").autoincrement().primaryKey(),
  swiperProfileId: int("swiperProfileId").notNull(),
  targetProfileId: int("targetProfileId").notNull(),
  direction: mysqlEnum("direction", ["right", "left"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = typeof swipes.$inferInsert;

// ─── Matches ─────────────────────────────────────────────────────────────────

export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  profileAId: int("profileAId").notNull(),
  profileBId: int("profileBId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  senderProfileId: int("senderProfileId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Verification Documents ──────────────────────────────────────────────────

export const verificationDocuments = mysqlTable("verification_documents", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  documentUrl: text("documentUrl").notNull(),
  documentKey: text("documentKey").notNull(),
  documentType: varchar("documentType", { length: 64 }).notNull(), // e.g., "business_license", "tax_id", "llc_certificate"
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VerificationDocument = typeof verificationDocuments.$inferSelect;
export type InsertVerificationDocument = typeof verificationDocuments.$inferInsert;

// ─── Work Posts ──────────────────────────────────────────────────────────────

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  hourlyRate: int("hourlyRate").notNull(), // stored as cents (e.g., 9999 = $99.99)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
