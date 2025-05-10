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

// Update the max courses limit
db.run('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
  ['2', 'max_courses_limit'],
  function(err) {
    if (err) {
      console.error('Error updating max courses limit:', err.message);
      process.exit(1);
    }
    
    console.log(`Max courses limit updated. Rows affected: ${this.changes}`);
    
    // Verify the update
    db.get('SELECT * FROM system_settings WHERE key = ?', ['max_courses_limit'], (err, row) => {
      if (err) {
        console.error('Error verifying max courses limit:', err.message);
      } else {
        console.log('Updated max courses limit:', row);
      }
      
      // Close the database
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed.');
        }
      });
    });
  }
);
