const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get the absolute path to the database
const dbPath = path.resolve(__dirname, 'server/university.db');
console.log('Database path:', dbPath);

// Open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Get all tables in the database
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err.message);
    process.exit(1);
  }

  console.log('Tables in the database:');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });

  // Close the database
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
});
