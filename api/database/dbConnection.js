import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({
  host: process.env.HOST,
  port: process.env.PSQL_PORT,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB_NAME,
});
await pool
  .connect()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("failed to connect", err);
    process.exit(1);
  });
export default pool;
