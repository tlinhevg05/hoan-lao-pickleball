import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const content = sqliteTable("content", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
});
export const registrations = sqliteTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id").notNull(),
    phone: text("phone").notNull(),
    category: text("category").notNull(),
    data: text("data").notNull(),
    status: text("status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
    athleteId: text("athlete_id"),
    reviewedAt: text("reviewed_at"),
    publishedStatus: text("published_status").notNull().default("pending"),
    publishedNote: text("published_note").notNull().default(""),
  },
  (t) => [
    uniqueIndex("unique_registration").on(t.tournamentId, t.phone, t.category),
  ],
);
export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  expires: integer("expires").notNull(),
  accountId: text("account_id"),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    phone: text("phone"),
    username: text("username"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"),
    disabled: integer("disabled").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("account_phone").on(t.phone),
    uniqueIndex("account_username").on(t.username),
  ],
);
export const athletes = sqliteTable("athletes", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  status: text("status").notNull().default("pending"),
  note: text("note").notNull().default(""),
  points: real("points").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const eventState = sqliteTable("event_state", {
  tournamentId: text("tournament_id").primaryKey(),
  finalizedAt: text("finalized_at"),
  officialAt: text("official_at"),
  finalizedBy: text("finalized_by"),
  finalizationId: text("finalization_id"),
  publicationVersion: integer("publication_version").notNull().default(0),
});
export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  targetId: text("target_id").notNull(),
  operation: text("operation").notNull().default("create"),
  data: text("data").notNull(),
  status: text("status").notNull().default("pending"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
  note: text("note").notNull().default(""),
});
export const categories = sqliteTable("categories", {
  name: text("name").primaryKey(),
  createdAt: text("created_at").notNull(),
});
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  body: text("body").notNull(),
  read: integer("read").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const uploads = sqliteTable("uploads", {
  key: text("key").primaryKey(),
  ownerId: text("owner_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const articleTopics = sqliteTable("article_topics", {
  name: text("name").primaryKey(),
  createdAt: text("created_at").notNull(),
});
