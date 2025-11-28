import fs from "fs";
import path from "path";
import pkg from "pg";
const { Client } = pkg;

const SQL_PATH = path.resolve("api/database/schema.sql");
const sql = fs.readFileSync(SQL_PATH).toString();

// Loading environment variables
async function runMigration() {
  const isProd = process.env.NODE_ENV === "production";

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isProd ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log("DB Connected. Running migrations...");

    await client.query(sql);

    console.log("Tables & enums created successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
