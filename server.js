// This is a simple wrapper for Glitch to run the actual server
// Glitch prefers server.js to be in the root directory

// Ensure .data directory exists
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Check if database exists, if not copy it from server directory
const dbSourcePath = path.join(__dirname, 'server', 'university.db');
const dbDestPath = path.join(dataDir, 'university.db');

if (!fs.existsSync(dbDestPath) && fs.existsSync(dbSourcePath)) {
  fs.copyFileSync(dbSourcePath, dbDestPath);
  console.log('Copied database from server directory to .data directory');
}

// Start the actual server
require('./server/server.js');
