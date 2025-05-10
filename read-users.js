const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get the absolute path to the database
const dbPath = path.resolve(__dirname, '.data/university.db');
console.log('Database path:', dbPath);

// Open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Get all users
db.all("SELECT * FROM users", [], (err, users) => {
  if (err) {
    console.error('Error getting users:', err.message);
    process.exit(1);
  }

  console.log('Users in the database:');
  users.forEach(user => {
    console.log(`ID: ${user.id}, Username: ${user.username}, Password: ${user.password}, Role: ${user.role}`);
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
