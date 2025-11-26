import fs from "fs";
import path from "path";
import pkg from "pg";
const { Client } = pkg;

const SQL_PATH = path.resolve("api/database/schema.sql");
const sql = fs.readFileSync(SQL_PATH).toString();

// Loading environment variables
async function runMigration() {
  const client = new Client({
    host: process.env.HOST,
    port: process.env.PSQL_PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DB_NAME,
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
