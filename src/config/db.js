import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 20,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,
});

// Test DB connection
pool.connect()
  .then((client) => {
    console.log("✅ PostgreSQL connected");
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err);
  });

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
});

export default pool;