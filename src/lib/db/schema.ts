import { pgTable, serial, text, timestamp, boolean, integer, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Users Table ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  replitId: text("replit_id").notNull().unique(), 
  username: text("username").notNull(),
  role: varchar("role", { length: 20 }).default("editor").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Posts Table ---
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  featuredImage: integer("featured_image").references(() => media.id), // Link to Media
  published: boolean("published").default(false).notNull(),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Media Table ---
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: varchar("file_type", { length: 50 }), 
  fileSize: integer("file_size"), 
  url: text("url").notNull(), 
  altText: text("alt_text"),
  uploaderId: integer("uploader_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Settings Table ---
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Relations ---
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  media: many(media),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  image: one(media, { fields: [posts.featuredImage], references: [media.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(users, { fields: [media.uploaderId], references: [users.id] }),
}));
