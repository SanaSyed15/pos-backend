import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },

  // 🔥 Pool Optimizations
  max: 20, // maximum DB connections

  idleTimeoutMillis: 30000, // close idle clients after 30 sec

  connectionTimeoutMillis: 2000, // fail fast if DB unavailable
});

// Test DB connection
pool.connect()
  .then((client) => {
    console.log("✅ PostgreSQL connected");
    client.release(); // VERY IMPORTANT
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err);
  });

// Handle unexpected errors
pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
});

export default pool;