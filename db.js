const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "linebotdb",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "linebotdb",
  password: process.env.DB_PASS || "linebotdb",
  port: process.env.DB_PORT || 5432,
});

module.exports = pool;
