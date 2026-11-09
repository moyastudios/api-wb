import { neon } from "@neondatabase/serverless";

let client;

// Created on first use so that rejected requests never touch the database.
export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}
