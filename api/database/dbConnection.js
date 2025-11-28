import pkg from "pg";
const { Pool } = pkg;
const isProd = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false, // 👈 OFF locally / ON in Render
});

await pool
  .connect()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("failed to connect", err);
    process.exit(1);
  });
export default pool;
