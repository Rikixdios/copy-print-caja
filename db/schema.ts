import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appState = sqliteTable("app_state", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cajaAccess = sqliteTable("caja_access", {
  id: integer("id").primaryKey(),
  pinVerifier: text("pin_verifier").notNull(),
  revision: integer("revision").notNull().default(1),
  attempts: integer("attempts").notNull().default(0),
  windowUntil: integer("window_until").notNull().default(0),
});

export const creditLinks = sqliteTable("credit_links", {
  accountId: text("account_id").primaryKey(),
  token: text("token").notNull().unique(),
});

export const whatsappNotes = sqliteTable("whatsapp_notes", {
  owner: text("owner").notNull(),
  id: text("id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
}, table => [primaryKey({ columns: [table.owner, table.id] })]);
