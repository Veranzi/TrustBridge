require('dotenv').config();
const { db, closeDatabase } = require('../database/db');

console.log('Initializing database...');

// Database will be initialized automatically when db.js is loaded
// This script just ensures the database file exists

setTimeout(async () => {
  await closeDatabase();
  console.log('Database initialization complete!');
  process.exit(0);
}, 1000);

