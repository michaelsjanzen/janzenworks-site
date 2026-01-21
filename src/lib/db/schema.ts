import { pgTable, serial, text, timestamp, boolean, integer, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Users Table ---
// Maps Replit Auth users to site roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  replitId: text("replit_id").notNull().unique(), // The ID from X-Replit-User-Id
  username: text("username").notNull(),
  role: varchar("role", { length: 20 }).default("editor").notNull(), // 'admin' or 'editor'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Posts Table ---
// The core content table for the CMS
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  published: boolean("published").default(false).notNull(),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Settings Table ---
// For database-backed site settings (beyond the config.json)
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Relations ---
// Allows Drizzle to easily join authors with their posts
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
