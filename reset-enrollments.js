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

// Delete all enrollments
db.run('DELETE FROM enrollments', function(err) {
  if (err) {
    console.error('Error deleting enrollments:', err.message);
    process.exit(1);
  }

  console.log(`All enrollments deleted. Rows affected: ${this.changes}`);

  // Reset the auto-increment counter
  db.run('DELETE FROM sqlite_sequence WHERE name = ?', ['enrollments'], function(err) {
    if (err) {
      console.error('Error resetting auto-increment:', err.message);
    } else {
      console.log('Auto-increment counter reset for enrollments table');
    }

    // Verify that all enrollments are deleted
    db.all('SELECT * FROM enrollments', [], (err, remainingEnrollments) => {
      if (err) {
        console.error('Error verifying enrollments deletion:', err.message);
      } else {
        console.log(`Remaining enrollments after reset: ${JSON.stringify(remainingEnrollments)}`);

        if (remainingEnrollments.length > 0) {
          console.log('WARNING: Some enrollments still remain after reset!');
        } else {
          console.log('SUCCESS: All enrollments have been deleted');
        }
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
  });
});
