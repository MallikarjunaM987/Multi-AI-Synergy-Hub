require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api', chatRoutes);

// GET /health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Express error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Multi-AI Chat Backend running on port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('\nReceived kill signal, shutting down gracefully...');
  server.close(() => {
    console.log('Closed remaining connections.');
    pool.end(() => {
      console.log('Closed database connection pool.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
