const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure .data directory exists for Glitch persistence
const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to the database
const dbPath = path.join(dataDir, 'university.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Update auto_logout_enabled to false
db.run('UPDATE system_settings SET value = ? WHERE key = ?', ['false', 'auto_logout_enabled'], function(err) {
  if (err) {
    console.error('Error updating auto_logout_enabled:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`Updated auto_logout_enabled to false. Rows affected: ${this.changes}`);

  // If no rows were affected, insert the setting
  if (this.changes === 0) {
    db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)', ['auto_logout_enabled', 'false'], function(err) {
      if (err) {
        console.error('Error inserting auto_logout_enabled:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('Inserted auto_logout_enabled with value false');
      db.close();
    });
  } else {
    db.close();
  }
});
