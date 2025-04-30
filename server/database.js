const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure .data directory exists for Glitch persistence
const dataDir = path.join(__dirname, '../.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create a new database or open existing one
// Use .data directory for Glitch persistence
const dbPath = path.join(dataDir, 'university.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

// Create tables if they don't exist
function createTables() {
  // Users table (for authentication)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table', err.message);
    } else {
      console.log('Users table created or already exists');

      // Create admin user if it doesn't exist
      db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
        if (err) {
          console.error('Error checking admin user', err.message);
        } else if (!row) {
          // Create admin user with password 'admin123'
          db.run("INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')", (err) => {
            if (err) {
              console.error('Error creating admin user', err.message);
            } else {
              console.log('Admin user created successfully');
            }
          });
        }
      });
    }
  });

  // Departments table
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating departments table', err.message);
    } else {
      console.log('Departments table created or already exists');
    }
  });

  // Students table (depends on users and departments)
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    name TEXT NOT NULL,
    department_id INTEGER,
    registration_number TEXT NOT NULL UNIQUE,
    semester TEXT DEFAULT 'الأول',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (department_id) REFERENCES departments (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating students table', err.message);
    } else {
      console.log('Students table created or already exists');

      // Check if semester column exists, if not add it
      db.all("PRAGMA table_info(students)", (err, rows) => {
        if (err) {
          console.error('Error checking students table schema:', err.message);
        } else {
          // Check if semester column exists
          const hasSemesterColumn = rows.some(row => row.name === 'semester');
          if (!hasSemesterColumn) {
            // Add semester column
            db.run("ALTER TABLE students ADD COLUMN semester TEXT DEFAULT 'الأول'", (err) => {
              if (err) {
                console.error('Error adding semester column to students table:', err.message);
              } else {
                console.log('Added semester column to students table');
              }
            });
          }
        }
      });
    }
  });

  // Courses table (depends on departments)
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department_id INTEGER,
    max_students INTEGER DEFAULT 30,
    semester TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating courses table', err.message);
    } else {
      console.log('Courses table created or already exists');

      // Check if semester column exists, if not add it
      db.all("PRAGMA table_info(courses)", (err, rows) => {
        if (err) {
          console.error('Error checking courses table schema:', err.message);
        } else {
          // Check if semester column exists
          const hasSemesterColumn = rows.some(row => row.name === 'semester');
          if (!hasSemesterColumn) {
            // Add semester column
            db.run("ALTER TABLE courses ADD COLUMN semester TEXT DEFAULT NULL", (err) => {
              if (err) {
                console.error('Error adding semester column to courses table:', err.message);
              } else {
                console.log('Added semester column to courses table');
              }
            });
          }
        }
      });
    }
  });

  // Prerequisites table (depends on courses)
  db.run(`CREATE TABLE IF NOT EXISTS prerequisites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    prerequisite_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id),
    FOREIGN KEY (prerequisite_id) REFERENCES courses (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating prerequisites table', err.message);
    } else {
      console.log('Prerequisites table created or already exists');
    }
  });

  // Enrollments table (depends on students and courses)
  db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    course_id INTEGER,
    status TEXT DEFAULT 'enrolled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students (id),
    FOREIGN KEY (course_id) REFERENCES courses (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating enrollments table', err.message);
    } else {
      console.log('Enrollments table created or already exists');
    }
  });

  // Completed courses table (depends on students and courses)
  db.run(`CREATE TABLE IF NOT EXISTS completed_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    course_id INTEGER,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students (id),
    FOREIGN KEY (course_id) REFERENCES courses (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating completed_courses table', err.message);
    } else {
      console.log('Completed courses table created or already exists');
    }
  });

  // System settings table
  db.run(`CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating system_settings table', err.message);
    } else {
      console.log('System settings table created or already exists');

      // Insert default settings if they don't exist
      db.get('SELECT * FROM system_settings WHERE key = ?', ['registration_open'], (err, row) => {
        if (err) {
          console.error('Error checking registration_open setting:', err.message);
        } else if (!row) {
          // Default to registration open
          db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)',
            ['registration_open', 'true'],
            (err) => {
              if (err) {
                console.error('Error inserting default registration_open setting:', err.message);
              } else {
                console.log('Default registration_open setting inserted');
              }
            }
          );
        }
      });

      // Add max_courses_limit setting if it doesn't exist
      db.get('SELECT * FROM system_settings WHERE key = ?', ['max_courses_limit'], (err, row) => {
        if (err) {
          console.error('Error checking max_courses_limit setting:', err.message);
        } else if (!row) {
          // Default to 6 courses
          db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)',
            ['max_courses_limit', '6'],
            (err) => {
              if (err) {
                console.error('Error inserting default max_courses_limit setting:', err.message);
              } else {
                console.log('Default max_courses_limit setting inserted');
              }
            }
          );
        }
      });
    }
  });
}

module.exports = db;
