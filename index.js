// Simple entry point for Glitch
console.log('Starting university registration system...');

// Ensure .data directory exists
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created .data directory for database persistence');
}

// Check if database exists, if not copy it from server directory
const dbSourcePath = path.join(__dirname, 'server', 'university.db');
const dbDestPath = path.join(dataDir, 'university.db');

if (!fs.existsSync(dbDestPath) && fs.existsSync(dbSourcePath)) {
  try {
    fs.copyFileSync(dbSourcePath, dbDestPath);
    console.log('Copied database from server directory to .data directory');
  } catch (err) {
    console.error('Error copying database:', err.message);
  }
}

// Start the actual server
try {
  require('./server/server.js');
} catch (err) {
  console.error('Error starting server:', err);
}
