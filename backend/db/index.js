const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(res => {
    console.log('Successfully connected to the PostgreSQL database at:', res.rows[0].now);
  })
  .catch(err => {
    console.error('Failed to connect to the PostgreSQL database:', err.message);
  });

module.exports = pool;
