const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

// Use Vercel-compatible database if on Vercel, otherwise use regular database
const db = process.env.VERCEL === '1'
  ? require('./vercel-database')
  : require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: 'hadhara_university_secret',
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 86400000, // 24 hours (aumentado de 1 hora a 24 horas)
    httpOnly: true,
    secure: false // set to true in production with HTTPS
  }
}));

// Authentication middleware
const authMiddleware = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  console.log('Admin middleware called');
  console.log('Session:', req.session);

  if (!req.session) {
    console.log('No session found');
    return res.status(401).json({ error: 'No session found' });
  }

  if (!req.session.user) {
    console.log('No user in session');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('User in session:', req.session.user);

  if (req.session.user.role === 'admin') {
    console.log('User is admin, proceeding...');
    next();
  } else {
    console.log('User is not admin. Role:', req.session.user.role);
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Financial supervisor middleware
const financialSupervisorMiddleware = (req, res, next) => {
  console.log('Financial supervisor middleware called');
  console.log('Session:', req.session);

  if (!req.session) {
    console.log('No session found');
    return res.status(401).json({ error: 'No session found' });
  }

  if (!req.session.user) {
    console.log('No user in session');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('User in session:', req.session.user);

  if (req.session.user.role === 'admin' || req.session.user.role === 'financial_supervisor') {
    console.log('User is admin or financial supervisor, proceeding...');
    next();
  } else {
    console.log('User is not admin or financial supervisor. Role:', req.session.user.role);
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Routes

// Objeto para rastrear intentos fallidos de inicio de sesión
const loginAttempts = {};
console.log('Inicializando sistema de bloqueo de inicio de sesión...');

// Login route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const loginKey = `${username}:${ip}`;

  console.log(`Intento de inicio de sesión: ${username} desde ${ip}`);

  // Verificar si el usuario está bloqueado
  if (loginAttempts[loginKey] && loginAttempts[loginKey].blocked) {
    const now = Date.now();
    const blockTime = loginAttempts[loginKey].blockedTime;
    const timeLeft = Math.ceil((blockTime + 30000 - now) / 1000); // 30 segundos en milisegundos

    console.log(`Usuario ${username} bloqueado. Tiempo restante: ${timeLeft} segundos`);

    if (now < blockTime + 30000) { // Si aún está dentro del período de bloqueo de 30 segundos
      return res.status(429).json({
        error: 'Too many failed attempts',
        message: `تم حظر تسجيل الدخول مؤقتًا. يرجى المحاولة بعد ${timeLeft} ثانية`,
        timeLeft: timeLeft
      });
    } else {
      // Si ha pasado el tiempo de bloqueo, reiniciar los intentos
      console.log(`Tiempo de bloqueo expirado para ${username}. Reiniciando contador.`);
      loginAttempts[loginKey] = {
        count: 0,
        blocked: false,
        blockedTime: null
      };
    }
  }

  // Inicializar el contador de intentos si no existe
  if (!loginAttempts[loginKey]) {
    console.log(`Inicializando contador para ${username}`);
    loginAttempts[loginKey] = {
      count: 0,
      blocked: false,
      blockedTime: null
    };
  }

  // Buscar el usuario por nombre de usuario (case sensitive)
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error(`Error al buscar usuario ${username}:`, err.message);
      return res.status(500).json({ error: err.message });
    }

    // Verificar si el usuario existe y la contraseña coincide exactamente (case sensitive)
    if (!user || user.password !== password) {
      // Incrementar el contador de intentos fallidos
      loginAttempts[loginKey].count += 1;
      console.log(`Intento fallido para ${username}. Intentos: ${loginAttempts[loginKey].count}`);

      // Si hay 3 o más intentos fallidos, bloquear al usuario
      if (loginAttempts[loginKey].count >= 3) {
        loginAttempts[loginKey].blocked = true;
        loginAttempts[loginKey].blockedTime = Date.now();
        console.log(`Usuario ${username} bloqueado por 30 segundos.`);

        return res.status(429).json({
          error: 'Too many failed attempts',
          message: 'تم حظر تسجيل الدخول مؤقتًا. يرجى المحاولة بعد 30 ثانية',
          timeLeft: 30
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        attemptsLeft: 3 - loginAttempts[loginKey].count
      });
    }

    // Credenciales correctas, reiniciar el contador de intentos
    console.log(`Inicio de sesión exitoso para ${username}. Reiniciando contador.`);
    loginAttempts[loginKey] = {
      count: 0,
      blocked: false,
      blockedTime: null
    };

    // Set user in session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.json({ success: true, user: req.session.user });
  });
});

// Logout route
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/user', authMiddleware, (req, res) => {
  res.json({ user: req.session.user });
});

// Get admin user details
app.get('/api/admin/profile', adminMiddleware, (req, res) => {
  db.get('SELECT id, username, password FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  });
});

// Get all financial supervisors
app.get('/api/admin/financial-supervisors', adminMiddleware, (req, res) => {
  console.log('Getting financial supervisors...');

  // First, check if the user is an admin
  if (req.session.user.role !== 'admin') {
    console.log('User is not an admin. Role:', req.session.user.role);
    return res.status(403).json({ error: 'Forbidden. Only admins can access this resource.' });
  }

  // Log the query we're about to execute
  console.log('Executing query: SELECT id, username, created_at FROM users WHERE role = ?', ['financial_supervisor']);

  try {
    // Simplified approach: directly query for financial supervisors
    db.all('SELECT id, username, created_at FROM users WHERE role = ?', ['financial_supervisor'], (err, users) => {
      if (err) {
        console.error('Error getting financial supervisors:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('Found financial supervisors:', users);

      // Ensure users is an array
      if (!Array.isArray(users)) {
        console.error('Users is not an array:', users);
        users = [];
      }

      // Format the created_at date if it exists and ensure all required fields are present
      const formattedUsers = users.map(user => {
        // Create a new object with default values
        const formattedUser = {
          id: user.id || 0,
          username: user.username || 'unknown',
          created_at: new Date().toISOString() // Default value
        };

        // Try to format the date if it exists
        if (user.created_at) {
          try {
            const date = new Date(user.created_at);
            if (!isNaN(date.getTime())) {
              formattedUser.created_at = date.toISOString();
            }
          } catch (e) {
            console.error('Error formatting date:', e);
            // Keep the default value
          }
        }

        return formattedUser;
      });

      res.json({ users: formattedUsers });
    });
  } catch (error) {
    console.error('Unexpected error in financial supervisors route:', error);
    res.status(500).json({ error: 'Unexpected server error: ' + error.message });
  }
});

// Add new financial supervisor
app.post('/api/admin/financial-supervisors', adminMiddleware, (req, res) => {
  console.log('Adding new financial supervisor...');

  try {
    // First, check if the user is an admin
    if (req.session.user.role !== 'admin') {
      console.log('User is not an admin. Role:', req.session.user.role);
      return res.status(403).json({ error: 'Forbidden. Only admins can access this resource.' });
    }

    const { username, password } = req.body;
    console.log('Request body:', { username, password: password ? '******' : 'not provided' });

    // Validate input
    if (!username || !password) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    // Check if username already exists
    console.log('Checking if username already exists:', username);
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
      if (err) {
        console.error('Error checking existing user:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        console.log('Username already exists:', username);
        return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
      }

      // Create new financial supervisor with current timestamp
      const now = new Date().toISOString();
      console.log('Creating new financial supervisor with username:', username);

      // Use a simpler query without the datetime function
      db.run('INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
        [username, password, 'financial_supervisor', now],
        function(err) {
          if (err) {
            console.error('Error creating financial supervisor:', err.message);
            return res.status(500).json({ error: err.message });
          }

          console.log('Financial supervisor created successfully with ID:', this.lastID);
          res.json({
            success: true,
            user: {
              id: this.lastID,
              username,
              role: 'financial_supervisor',
              created_at: now
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Unexpected error in add financial supervisor route:', error);
    res.status(500).json({ error: 'Unexpected server error: ' + error.message });
  }
});

// Update financial supervisor
app.put('/api/admin/financial-supervisors/:id', adminMiddleware, (req, res) => {
  console.log('Updating financial supervisor...');

  // First, check if the user is an admin
  if (req.session.user.role !== 'admin') {
    console.log('User is not an admin. Role:', req.session.user.role);
    return res.status(403).json({ error: 'Forbidden. Only admins can access this resource.' });
  }

  const supervisorId = req.params.id;
  const { username, password } = req.body;

  console.log('Updating supervisor ID:', supervisorId);
  console.log('Request body:', { username, password: password ? '******' : 'not provided' });

  // Validate input
  if (!username || !password) {
    console.log('Validation failed: Missing required fields');
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // Check if supervisor exists
  console.log('Checking if supervisor exists:', supervisorId);
  db.get('SELECT * FROM users WHERE id = ? AND role = ?', [supervisorId, 'financial_supervisor'], (err, supervisor) => {
    if (err) {
      console.error('Error checking supervisor:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!supervisor) {
      console.log('Supervisor not found:', supervisorId);
      return res.status(404).json({ error: 'المشرف المالي غير موجود' });
    }

    console.log('Found supervisor:', supervisor);

    // Check if username already exists (except for current supervisor)
    console.log('Checking if username already exists (except current supervisor):', username);
    db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, supervisorId], (err, existingUser) => {
      if (err) {
        console.error('Error checking existing user:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        console.log('Username already exists:', username);
        return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
      }

      // Update supervisor
      console.log('Updating supervisor with username:', username);
      db.run('UPDATE users SET username = ?, password = ? WHERE id = ?',
        [username, password, supervisorId],
        function(err) {
          if (err) {
            console.error('Error updating supervisor:', err.message);
            return res.status(500).json({ error: err.message });
          }

          console.log('Supervisor updated successfully:', supervisorId);
          res.json({
            success: true,
            user: {
              id: supervisorId,
              username,
              role: 'financial_supervisor'
            }
          });
        }
      );
    });
  });
});

// Delete financial supervisor
app.delete('/api/admin/financial-supervisors/:id', adminMiddleware, (req, res) => {
  console.log('Deleting financial supervisor...');

  // First, check if the user is an admin
  if (req.session.user.role !== 'admin') {
    console.log('User is not an admin. Role:', req.session.user.role);
    return res.status(403).json({ error: 'Forbidden. Only admins can access this resource.' });
  }

  const supervisorId = req.params.id;
  console.log('Deleting supervisor ID:', supervisorId);

  // Check if supervisor exists
  console.log('Checking if supervisor exists:', supervisorId);
  db.get('SELECT * FROM users WHERE id = ? AND role = ?', [supervisorId, 'financial_supervisor'], (err, supervisor) => {
    if (err) {
      console.error('Error checking supervisor:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!supervisor) {
      console.log('Supervisor not found:', supervisorId);
      return res.status(404).json({ error: 'المشرف المالي غير موجود' });
    }

    console.log('Found supervisor:', supervisor);

    // Delete supervisor
    console.log('Deleting supervisor:', supervisorId);
    db.run('DELETE FROM users WHERE id = ?', [supervisorId], function(err) {
      if (err) {
        console.error('Error deleting supervisor:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('Supervisor deleted successfully:', supervisorId);
      res.json({
        success: true,
        message: 'تم حذف المشرف المالي بنجاح'
      });
    });
  });
});

// Update admin credentials
app.put('/api/admin/profile', adminMiddleware, (req, res) => {
  const { currentPassword, username, password } = req.body;

  // Validate input
  if (!currentPassword || !username || !password) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // First verify the current password
  db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // Check if current password is correct (case sensitive)
    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'رقم المنظومة الحالي (كلمة المرور الحالية) غير صحيح' });
    }

    // Check if username already exists (except for current user)
    db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.session.user.id], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
      }

      // Update user credentials
      db.run('UPDATE users SET username = ?, password = ? WHERE id = ?',
        [username, password, req.session.user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Update session
          req.session.user.username = username;

          res.json({
            success: true,
            user: {
              id: req.session.user.id,
              username,
              role: req.session.user.role
            }
          });
        }
      );
    });
  });
});

// Admin routes

// Get all students
app.get('/api/admin/students', adminMiddleware, (req, res) => {
  db.all(`
    SELECT s.*, d.name as department_name
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
  `, (err, students) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Ensure all students have a semester value and convert department_id to string
    students.forEach(student => {
      if (!student.semester) {
        student.semester = 'الأول';
      }
      // تحويل معرف التخصص إلى نص
      if (student.department_id !== null && student.department_id !== undefined) {
        student.department_id = String(student.department_id);
      }
    });

    console.log('Sending students with string department_ids:',
      students.map(s => ({ id: s.id, name: s.name, department_id: s.department_id, type: typeof s.department_id })));

    res.json({ students });
  });
});

// Get a single student by ID
app.get('/api/admin/students/:id', financialSupervisorMiddleware, (req, res) => {
  const studentId = req.params.id;

  console.log('Getting student by ID:', studentId);
  console.log('User role:', req.session.user.role);

  db.get(`
    SELECT s.*, d.name as department_name, u.username, u.password
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `, [studentId], (err, student) => {
    if (err) {
      console.error('Error getting student:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      console.log('Student not found:', studentId);
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    console.log('Found student:', student.name);

    // If semester is not set, default to "الأول"
    if (!student.semester) {
      student.semester = 'الأول';
    }

    // Ensure group_name is at least an empty string if null
    if (student.group_name === null || student.group_name === undefined) {
      student.group_name = '';
    }

    res.json({ student });
  });
});

// Add student
app.post('/api/admin/students', adminMiddleware, (req, res) => {
  const { name, student_id, department_id, registration_number, semester, group_name } = req.body;

  console.log('Received student data:', { name, student_id, department_id, registration_number, semester, group_name });

  // Validate input
  if (!name || !student_id || !department_id || !registration_number) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // Default semester to "الأول" if not provided
  const studentSemester = semester || 'الأول';

  // Check if department exists
  db.get('SELECT id FROM departments WHERE id = ?', [department_id], (err, department) => {
    if (err) {
      console.error('Error checking department:', err.message);
      return res.status(500).json({ error: 'خطأ في التحقق من التخصص: ' + err.message });
    }

    if (!department) {
      return res.status(400).json({ error: 'التخصص غير موجود' });
    }

    // Check if student_id already exists
    db.get('SELECT id FROM students WHERE student_id = ?', [student_id], (err, existingStudent) => {
      if (err) {
        console.error('Error checking existing student:', err.message);
        return res.status(500).json({ error: 'خطأ في التحقق من وجود الطالب: ' + err.message });
      }

      if (existingStudent) {
        return res.status(400).json({ error: 'رقم القيد مستخدم بالفعل' });
      }

      // Check if registration_number already exists
      db.get('SELECT id FROM students WHERE registration_number = ?', [registration_number], (err, existingReg) => {
        if (err) {
          console.error('Error checking existing registration:', err.message);
          return res.status(500).json({ error: 'خطأ في التحقق من رقم المنظومة: ' + err.message });
        }

        if (existingReg) {
          return res.status(400).json({ error: 'رقم المنظومة مستخدم بالفعل' });
        }

        // First create user
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          [student_id, registration_number, 'student'],
          function(err) {
            if (err) {
              console.error('Error creating user:', err.message);
              return res.status(500).json({ error: 'خطأ في إنشاء المستخدم: ' + err.message });
            }

            const user_id = this.lastID;
            console.log('Created user with ID:', user_id);

            // Then create student
            db.run('INSERT INTO students (name, student_id, department_id, registration_number, user_id, semester, group_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [name, student_id, department_id, registration_number, user_id, studentSemester, group_name || null],
              function(err) {
                if (err) {
                  console.error('Error creating student:', err.message);

                  // Try to delete the user if student creation fails
                  db.run('DELETE FROM users WHERE id = ?', [user_id], (delErr) => {
                    if (delErr) {
                      console.error('Error deleting user after student creation failed:', delErr.message);
                    }
                  });

                  return res.status(500).json({ error: 'خطأ في إنشاء الطالب: ' + err.message });
                }

                console.log('Created student with ID:', this.lastID);

                res.json({
                  success: true,
                  student: {
                    id: this.lastID,
                    name,
                    student_id,
                    department_id,
                    registration_number,
                    semester: studentSemester,

                    user_id
                  }
                });
              }
            );
          }
        );
      });
    });
  });
});

// Update student
app.put('/api/admin/students/:id', adminMiddleware, (req, res) => {
  const studentId = req.params.id;
  const { name, department_id, student_id, registration_number, semester, group_name } = req.body;

  console.log('Updating student:', studentId, { name, department_id, student_id, registration_number, semester, group_name });

  // Validate input
  if (!name || !student_id || !department_id || !registration_number) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // Default semester to "الأول" if not provided
  const studentSemester = semester || 'الأول';

  // Get current student data
  db.get('SELECT * FROM students WHERE id = ?', [studentId], (err, currentStudent) => {
    if (err) {
      console.error('Error getting current student:', err.message);
      return res.status(500).json({ error: 'خطأ في الحصول على بيانات الطالب: ' + err.message });
    }

    if (!currentStudent) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // Check if department exists
    db.get('SELECT id FROM departments WHERE id = ?', [department_id], (err, department) => {
      if (err) {
        console.error('Error checking department:', err.message);
        return res.status(500).json({ error: 'خطأ في التحقق من التخصص: ' + err.message });
      }

      if (!department) {
        return res.status(400).json({ error: 'التخصص غير موجود' });
      }

      // Check if student_id is already used by another student
      db.get('SELECT id FROM students WHERE student_id = ? AND id != ?', [student_id, studentId], (err, existingStudent) => {
        if (err) {
          console.error('Error checking existing student:', err.message);
          return res.status(500).json({ error: 'خطأ في التحقق من وجود الطالب: ' + err.message });
        }

        if (existingStudent) {
          return res.status(400).json({ error: 'رقم القيد مستخدم بالفعل' });
        }

        // Check if registration_number is already used by another student
        db.get('SELECT id FROM students WHERE registration_number = ? AND id != ?', [registration_number, studentId], (err, existingReg) => {
          if (err) {
            console.error('Error checking existing registration:', err.message);
            return res.status(500).json({ error: 'خطأ في التحقق من رقم المنظومة: ' + err.message });
          }

          if (existingReg) {
            return res.status(400).json({ error: 'رقم المنظومة مستخدم بالفعل' });
          }

          // Update student
          db.run('UPDATE students SET name = ?, student_id = ?, department_id = ?, registration_number = ?, semester = ?, group_name = ? WHERE id = ?',
            [name, student_id, department_id, registration_number, studentSemester, group_name, studentId],
            function(err) {
              if (err) {
                console.error('Error updating student:', err.message);
                return res.status(500).json({ error: 'خطأ في تحديث بيانات الطالب: ' + err.message });
              }

              // Update user credentials
              db.run('UPDATE users SET username = ?, password = ? WHERE id = ?',
                [student_id, registration_number, currentStudent.user_id],
                function(err) {
                  if (err) {
                    console.error('Error updating user:', err.message);
                    return res.status(500).json({ error: 'خطأ في تحديث بيانات المستخدم: ' + err.message });
                  }

                  res.json({
                    success: true,
                    student: {
                      id: studentId,
                      name,
                      student_id,
                      department_id,
                      registration_number,
                      semester: studentSemester,

                      user_id: currentStudent.user_id
                    }
                  });
                }
              );
            }
          );
        });
      });
    });
  });
});

// Delete student
app.delete('/api/admin/students/:id', adminMiddleware, (req, res) => {
  const studentId = req.params.id;
  const forceDelete = req.query.force === 'true';

  console.log('Deleting student:', studentId, 'Force delete:', forceDelete);

  // Check if student exists
  db.get('SELECT * FROM students WHERE id = ?', [studentId], (err, student) => {
    if (err) {
      console.error('Error checking student:', err.message);
      return res.status(500).json({ error: 'خطأ في التحقق من وجود الطالب: ' + err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // Check if student has enrollments or completed courses
    const checkRelatedData = (callback) => {
      // Check enrollments
      db.get('SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?', [studentId], (err, enrollmentsResult) => {
        if (err) {
          console.error('Error checking enrollments:', err.message);
          return callback(err);
        }

        // Check completed courses
        db.get('SELECT COUNT(*) as count FROM completed_courses WHERE student_id = ?', [studentId], (err, completedResult) => {
          if (err) {
            console.error('Error checking completed courses:', err.message);
            return callback(err);
          }

          const hasEnrollments = enrollmentsResult.count > 0;
          const hasCompletedCourses = completedResult.count > 0;

          callback(null, {
            hasEnrollments,
            hasCompletedCourses,
            enrollmentsCount: enrollmentsResult.count,
            completedCoursesCount: completedResult.count
          });
        });
      });
    };

    // Check if student has related data
    checkRelatedData((err, relatedData) => {
      if (err) {
        return res.status(500).json({ error: 'خطأ في التحقق من بيانات الطالب: ' + err.message });
      }

      // If student has related data and force delete is not enabled, return warning
      if ((relatedData.hasEnrollments || relatedData.hasCompletedCourses) && !forceDelete) {
        return res.status(409).json({
          warning: true,
          message: 'الطالب لديه بيانات مرتبطة. هل أنت متأكد من حذفه؟',
          details: {
            enrollments: relatedData.enrollmentsCount,
            completedCourses: relatedData.completedCoursesCount
          }
        });
      }

      // Proceed with deletion
      const deleteStudentData = () => {
        // Delete enrollments if any
        if (relatedData.hasEnrollments) {
          db.run('DELETE FROM enrollments WHERE student_id = ?', [studentId], (err) => {
            if (err) {
              console.error('Error deleting student enrollments:', err.message);
              // Continue with deletion even if this fails
            } else {
              console.log(`Deleted ${relatedData.enrollmentsCount} enrollments for student ID:`, studentId);
            }
          });
        }

        // Delete completed courses if any
        if (relatedData.hasCompletedCourses) {
          db.run('DELETE FROM completed_courses WHERE student_id = ?', [studentId], (err) => {
            if (err) {
              console.error('Error deleting student completed courses:', err.message);
              // Continue with deletion even if this fails
            } else {
              console.log(`Deleted ${relatedData.completedCoursesCount} completed courses for student ID:`, studentId);
            }
          });
        }

        // Get user_id for the student
        const userId = student.user_id;

        // Delete student
        db.run('DELETE FROM students WHERE id = ?', [studentId], function(err) {
          if (err) {
            console.error('Error deleting student:', err.message);
            return res.status(500).json({ error: 'خطأ في حذف الطالب: ' + err.message });
          }

          // Delete user
          if (userId) {
            db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
              if (err) {
                console.error('Error deleting user:', err.message);
                // We still consider the operation successful even if user deletion fails
                console.log('Deleted student with ID:', studentId, 'but failed to delete user with ID:', userId);
              } else {
                console.log('Deleted student with ID:', studentId, 'and user with ID:', userId);
              }

              res.json({ success: true });
            });
          } else {
            console.log('Deleted student with ID:', studentId, 'with no associated user');
            res.json({ success: true });
          }
        });
      };

      // Execute deletion
      deleteStudentData();
    });
  });
});

// Get student courses (completed and enrolled)
app.get('/api/admin/students/:id/courses', financialSupervisorMiddleware, (req, res) => {
  const studentId = req.params.id;

  console.log('Getting courses for student ID:', studentId);
  console.log('User role:', req.session.user.role);

  // Get student info with department information only
  db.get(`
    SELECT s.*, d.name as department_name
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.id = ?
  `, [studentId], (err, student) => {
    if (err) {
      console.error('Error fetching student info:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      console.log('Student not found:', studentId);
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    console.log('Found student:', student.name);

    // Get completed courses
    db.all(`
      SELECT
        cc.id,
        cc.student_id,
        cc.course_id,
        cc.completed_at,
        c.course_code,
        c.name as course_name,
        c.semester,
        d.name as department_name
      FROM completed_courses cc
      JOIN courses c ON cc.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE cc.student_id = ?
    `, [studentId], (err, completedCourses) => {
      if (err) {
        console.error('Error fetching completed courses:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('Found completed courses:', completedCourses.length);

      // Get enrolled courses
      db.all(`
        SELECT
          e.id as enrollment_id,
          e.payment_status,
          e.created_at,
          e.group_id,
          e.course_id,
          c.course_code,
          c.name as course_name,
          c.semester,
          d.name as department_name,
          g.group_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN course_groups g ON e.group_id = g.id
        WHERE e.student_id = ?
      `, [studentId], (err, enrolledCourses) => {
        if (err) {
          console.error('Error fetching enrolled courses:', err.message);
          return res.status(500).json({ error: err.message });
        }

        console.log('Found enrolled courses:', enrolledCourses.length);

        res.json({
          student,
          completedCourses,
          enrolledCourses
        });
      });
    });
  });
});

// Get all students with their enrollments (for payment management)
app.get('/api/admin/students-enrollments', financialSupervisorMiddleware, (req, res) => {
  console.log('Getting all students with enrollments for payment management');
  console.log('User role:', req.session.user.role);

  // Get all students with department information
  db.all(`
    SELECT s.*, d.name as department_name
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
  `, (err, students) => {
    if (err) {
      console.error('Error fetching students:', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log(`Found ${students.length} students`);

    // Use Promise.all to fetch enrollments for all students in parallel
    Promise.all(students.map(student => {
      return new Promise((resolve, reject) => {
        // Get enrolled courses for each student
        db.all(`
          SELECT
            e.id as enrollment_id,
            e.payment_status,
            e.group_id,
            e.course_id,
            c.name as course_name,
            c.course_code,
            c.semester,
            d.name as department_name,
            g.group_name
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          LEFT JOIN departments d ON c.department_id = d.id
          LEFT JOIN course_groups g ON e.group_id = g.id
          WHERE e.student_id = ?
        `, [student.id], (err, enrollments) => {
          if (err) {
            console.error(`Error fetching enrollments for student ${student.id}:`, err.message);
            reject(err);
            return;
          }

          // Log the first enrollment for debugging
          if (enrollments && enrollments.length > 0) {
            console.log(`Estudiante ${student.id} tiene ${enrollments.length} inscripciones`);
            console.log(`Primera inscripción:`, JSON.stringify(enrollments[0]));
          } else {
            console.log(`Estudiante ${student.id} no tiene inscripciones`);
          }

          // Add enrollments to student object
          student.enrollments = enrollments;
          resolve(student);
        });
      });
    }))
    .then(studentsWithEnrollments => {
      console.log('Successfully fetched enrollments for all students');
      res.json({ students: studentsWithEnrollments });
    })
    .catch(error => {
      console.error('Error fetching enrollments:', error.message);
      res.status(500).json({ error: error.message });
    });
  });
});

// Get all departments (no auth required for this endpoint to ensure it works everywhere)
app.get('/api/admin/departments', (req, res) => {
  console.log('Fetching all departments');
  db.all('SELECT * FROM departments', (err, departments) => {
    if (err) {
      console.error('Error fetching departments:', err.message);
      return res.status(500).json({ error: err.message });
    }

    // تحويل معرفات التخصصات إلى نصوص
    departments.forEach(department => {
      if (department.id !== null && department.id !== undefined) {
        department.id = String(department.id);
      }
    });

    console.log('Departments fetched:', departments.length);
    console.log('Departments with string IDs:',
      departments.map(d => ({ id: d.id, name: d.name, type: typeof d.id })));

    res.json({ departments });
  });
});

// Get a single department by ID
app.get('/api/admin/departments/:id', adminMiddleware, (req, res) => {
  const departmentId = req.params.id;

  db.get('SELECT * FROM departments WHERE id = ?', [departmentId], (err, department) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!department) {
      return res.status(404).json({ error: 'التخصص غير موجود' });
    }

    res.json({ department });
  });
});

// Add department
app.post('/api/admin/departments', adminMiddleware, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'اسم التخصص مطلوب' });
  }

  // Check if department name already exists
  db.get('SELECT id FROM departments WHERE name = ?', [name], (err, existingDepartment) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existingDepartment) {
      return res.status(400).json({ error: 'اسم التخصص مستخدم بالفعل' });
    }

    db.run('INSERT INTO departments (name) VALUES (?)', [name], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ success: true, department: { id: this.lastID, name } });
    });
  });
});

// Update department
app.put('/api/admin/departments/:id', adminMiddleware, (req, res) => {
  const departmentId = req.params.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'اسم التخصص مطلوب' });
  }

  // Check if department exists
  db.get('SELECT id FROM departments WHERE id = ?', [departmentId], (err, department) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!department) {
      return res.status(404).json({ error: 'التخصص غير موجود' });
    }

    // Check if department name already exists (excluding current department)
    db.get('SELECT id FROM departments WHERE name = ? AND id != ?', [name, departmentId], (err, existingDepartment) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingDepartment) {
        return res.status(400).json({ error: 'اسم التخصص مستخدم بالفعل' });
      }

      db.run('UPDATE departments SET name = ? WHERE id = ?', [name, departmentId], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ success: true, department: { id: departmentId, name } });
      });
    });
  });
});

// Delete department
app.delete('/api/admin/departments/:id', adminMiddleware, (req, res) => {
  const departmentId = req.params.id;

  console.log('Deleting department:', departmentId);

  // Check if department exists
  db.get('SELECT id FROM departments WHERE id = ?', [departmentId], (err, department) => {
    if (err) {
      console.error('Error checking department:', err.message);
      return res.status(500).json({ error: 'خطأ في التحقق من وجود التخصص: ' + err.message });
    }

    if (!department) {
      return res.status(404).json({ error: 'التخصص غير موجود' });
    }

    // Check if department has students
    db.get('SELECT COUNT(*) as count FROM students WHERE department_id = ?', [departmentId], (err, studentsResult) => {
      if (err) {
        console.error('Error checking students:', err.message);
        return res.status(500).json({ error: 'خطأ في التحقق من الطلاب: ' + err.message });
      }

      if (studentsResult.count > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف التخصص لأنه مرتبط ببعض الطلاب' });
      }

      // Check if department has courses
      db.get('SELECT COUNT(*) as count FROM courses WHERE department_id = ?', [departmentId], (err, coursesResult) => {
        if (err) {
          console.error('Error checking courses:', err.message);
          return res.status(500).json({ error: 'خطأ في التحقق من المواد: ' + err.message });
        }

        if (coursesResult.count > 0) {
          return res.status(400).json({ error: 'لا يمكن حذف التخصص لأنه مرتبط ببعض المواد' });
        }

        // Delete department
        db.run('DELETE FROM departments WHERE id = ?', [departmentId], function(err) {
          if (err) {
            console.error('Error deleting department:', err.message);
            return res.status(500).json({ error: 'خطأ في حذف التخصص: ' + err.message });
          }

          console.log('Deleted department with ID:', departmentId);

          res.json({ success: true });
        });
      });
    });
  });
});

// Get all courses
app.get('/api/admin/courses', adminMiddleware, (req, res) => {
  db.all(`
    SELECT c.*, d.name as department_name
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
  `, (err, courses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // تحويل معرف التخصص إلى نص
    courses.forEach(course => {
      if (course.department_id !== null && course.department_id !== undefined) {
        course.department_id = String(course.department_id);
      }
    });

    console.log('Sending courses with string department_ids:',
      courses.map(c => ({ id: c.id, name: c.name, department_id: c.department_id, type: typeof c.department_id })));

    res.json({ courses });
  });
});

// Get a single course by ID
app.get('/api/admin/courses/:id', adminMiddleware, (req, res) => {
  const courseId = req.params.id;

  db.get(`
    SELECT c.*, d.name as department_name
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `, [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    res.json({ course });
  });
});

// Get course prerequisites
app.get('/api/admin/courses/:id/prerequisites', adminMiddleware, (req, res) => {
  const courseId = req.params.id;

  // Get course info
  db.get(`
    SELECT c.*, d.name as department_name
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `, [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    // Get prerequisites
    db.all(`
      SELECT p.*, c.course_code, c.name, c.department_id, d.name as department_name
      FROM prerequisites p
      JOIN courses c ON p.prerequisite_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE p.course_id = ?
    `, [courseId], (err, prerequisites) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        course,
        prerequisites
      });
    });
  });
});

// Add course
app.post('/api/admin/courses', adminMiddleware, (req, res) => {
  const { course_code, name, department_id, semester } = req.body;
  // الحد الأقصى للطلبة يتم حسابه تلقائيًا من مجموع المجموعات
  const max_students = 0;

  console.log('Received course data:', { course_code, name, department_id, semester, max_students: 'auto-calculated (0)' });

  // Validate input
  if (!course_code || !name || !department_id) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // Check if department exists
  db.get('SELECT id FROM departments WHERE id = ?', [department_id], (err, department) => {
    if (err) {
      console.error('Error checking department:', err.message);
      return res.status(500).json({ error: 'خطأ في التحقق من التخصص: ' + err.message });
    }

    if (!department) {
      return res.status(400).json({ error: 'التخصص غير موجود' });
    }

    // Check if course_code already exists
    db.get('SELECT id FROM courses WHERE course_code = ?', [course_code], (err, existingCourse) => {
      if (err) {
        console.error('Error checking existing course:', err.message);
        return res.status(500).json({ error: 'خطأ في التحقق من وجود المادة: ' + err.message });
      }

      if (existingCourse) {
        return res.status(400).json({ error: 'رمز المادة مستخدم بالفعل' });
      }

      // Add course
      db.run('INSERT INTO courses (course_code, name, department_id, max_students, semester) VALUES (?, ?, ?, ?, ?)',
        [course_code, name, department_id, max_students, semester],
        function(err) {
          if (err) {
            console.error('Error creating course:', err.message);
            return res.status(500).json({ error: 'خطأ في إنشاء المادة: ' + err.message });
          }

          console.log('Created course with ID:', this.lastID);

          res.json({
            success: true,
            course: {
              id: this.lastID,
              course_code,
              name,
              department_id,
              max_students,
              semester
            }
          });
        }
      );
    });
  });
});

// Update course
app.put('/api/admin/courses/:id', adminMiddleware, (req, res) => {
  const courseId = req.params.id;
  const { course_code, name, department_id, semester } = req.body;
  // الحد الأقصى للطلبة يتم حسابه تلقائيًا من مجموع المجموعات
  // نحتفظ بالقيمة الحالية ولا نقوم بتغييرها من خلال النموذج

  console.log('Updating course:', courseId, { course_code, name, department_id, semester });

  // Validate input
  if (!course_code || !name || !department_id) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // Check if course exists
  db.get('SELECT id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      console.error('Error checking course:', err.message);
      return res.status(500).json({ error: 'خطأ في التحقق من وجود المادة: ' + err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    // Check if department exists
    db.get('SELECT id FROM departments WHERE id = ?', [department_id], (err, department) => {
      if (err) {
        console.error('Error checking department:', err.message);
        return res.status(500).json({ error: 'خطأ في التحقق من التخصص: ' + err.message });
      }

      if (!department) {
        return res.status(400).json({ error: 'التخصص غير موجود' });
      }

      // Check if course_code already exists (excluding current course)
      db.get('SELECT id FROM courses WHERE course_code = ? AND id != ?', [course_code, courseId], (err, existingCourse) => {
        if (err) {
          console.error('Error checking existing course:', err.message);
          return res.status(500).json({ error: 'خطأ في التحقق من وجود المادة: ' + err.message });
        }

        if (existingCourse) {
          return res.status(400).json({ error: 'رمز المادة مستخدم بالفعل' });
        }

        // Get current max_students value
        db.get('SELECT max_students FROM courses WHERE id = ?', [courseId], (err, currentCourse) => {
          if (err) {
            console.error('Error getting current course data:', err.message);
            return res.status(500).json({ error: 'خطأ في الحصول على بيانات المادة: ' + err.message });
          }

          const currentMaxStudents = currentCourse ? currentCourse.max_students : 0;

          // Update course
          db.run('UPDATE courses SET course_code = ?, name = ?, department_id = ?, semester = ? WHERE id = ?',
            [course_code, name, department_id, semester, courseId],
            function(err) {
              if (err) {
                console.error('Error updating course:', err.message);
                return res.status(500).json({ error: 'خطأ في تحديث المادة: ' + err.message });
              }

              console.log('Updated course with ID:', courseId);

              res.json({
                success: true,
                course: {
                  id: courseId,
                  course_code,
                  name,
                  department_id,
                  max_students: currentMaxStudents,
                  semester
                }
              });
            }
          );
        });
      });
    });
  });
});

// Delete course
app.delete('/api/admin/courses/:id', adminMiddleware, (req, res) => {
  const courseId = req.params.id;

  console.log('Deleting course:', courseId);

  // Check if course exists
  db.get('SELECT id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      console.error('Error checking course:', err.message);
      return res.status(500).json({ error: 'خطأ في التحقق من وجود المادة: ' + err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    // Check if course has enrollments
    db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [courseId], (err, enrollmentsResult) => {
      if (err) {
        console.error('Error checking enrollments:', err.message);
        return res.status(500).json({ error: 'خطأ في التحقق من التسجيلات: ' + err.message });
      }

      if (enrollmentsResult.count > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف المادة لأنها مسجلة لدى بعض الطلاب' });
      }

      // Check if course has completed courses
      db.get('SELECT COUNT(*) as count FROM completed_courses WHERE course_id = ?', [courseId], (err, completedResult) => {
        if (err) {
          console.error('Error checking completed courses:', err.message);
          return res.status(500).json({ error: 'خطأ في التحقق من المواد المنجزة: ' + err.message });
        }

        if (completedResult.count > 0) {
          return res.status(400).json({ error: 'لا يمكن حذف المادة لأنها منجزة لدى بعض الطلاب' });
        }

        // Delete prerequisites where this course is a prerequisite
        db.run('DELETE FROM prerequisites WHERE prerequisite_id = ?', [courseId], function(err) {
          if (err) {
            console.error('Error deleting prerequisites:', err.message);
            return res.status(500).json({ error: 'خطأ في حذف المتطلبات: ' + err.message });
          }

          // Delete prerequisites for this course
          db.run('DELETE FROM prerequisites WHERE course_id = ?', [courseId], function(err) {
            if (err) {
              console.error('Error deleting course prerequisites:', err.message);
              return res.status(500).json({ error: 'خطأ في حذف متطلبات المادة: ' + err.message });
            }

            // Delete course
            db.run('DELETE FROM courses WHERE id = ?', [courseId], function(err) {
              if (err) {
                console.error('Error deleting course:', err.message);
                return res.status(500).json({ error: 'خطأ في حذف المادة: ' + err.message });
              }

              console.log('Deleted course with ID:', courseId);

              res.json({ success: true });
            });
          });
        });
      });
    });
  });
});

// Add prerequisite
app.post('/api/admin/prerequisites', adminMiddleware, (req, res) => {
  const { course_id, prerequisite_id } = req.body;

  // Validate input
  if (!course_id || !prerequisite_id) {
    return res.status(400).json({ error: 'المادة والمادة المتطلبة مطلوبة' });
  }

  // Check if course exists
  db.get('SELECT id FROM courses WHERE id = ?', [course_id], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    // Check if prerequisite course exists
    db.get('SELECT id FROM courses WHERE id = ?', [prerequisite_id], (err, prerequisiteCourse) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!prerequisiteCourse) {
        return res.status(404).json({ error: 'المادة المتطلبة غير موجودة' });
      }

      // Check if prerequisite already exists
      db.get('SELECT id FROM prerequisites WHERE course_id = ? AND prerequisite_id = ?',
        [course_id, prerequisite_id],
        (err, existingPrerequisite) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (existingPrerequisite) {
            return res.status(400).json({ error: 'المتطلب موجود بالفعل' });
          }

          // Check if adding this prerequisite would create a circular dependency
          db.get('SELECT id FROM prerequisites WHERE course_id = ? AND prerequisite_id = ?',
            [prerequisite_id, course_id],
            (err, circularDependency) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              if (circularDependency) {
                return res.status(400).json({ error: 'لا يمكن إضافة متطلب متبادل' });
              }

              // Add prerequisite
              db.run('INSERT INTO prerequisites (course_id, prerequisite_id) VALUES (?, ?)',
                [course_id, prerequisite_id],
                function(err) {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  res.json({
                    success: true,
                    prerequisite: {
                      id: this.lastID,
                      course_id,
                      prerequisite_id
                    }
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// Delete prerequisite
app.delete('/api/admin/prerequisites/:id', adminMiddleware, (req, res) => {
  const prerequisiteId = req.params.id;

  // Check if prerequisite exists
  db.get('SELECT id FROM prerequisites WHERE id = ?', [prerequisiteId], (err, prerequisite) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!prerequisite) {
      return res.status(404).json({ error: 'المتطلب غير موجود' });
    }

    // Delete prerequisite
    db.run('DELETE FROM prerequisites WHERE id = ?', [prerequisiteId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ success: true });
    });
  });
});

// Mark course as completed for student
app.post('/api/admin/completed-courses', adminMiddleware, (req, res) => {
  const { student_id, course_id } = req.body;

  // Validate input
  if (!student_id || !course_id) {
    return res.status(400).json({ error: 'معرف الطالب ومعرف المادة مطلوبان' });
  }

  // Check if student exists
  db.get('SELECT * FROM students WHERE id = ?', [student_id], (err, student) => {
    if (err) {
      console.error('Error checking student:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // Check if course exists
    db.get('SELECT * FROM courses WHERE id = ?', [course_id], (err, course) => {
      if (err) {
        console.error('Error checking course:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!course) {
        return res.status(404).json({ error: 'المادة غير موجودة' });
      }

      // Check if course is already completed
      db.get('SELECT * FROM completed_courses WHERE student_id = ? AND course_id = ?',
        [student_id, course_id], (err, completedCourse) => {
        if (err) {
          console.error('Error checking completed course:', err.message);
          return res.status(500).json({ error: err.message });
        }

        if (completedCourse) {
          return res.status(400).json({ error: 'المادة منجزة بالفعل لهذا الطالب' });
        }

        // If student is enrolled in this course, remove the enrollment
        db.get('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
          [student_id, course_id], (err, enrollment) => {
          if (err) {
            console.error('Error checking enrollment:', err.message);
            return res.status(500).json({ error: err.message });
          }

          const insertCompletedCourse = () => {
            // Insert completed course
            db.run('INSERT INTO completed_courses (student_id, course_id) VALUES (?, ?)',
              [student_id, course_id],
              function(err) {
                if (err) {
                  console.error('Error inserting completed course:', err.message);
                  return res.status(500).json({ error: err.message });
                }

                res.json({
                  success: true,
                  completed_course: {
                    id: this.lastID,
                    student_id,
                    course_id
                  },
                  enrollment_removed: enrollment ? true : false
                });
              }
            );
          };

          // If student is enrolled, remove the enrollment first
          if (enrollment) {
            db.run('DELETE FROM enrollments WHERE id = ?', [enrollment.id], function(err) {
              if (err) {
                console.error('Error removing enrollment:', err.message);
                return res.status(500).json({ error: err.message });
              }

              // Now insert the completed course
              insertCompletedCourse();
            });
          } else {
            // No enrollment to remove, just insert the completed course
            insertCompletedCourse();
          }
        });
      });
    });
  });
});

// Delete completed course for student
app.delete('/api/admin/completed-courses/:id', adminMiddleware, (req, res) => {
  const completedCourseId = req.params.id;

  // Check if completed course exists
  db.get('SELECT * FROM completed_courses WHERE id = ?', [completedCourseId], (err, completedCourse) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!completedCourse) {
      return res.status(404).json({ error: 'المادة المنجزة غير موجودة' });
    }

    // Delete completed course
    db.run('DELETE FROM completed_courses WHERE id = ?', [completedCourseId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        message: 'تم حذف المادة المنجزة بنجاح'
      });
    });
  });
});

// Delete enrollment for student (admin)
app.delete('/api/admin/enrollments/:id', adminMiddleware, (req, res) => {
  const enrollmentId = req.params.id;

  // Check if enrollment exists
  db.get('SELECT * FROM enrollments WHERE id = ?', [enrollmentId], (err, enrollment) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!enrollment) {
      return res.status(404).json({ error: 'التسجيل غير موجود' });
    }

    // Delete enrollment
    db.run('DELETE FROM enrollments WHERE id = ?', [enrollmentId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        message: 'تم إلغاء التسجيل بنجاح'
      });
    });
  });
});

// Update payment status for enrollment (admin and financial supervisor)
app.put('/api/admin/enrollments/:id/payment-status', financialSupervisorMiddleware, (req, res) => {
  const enrollmentId = req.params.id;
  const { payment_status } = req.body;

  // Validate input
  if (!payment_status || (payment_status !== 'خالص' && payment_status !== 'غير خالص')) {
    return res.status(400).json({ error: 'حالة الدفع غير صالحة. يجب أن تكون "خالص" أو "غير خالص"' });
  }

  // Check if enrollment exists
  db.get('SELECT * FROM enrollments WHERE id = ?', [enrollmentId], (err, enrollment) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!enrollment) {
      return res.status(404).json({ error: 'التسجيل غير موجود' });
    }

    // Update payment status
    db.run('UPDATE enrollments SET payment_status = ? WHERE id = ?',
      [payment_status, enrollmentId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          message: `تم تحديث حالة الدفع إلى "${payment_status}" بنجاح`,
          enrollment_id: enrollmentId,
          payment_status: payment_status
        });
      }
    );
  });
});

// Get all students with their enrolled courses (admin and financial supervisor)
app.get('/api/admin/students-enrollments', financialSupervisorMiddleware, (req, res) => {
  // Get all students with their basic information
  db.all(`
    SELECT s.id, s.name, s.student_id, s.registration_number, s.department_id, s.semester, s.group_name, d.name as department_name
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    ORDER BY s.name
  `, (err, students) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Asegurarse de que todos los estudiantes tengan un valor de semestre y convertir department_id a string
    students.forEach(student => {
      if (!student.semester) {
        student.semester = 'الأول';
      }
      // Convertir department_id a string para consistencia
      if (student.department_id !== null && student.department_id !== undefined) {
        student.department_id = String(student.department_id);
      }
    });

    // Mostrar información de departamentos para depuración
    db.all('SELECT * FROM departments', [], (err, departments) => {
      if (err) {
        console.error('Error fetching departments:', err.message);
      } else {
        console.log('Fetching all departments');
        console.log('Departments fetched:', departments.length);
        console.log('Departments with string IDs:',
          departments.map(d => ({ id: String(d.id), name: d.name, type: typeof String(d.id) }))
        );
      }
    });

    // For each student, get their enrolled courses
    const getStudentEnrollments = (student) => {
      return new Promise((resolve, reject) => {
        // Imprimir información del estudiante para depuración
        console.log(`Obteniendo inscripciones para estudiante ID: ${student.id}, Nombre: ${student.name}`);

        db.all(`
          SELECT e.id as enrollment_id, e.payment_status, e.group_id,
                 c.id as course_id, c.name as course_name, c.course_code, c.semester,
                 g.group_name, g.id as group_id
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          LEFT JOIN course_groups g ON e.group_id = g.id
          WHERE e.student_id = ?
          ORDER BY c.name
        `, [student.id], (err, enrollments) => {
          // Imprimir información de las inscripciones para depuración
          if (enrollments && enrollments.length > 0) {
            console.log(`Estudiante ${student.id} tiene ${enrollments.length} inscripciones`);
            console.log(`Primera inscripción: ${JSON.stringify(enrollments[0])}`);
          } else {
            console.log(`Estudiante ${student.id} no tiene inscripciones`);
          }
          if (err) {
            reject(err);
          } else {
            student.enrollments = enrollments;
            resolve(student);
          }
        });
      });
    };

    // Process all students
    Promise.all(students.map(getStudentEnrollments))
      .then(studentsWithEnrollments => {
        res.json({ students: studentsWithEnrollments });
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  });
});

// Student routes

// Get student info
app.get('/api/student/info', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.get(`
    SELECT s.*, d.name as department_name
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE u.id = ?
  `, [req.session.user.id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ student });
  });
});

// Get student completed courses
app.get('/api/student/completed-courses', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.get('SELECT id FROM students WHERE user_id = ?', [req.session.user.id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    db.all(`
      SELECT cc.*, c.course_code, c.name
      FROM completed_courses cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.student_id = ?
    `, [student.id], (err, courses) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ completed_courses: courses });
    });
  });
});

// Get available courses for student
app.get('/api/student/available-courses', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.get('SELECT id, department_id FROM students WHERE user_id = ?', [req.session.user.id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all courses in student's department
    db.all(`
      SELECT c.*, d.name as department_name,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.department_id = ?
    `, [student.department_id], (err, courses) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get student's completed courses
      db.all('SELECT course_id FROM completed_courses WHERE student_id = ?', [student.id], (err, completedCourses) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const completedCourseIds = completedCourses.map(c => c.course_id);

        // Get student's enrolled courses with group information and payment status
        db.all(`
          SELECT e.course_id, e.group_id, e.payment_status, g.group_name, g.professor_name, g.time_slot
          FROM enrollments e
          LEFT JOIN course_groups g ON e.group_id = g.id
          WHERE e.student_id = ?
        `, [student.id], (err, enrolledCourses) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const enrolledCourseIds = enrolledCourses.map(c => c.course_id);

          // Create a map of enrolled courses to their group info and payment status
          const enrolledCourseGroupMap = {};
          enrolledCourses.forEach(course => {
            enrolledCourseGroupMap[course.course_id] = {
              group_id: course.group_id,
              group_name: course.group_name,
              professor_name: course.professor_name,
              time_slot: course.time_slot,
              payment_status: course.payment_status || 'غير خالص'
            };
          });

          // Get all prerequisites
          db.all('SELECT * FROM prerequisites', (err, prerequisites) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Process courses to determine availability
            const processedCourses = courses.map(course => {
              // Check if course is already completed
              const isCompleted = completedCourseIds.includes(course.id);

              // Check if course is already enrolled
              const isEnrolled = enrolledCourseIds.includes(course.id);

              // Check if course has prerequisites
              const coursePrerequisites = prerequisites.filter(p => p.course_id === course.id);

              // Check if all prerequisites are completed
              const allPrerequisitesMet = coursePrerequisites.every(p =>
                completedCourseIds.includes(p.prerequisite_id)
              );

              // Check if course is full
              const isFull = course.enrolled_students >= course.max_students;

              // Add group info if enrolled
              const groupInfo = isEnrolled ? enrolledCourseGroupMap[course.id] : null;

              return {
                ...course,
                is_completed: isCompleted,
                is_enrolled: isEnrolled,
                prerequisites: coursePrerequisites.map(p => p.prerequisite_id),
                all_prerequisites_met: allPrerequisitesMet,
                is_full: isFull,
                can_register: !isCompleted && !isEnrolled && allPrerequisitesMet && !isFull,
                group_info: groupInfo,
                payment_status: isEnrolled ? enrolledCourseGroupMap[course.id].payment_status : null
              };
            });

            res.json({ courses: processedCourses });
          });
        });
      });
    });
  });
});

// Enroll in a course
app.post('/api/student/enroll', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check if registration is open
  db.get('SELECT value FROM system_settings WHERE key = ?', ['registration_open'], (err, setting) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if registration is closed
    if (setting && setting.value === 'false') {
      return res.status(403).json({ error: 'التسجيل مغلق حالياً' });
    }

    const { course_id } = req.body;

    db.get('SELECT * FROM students WHERE user_id = ?', [req.session.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get max courses limit
      db.get('SELECT value FROM system_settings WHERE key = ?', ['max_courses_limit'], (err, setting) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Default to 6 if setting doesn't exist
        const maxCoursesLimit = setting ? parseInt(setting.value) : 6;

        // Check if student has reached max courses limit
        db.all('SELECT * FROM enrollments WHERE student_id = ?', [student.id], (err, enrollments) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Get actual count of enrollments
          const enrollmentCount = enrollments.length;

          // Print detailed enrollment information for debugging
          console.log(`Student ID: ${student.id}, Enrollment count: ${enrollmentCount}`);
          console.log(`Enrollments: ${JSON.stringify(enrollments)}`);

          // Check if student has already reached the maximum number of courses
          // Allow registration if current count is less than the limit
          console.log(`Current courses: ${enrollmentCount}, Max limit: ${maxCoursesLimit}`);

          // Only block if current count equals or exceeds the limit
          if (enrollmentCount >= maxCoursesLimit) {
            // Student has reached the limit - block enrollment
            console.log("Student cannot enroll - at or over the limit");
            return res.status(400).json({
              error: `لقد وصلت إلى الحد الأقصى المسموح به من المواد (${maxCoursesLimit} مواد)`,
              max_courses_limit: maxCoursesLimit,
              current_courses: enrollmentCount
            });
          }

          // Continue with enrollment - student has not reached the limit
          console.log("Student can enroll - under the limit");

          // Check if already enrolled
          db.get('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?', [student.id, course_id], (err, enrollment) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (enrollment) {
              return res.status(400).json({ error: 'Already enrolled in this course' });
            }

            // Check if already completed
            db.get('SELECT * FROM completed_courses WHERE student_id = ? AND course_id = ?', [student.id, course_id], (err, completed) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              if (completed) {
                return res.status(400).json({ error: 'Course already completed' });
              }

              // Check prerequisites
              db.all('SELECT prerequisite_id FROM prerequisites WHERE course_id = ?', [course_id], (err, prerequisites) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                // If there are prerequisites, check if they are completed
                if (prerequisites.length > 0) {
                  const prerequisiteIds = prerequisites.map(p => p.prerequisite_id);

                  db.all('SELECT course_id FROM completed_courses WHERE student_id = ? AND course_id IN (' +
                    prerequisiteIds.map(() => '?').join(',') + ')', [student.id, ...prerequisiteIds], (err, completedPrerequisites) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    const completedPrerequisiteIds = completedPrerequisites.map(c => c.course_id);

                    // Check if all prerequisites are completed
                    const allPrerequisitesMet = prerequisiteIds.every(id => completedPrerequisiteIds.includes(id));

                    if (!allPrerequisitesMet) {
                      return res.status(400).json({ error: 'Not all prerequisites are completed' });
                    }

                    // Check if course is full
                    db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [course_id], (err, result) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      db.get('SELECT max_students FROM courses WHERE id = ?', [course_id], (err, course) => {
                        if (err) {
                          return res.status(500).json({ error: err.message });
                        }

                        if (result.count >= course.max_students) {
                          return res.status(400).json({ error: 'Course is full' });
                        }

                        // Enroll student
                        db.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [student.id, course_id], function(err) {
                          if (err) {
                            return res.status(500).json({ error: err.message });
                          }

                          res.json({
                            success: true,
                            enrollment: {
                              id: this.lastID,
                              student_id: student.id,
                              course_id
                            }
                          });
                        });
                  });
                });
              });
                } else {
                  // No prerequisites, check if course is full
                  db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [course_id], (err, result) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    db.get('SELECT max_students FROM courses WHERE id = ?', [course_id], (err, course) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      if (result.count >= course.max_students) {
                        return res.status(400).json({ error: 'Course is full' });
                      }

                      // Enroll student
                      db.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [student.id, course_id], function(err) {
                        if (err) {
                          return res.status(500).json({ error: err.message });
                        }

                        res.json({
                          success: true,
                          enrollment: {
                            id: this.lastID,
                            student_id: student.id,
                            course_id
                          }
                        });
                      });
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  });
});

// Unenroll from a course
app.post('/api/student/unenroll', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { course_id } = req.body;

  db.get('SELECT id FROM students WHERE user_id = ?', [req.session.user.id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if enrolled
    db.get('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student.id, course_id],
      (err, enrollment) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!enrollment) {
          return res.status(400).json({ error: 'Not enrolled in this course' });
        }

        // Unenroll student
        db.run('DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
          [student.id, course_id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            res.json({
              success: true,
              message: 'Successfully unenrolled from course'
            });
          }
        );
      }
    );
  });
});





// Get registration status
app.get('/api/registration-status', (req, res) => {
  db.get('SELECT value FROM system_settings WHERE key = ?', ['registration_open'], (err, setting) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Default to open if setting doesn't exist
    const isOpen = setting ? setting.value === 'true' : true;

    res.json({ registration_open: isOpen });
  });
});

// Get max courses limit
app.get('/api/max-courses-limit', (req, res) => {
  console.log('API request received: /api/max-courses-limit');

  // Use a more efficient query with a timeout
  db.get('SELECT value FROM system_settings WHERE key = ? LIMIT 1', ['max_courses_limit'], (err, setting) => {
    if (err) {
      console.error('Error getting max courses limit:', err.message);
      return res.status(500).json({ error: err.message });
    }

    // Default to 2 if setting doesn't exist (changed from 6 to match current setting)
    const maxCoursesLimit = setting ? parseInt(setting.value) : 2;
    console.log(`Max courses limit retrieved: ${maxCoursesLimit}`);

    // Send response with cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ max_courses_limit: maxCoursesLimit });
  });
});

// Get student enrollment count
app.get('/api/student/enrollment-count', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  console.log(`Getting enrollment count for user ID: ${req.session.user.id}`);

  db.get('SELECT id FROM students WHERE user_id = ?', [req.session.user.id], (err, student) => {
    if (err) {
      console.error(`Error getting student: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      console.log(`Student not found for user ID: ${req.session.user.id}`);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log(`Found student with ID: ${student.id}`);

    // Get all enrollments for the student
    db.all('SELECT * FROM enrollments WHERE student_id = ?', [student.id], (err, enrollments) => {
      if (err) {
        console.error(`Error getting enrollments: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }

      // Print detailed enrollment information for debugging
      console.log(`API - Student ID: ${student.id}, Enrollment count: ${enrollments.length}`);
      console.log(`API - Enrollments: ${JSON.stringify(enrollments)}`);

      // Get max courses limit
      db.get('SELECT value FROM system_settings WHERE key = ?', ['max_courses_limit'], (err, setting) => {
        if (err) {
          console.error(`Error getting max courses limit: ${err.message}`);
          return res.status(500).json({ error: err.message });
        }

        // Default to 6 if setting doesn't exist
        const maxCoursesLimit = setting ? parseInt(setting.value) : 6;
        console.log(`Max courses limit: ${maxCoursesLimit}`);

        res.json({
          enrollment_count: enrollments.length,
          max_courses_limit: maxCoursesLimit
        });
      });
    });
  });
});

// Update registration status (admin only)
app.post('/api/admin/registration-status', adminMiddleware, (req, res) => {
  const { is_open } = req.body;

  if (is_open === undefined) {
    return res.status(400).json({ error: 'حالة التسجيل مطلوبة' });
  }

  const value = is_open ? 'true' : 'false';

  db.run('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
    [value, 'registration_open'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        // Insert if not exists
        db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)',
          ['registration_open', value],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            res.json({
              success: true,
              registration_open: is_open
            });
          }
        );
      } else {
        res.json({
          success: true,
          registration_open: is_open
        });
      }
    }
  );
});

// Reset enrollments (admin only) - FOR DEBUGGING ONLY
app.post('/api/admin/reset-enrollments', adminMiddleware, (req, res) => {
  // First, get all enrollments for debugging
  db.all('SELECT * FROM enrollments', [], (err, enrollments) => {
    if (err) {
      console.error('Error getting enrollments:', err.message);
    } else {
      console.log(`Current enrollments before reset: ${JSON.stringify(enrollments)}`);
    }

    // Use a more direct approach with a raw SQL query
    db.exec('DELETE FROM enrollments; DELETE FROM sqlite_sequence WHERE name = "enrollments";', function(err) {
      if (err) {
        console.error('Error executing SQL:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('All enrollments deleted and auto-increment counter reset');

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

        res.json({
          success: true,
          message: 'All enrollments have been reset',
          enrollments_before: enrollments.length,
          enrollments_after: remainingEnrollments ? remainingEnrollments.length : 'unknown'
        });
      });
    });
  });
});

// Reset student enrollments (admin only) - FOR DEBUGGING ONLY
app.post('/api/admin/reset-student-enrollments', adminMiddleware, (req, res) => {
  const { registration_number } = req.body;

  console.log(`Received request to reset enrollments for student with registration number: ${registration_number}`);

  if (!registration_number) {
    console.log('Registration number is required but was not provided');
    return res.status(400).json({ error: 'رقم القيد مطلوب' });
  }

  // Get student by registration number
  db.get('SELECT * FROM students WHERE registration_number = ?', [registration_number], (err, student) => {
    if (err) {
      console.error(`Error getting student: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      console.log(`Student with registration number ${registration_number} not found`);
      return res.status(404).json({ error: 'الطالب غير موجود. تأكد من رقم القيد' });
    }

    console.log(`Found student: ${JSON.stringify(student)}`);
    const student_id = student.id;

    // Get all enrollments for this student
    db.all('SELECT * FROM enrollments WHERE student_id = ?', [student_id], (err, enrollments) => {
      if (err) {
        console.error(`Error getting enrollments: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }

      console.log(`Student ${student.name} (ID: ${student_id}) enrollments before reset: ${JSON.stringify(enrollments)}`);

      if (enrollments.length === 0) {
        console.log(`No enrollments found for student ${student.name} (ID: ${student_id})`);
        return res.json({
          success: true,
          message: `لا توجد تسجيلات للطالب ${student.name}`,
          student_name: student.name,
          rows_affected: 0
        });
      }

      // Delete all enrollments for this student
      db.run('DELETE FROM enrollments WHERE student_id = ?', [student_id], function(err) {
        if (err) {
          console.error(`Error deleting enrollments: ${err.message}`);
          return res.status(500).json({ error: err.message });
        }

        console.log(`All enrollments deleted for student ${student.name} (ID: ${student_id}). Rows affected: ${this.changes}`);

        // Verify that all enrollments are deleted
        db.all('SELECT * FROM enrollments WHERE student_id = ?', [student_id], (err, remainingEnrollments) => {
          if (err) {
            console.error(`Error verifying enrollments deletion: ${err.message}`);
          } else {
            console.log(`Remaining enrollments for student ${student.name} (ID: ${student_id}) after reset: ${JSON.stringify(remainingEnrollments)}`);

            if (remainingEnrollments.length > 0) {
              console.log(`WARNING: Some enrollments still remain for student ${student.name} (ID: ${student_id}) after reset!`);
            } else {
              console.log(`SUCCESS: All enrollments have been deleted for student ${student.name} (ID: ${student_id})`);
            }
          }

          res.json({
            success: true,
            message: `تم إعادة ضبط تسجيلات الطالب ${student.name}`,
            student_name: student.name,
            rows_affected: this.changes,
            enrollments_before: enrollments.length,
            enrollments_after: remainingEnrollments ? remainingEnrollments.length : 'unknown'
          });
        });
      });
    });
  });
});

// Update max courses limit (admin only)
app.post('/api/admin/max-courses-limit', adminMiddleware, (req, res) => {
  const { max_courses_limit } = req.body;

  if (max_courses_limit === undefined || isNaN(max_courses_limit) || max_courses_limit < 1) {
    return res.status(400).json({ error: 'الرجاء إدخال قيمة صحيحة للحد الأقصى للمواد' });
  }

  const value = max_courses_limit.toString();

  db.run('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
    [value, 'max_courses_limit'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        // Insert if not exists
        db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)',
          ['max_courses_limit', value],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            res.json({
              success: true,
              max_courses_limit: parseInt(max_courses_limit)
            });
          }
        );
      } else {
        res.json({
          success: true,
          max_courses_limit: parseInt(max_courses_limit)
        });
      }
    }
  );
});

// Get auto-logout settings
app.get('/api/auto-logout-settings', authMiddleware, (req, res) => {
  console.log('Getting auto-logout settings for user:', req.session.user ? req.session.user.username : 'unknown');

  // Get both auto-logout settings at once
  db.all('SELECT key, value FROM system_settings WHERE key IN (?, ?)',
    ['auto_logout_enabled', 'auto_logout_timeout'],
    (err, settings) => {
      if (err) {
        console.error('Error getting auto-logout settings:', err.message);
        return res.status(500).json({ error: err.message });
      }

      // Convert to object with default values if settings don't exist
      const settingsObj = {
        auto_logout_enabled: 'false',
        auto_logout_timeout: '30'
      };

      // Update with actual values from database
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
        console.log(`Retrieved setting ${setting.key} = ${setting.value}`);
      });

      // Convert enabled to boolean and timeout to number for the response
      const responseObj = {
        auto_logout_enabled: settingsObj.auto_logout_enabled === 'true',
        auto_logout_timeout: parseInt(settingsObj.auto_logout_timeout)
      };

      console.log('Sending auto-logout settings:', responseObj);
      res.json(responseObj);
    }
  );
});

// Update auto-logout settings (public endpoint)
app.post('/api/auto-logout-settings', (req, res) => {
  console.log('Received request to update auto-logout settings');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);

  // Check if body is empty
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error('Empty request body');
    return res.status(400).json({ error: 'Empty request body' });
  }

  const { auto_logout_enabled, auto_logout_timeout } = req.body;

  console.log('Updating auto-logout settings:', { auto_logout_enabled, auto_logout_timeout });

  // Validate input
  if (auto_logout_enabled === undefined) {
    console.error('Missing auto_logout_enabled parameter');
    return res.status(400).json({ error: 'الرجاء تحديد حالة تسجيل الخروج التلقائي' });
  }

  if (auto_logout_timeout === undefined || isNaN(auto_logout_timeout) || auto_logout_timeout < 5) {
    console.error('Invalid auto_logout_timeout parameter:', auto_logout_timeout);
    return res.status(400).json({ error: 'الرجاء إدخال قيمة صحيحة لمدة تسجيل الخروج التلقائي (5 ثوان على الأقل)' });
  }

  // Convert to strings for storage
  const enabledValue = auto_logout_enabled ? 'true' : 'false';
  const timeoutValue = auto_logout_timeout.toString();

  console.log('Storing values in database:', { enabledValue, timeoutValue });

  // Use a transaction to update both settings
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update enabled setting
    db.run('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [enabledValue, 'auto_logout_enabled'],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          // Insert if not exists
          db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)',
            ['auto_logout_enabled', enabledValue],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
            }
          );
        }
      }
    );

    // Update timeout setting
    db.run('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [timeoutValue, 'auto_logout_timeout'],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          // Insert if not exists
          db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)',
            ['auto_logout_timeout', timeoutValue],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
            }
          );
        }
      }
    );

    // Commit transaction and return success
    db.run('COMMIT', function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        auto_logout_enabled: auto_logout_enabled,
        auto_logout_timeout: auto_logout_timeout
      });
    });
  });
});

// API endpoint to manually update max_students for all courses
app.post('/api/admin/update-all-max-students', adminMiddleware, (req, res) => {
  console.log('Manual update of max_students for all courses requested');

  updateAllCoursesMaxStudents((err, updatedCourses) => {
    if (err) {
      console.error('Error updating max_students for all courses:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الحد الأقصى للطلبة لجميع المواد',
      updated_courses: updatedCourses || []
    });
  });
});

// Get course statistics
app.get('/api/admin/course-statistics', adminMiddleware, (req, res) => {
  // Get all courses with enrollment counts and completed counts
  db.all(`
    SELECT
      c.id,
      c.course_code,
      c.name,
      c.max_students,
      c.department_id,
      c.semester,
      d.name as department_name,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students,
      (SELECT COUNT(*) FROM completed_courses WHERE course_id = c.id) as completed_students
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    ORDER BY c.course_code
  `, (err, courses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate enrollment percentage for each course with higher precision
    const coursesWithStats = courses.map(course => {
      let enrollmentPercentage = 0;

      if (course.max_students > 0) {
        const exactPercentage = (course.enrolled_students / course.max_students) * 100;
        enrollmentPercentage = Math.round(exactPercentage * 100) / 100; // Round to 2 decimal places
      }

      return {
        ...course,
        enrollment_percentage: enrollmentPercentage
      };
    });

    res.json({ courses: coursesWithStats });
  });
});

// Get enrolled students for a specific course
app.get('/api/admin/course/:id/students', adminMiddleware, (req, res) => {
  const courseId = req.params.id;

  // First get course details
  db.get(`
    SELECT
      c.id,
      c.course_code,
      c.name,
      c.department_id,
      d.name as department_name,
      c.max_students,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `, [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Calculate enrollment percentage with higher precision
    if (course.max_students > 0) {
      const exactPercentage = (course.enrolled_students / course.max_students) * 100;
      course.enrollment_percentage = Math.round(exactPercentage * 100) / 100; // Round to 2 decimal places
    } else {
      course.enrollment_percentage = 0;
    }

    // Get enrolled students with group information
    db.all(`
      SELECT
        s.id,
        s.student_id,
        s.name,
        s.registration_number,
        s.semester,
        d.name as department_name,
        e.created_at as enrollment_date,
        g.id as group_id,
        g.group_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN course_groups g ON e.group_id = g.id
      WHERE e.course_id = ?
      ORDER BY s.name
    `, [courseId], (err, students) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Ensure all students have a semester value
      students.forEach(student => {
        if (!student.semester) {
          student.semester = 'الأول';
        }
      });

      res.json({
        course: course,
        students: students
      });
    });
  });
});

// Course Groups API Endpoints

// Get all groups for a course
app.get('/api/admin/course/:id/groups', adminMiddleware, (req, res) => {
  const courseId = req.params.id;

  // First get course details
  db.get(`
    SELECT
      c.id,
      c.course_code,
      c.name,
      c.department_id,
      d.name as department_name,
      c.max_students
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `, [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    // Get groups for this course
    db.all(`
      SELECT
        g.*,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = g.course_id AND group_id = g.id) as enrolled_students
      FROM course_groups g
      WHERE g.course_id = ?
      ORDER BY g.group_name
    `, [courseId], (err, groups) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Calculate enrollment percentage for each group
      const groupsWithStats = groups.map(group => {
        let enrollmentPercentage = 0;

        if (group.max_students > 0) {
          const exactPercentage = (group.enrolled_students / group.max_students) * 100;
          enrollmentPercentage = Math.round(exactPercentage * 100) / 100; // Round to 2 decimal places
        }

        return {
          ...group,
          enrollment_percentage: enrollmentPercentage
        };
      });

      res.json({
        course: course,
        groups: groupsWithStats
      });
    });
  });
});

// Add a new group to a course
app.post('/api/admin/course/:id/groups', adminMiddleware, (req, res) => {
  const courseId = req.params.id;
  const { group_name, max_students, professor_name, time_slot } = req.body;

  console.log('Adding group to course:', courseId, { group_name, max_students, professor_name, time_slot });

  // Validate input
  if (!group_name || !max_students) {
    return res.status(400).json({ error: 'اسم المجموعة وعدد الطلاب المسموح به مطلوبان' });
  }

  // Check if course exists
  db.get('SELECT id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!course) {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }

    // Check if group name already exists for this course
    db.get('SELECT id FROM course_groups WHERE course_id = ? AND group_name = ?', [courseId, group_name], (err, existingGroup) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingGroup) {
        return res.status(400).json({ error: 'اسم المجموعة مستخدم بالفعل لهذه المادة' });
      }

      // Add the group
      db.run('INSERT INTO course_groups (course_id, group_name, max_students, professor_name, time_slot) VALUES (?, ?, ?, ?, ?)',
        [courseId, group_name, max_students, professor_name, time_slot],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const groupId = this.lastID;

          // Update course max_students
          updateCourseMaxStudents(courseId, (err, updatedCourse) => {
            if (err) {
              console.error(`Error updating max_students for course ${courseId}:`, err.message);
              // Continue anyway to return the group
            }

            res.json({
              success: true,
              group: {
                id: groupId,
                course_id: courseId,
                group_name,
                max_students,
                professor_name,
                time_slot,
                enrolled_students: 0,
                enrollment_percentage: 0
              },
              course_max_students: updatedCourse ? updatedCourse.max_students : null
            });
          });
        }
      );
    });
  });
});

// Update a course group
app.put('/api/admin/course/groups/:id', adminMiddleware, (req, res) => {
  const groupId = req.params.id;
  const { group_name, max_students, professor_name, time_slot } = req.body;

  console.log('Updating group:', groupId, { group_name, max_students, professor_name, time_slot });

  // Validate input
  if (!group_name || !max_students) {
    return res.status(400).json({ error: 'اسم المجموعة وعدد الطلاب المسموح به مطلوبان' });
  }

  // Get current group data
  db.get('SELECT * FROM course_groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }

    // Check if group name already exists for this course (excluding current group)
    db.get('SELECT id FROM course_groups WHERE course_id = ? AND group_name = ? AND id != ?',
      [group.course_id, group_name, groupId], (err, existingGroup) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingGroup) {
        return res.status(400).json({ error: 'اسم المجموعة مستخدم بالفعل لهذه المادة' });
      }

      // Update the group
      db.run('UPDATE course_groups SET group_name = ?, max_students = ?, professor_name = ?, time_slot = ? WHERE id = ?',
        [group_name, max_students, professor_name, time_slot, groupId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Get current enrollment count
          db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND group_id = ?',
            [group.course_id, groupId], (err, result) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const enrolledStudents = result ? result.count : 0;
            let enrollmentPercentage = 0;

            if (max_students > 0) {
              const exactPercentage = (enrolledStudents / max_students) * 100;
              enrollmentPercentage = Math.round(exactPercentage * 100) / 100;
            }

            // Update course max_students
            updateCourseMaxStudents(group.course_id, (updateErr, updatedCourse) => {
              if (updateErr) {
                console.error(`Error updating max_students for course ${group.course_id}:`, updateErr.message);
                // Continue anyway to return the group
              }

              res.json({
                success: true,
                group: {
                  id: groupId,
                  course_id: group.course_id,
                  group_name,
                  max_students,
                  professor_name,
                  time_slot,
                  enrolled_students: enrolledStudents,
                  enrollment_percentage: enrollmentPercentage
                },
                course_max_students: updatedCourse ? updatedCourse.max_students : null
              });
            });
          });
        }
      );
    });
  });
});

// Delete a course group
app.delete('/api/admin/course/groups/:id', adminMiddleware, (req, res) => {
  const groupId = req.params.id;
  const forceDelete = req.query.force === 'true';

  console.log('Deleting group:', groupId, 'Force delete:', forceDelete);

  // Check if group exists
  db.get('SELECT * FROM course_groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }

    // Check if there are students enrolled in this group
    db.get('SELECT COUNT(*) as count FROM enrollments WHERE group_id = ?', [groupId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const enrolledCount = result.count;

      // If there are enrolled students and force delete is not enabled, return warning
      if (enrolledCount > 0 && !forceDelete) {
        return res.status(409).json({
          warning: true,
          message: 'هناك طلاب مسجلين في هذه المجموعة. هل أنت متأكد من حذفها؟',
          details: {
            enrollments: enrolledCount
          }
        });
      }

      // If force delete, update enrollments to remove group_id
      if (enrolledCount > 0) {
        db.run('UPDATE enrollments SET group_id = NULL WHERE group_id = ?', [groupId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'خطأ في تحديث تسجيلات الطلاب: ' + err.message });
          }

          // Now delete the group
          deleteGroup();
        });
      } else {
        // No enrollments, delete directly
        deleteGroup();
      }

      function deleteGroup() {
        db.run('DELETE FROM course_groups WHERE id = ?', [groupId], function(err) {
          if (err) {
            return res.status(500).json({ error: 'خطأ في حذف المجموعة: ' + err.message });
          }

          // Get course_id before responding
          const courseId = group.course_id;

          // Update course max_students
          updateCourseMaxStudents(courseId, (updateErr, updatedCourse) => {
            if (updateErr) {
              console.error(`Error updating max_students for course ${courseId}:`, updateErr.message);
              // Continue anyway to return success
            }

            res.json({
              success: true,
              message: 'تم حذف المجموعة بنجاح',
              course_max_students: updatedCourse ? updatedCourse.max_students : null
            });
          });
        });
      }
    });
  });
});

// Get a single group by ID
app.get('/api/admin/course/groups/:id', adminMiddleware, (req, res) => {
  const groupId = req.params.id;

  // Get group details with course information
  db.get(`
    SELECT
      g.*,
      c.name as course_name,
      c.course_code,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = g.course_id AND group_id = g.id) as enrolled_students
    FROM course_groups g
    JOIN courses c ON g.course_id = c.id
    WHERE g.id = ?
  `, [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }

    // Calculate enrollment percentage
    let enrollmentPercentage = 0;
    if (group.max_students > 0) {
      const exactPercentage = (group.enrolled_students / group.max_students) * 100;
      enrollmentPercentage = Math.round(exactPercentage * 100) / 100;
    }

    // Add enrollment percentage to group data
    group.enrollment_percentage = enrollmentPercentage;

    res.json({
      group: group
    });
  });
});

// Get students in a group
app.get('/api/admin/course/groups/:id/students', adminMiddleware, (req, res) => {
  const groupId = req.params.id;

  // Get group details
  db.get(`
    SELECT
      g.*,
      c.name as course_name,
      c.course_code
    FROM course_groups g
    JOIN courses c ON g.course_id = c.id
    WHERE g.id = ?
  `, [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }

    // Get students in this group
    db.all(`
      SELECT
        s.id,
        s.student_id,
        s.name,
        s.registration_number,
        s.semester,
        d.name as department_name,
        e.created_at as enrollment_date
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE e.course_id = ? AND e.group_id = ?
      ORDER BY s.name
    `, [group.course_id, groupId], (err, students) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        group: group,
        students: students
      });
    });
  });
});

// Student: Get available groups for a course
app.get('/api/student/course/:id/groups', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const courseId = req.params.id;

  // Get student info
  db.get(`
    SELECT s.* FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.id = ?
  `, [req.session.user.id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get course info
    db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check if student is already enrolled in this course
      db.get('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
        [student.id, courseId], (err, enrollment) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Get available groups for this course
        db.all(`
          SELECT
            g.*,
            (SELECT COUNT(*) FROM enrollments WHERE course_id = g.course_id AND group_id = g.id) as enrolled_students
          FROM course_groups g
          WHERE g.course_id = ?
          ORDER BY g.group_name
        `, [courseId], (err, groups) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Process groups to add availability info
          const processedGroups = groups.map(group => {
            const isFull = group.enrolled_students >= group.max_students;
            let enrollmentPercentage = 0;

            if (group.max_students > 0) {
              const exactPercentage = (group.enrolled_students / group.max_students) * 100;
              enrollmentPercentage = Math.round(exactPercentage * 100) / 100;
            }

            return {
              ...group,
              is_full: isFull,
              enrollment_percentage: enrollmentPercentage,
              can_register: !isFull
            };
          });

          res.json({
            course: course,
            groups: processedGroups,
            current_enrollment: enrollment || null
          });
        });
      });
    });
  });
});

// Student: Enroll in a course with group selection
app.post('/api/student/enroll-with-group', authMiddleware, (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { course_id, group_id } = req.body;

  if (!course_id || !group_id) {
    return res.status(400).json({ error: 'Course ID and Group ID are required' });
  }

  // Get student info
  db.get(`
    SELECT s.* FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.id = ?
  `, [req.session.user.id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if registration is open
    db.get('SELECT value FROM system_settings WHERE key = ?', ['registration_open'], (err, setting) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const registrationOpen = setting && setting.value === 'true';

      if (!registrationOpen) {
        return res.status(403).json({ error: 'Registration is currently closed' });
      }

      // Check if student is already enrolled in this course
      db.get('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
        [student.id, course_id], (err, existingEnrollment) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (existingEnrollment) {
          return res.status(400).json({ error: 'You are already enrolled in this course' });
        }

        // Check if student has completed this course
        db.get('SELECT * FROM completed_courses WHERE student_id = ? AND course_id = ?',
          [student.id, course_id], (err, completedCourse) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (completedCourse) {
            return res.status(400).json({ error: 'You have already completed this course' });
          }

          // Check if student has reached the maximum number of courses
          db.get('SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?', [student.id], (err, enrollmentCount) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Get max courses limit
            db.get('SELECT value FROM system_settings WHERE key = ?', ['max_courses_limit'], (err, maxCoursesLimit) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              const maxCourses = maxCoursesLimit ? parseInt(maxCoursesLimit.value) : 6;

              if (enrollmentCount.count >= maxCourses) {
                return res.status(400).json({ error: `You have reached the maximum number of courses (${maxCourses})` });
              }

              // Check if all prerequisites are met
              db.all('SELECT prerequisite_id FROM prerequisites WHERE course_id = ?', [course_id], (err, prerequisites) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                // If there are prerequisites, check if student has completed them
                if (prerequisites.length > 0) {
                  const prerequisiteIds = prerequisites.map(p => p.prerequisite_id);

                  // Count how many prerequisites the student has completed
                  db.all('SELECT course_id FROM completed_courses WHERE student_id = ? AND course_id IN (' +
                    prerequisiteIds.map(() => '?').join(',') + ')',
                    [student.id, ...prerequisiteIds], (err, completedPrerequisites) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    // Check if all prerequisites are met
                    if (completedPrerequisites.length < prerequisites.length) {
                      return res.status(400).json({ error: 'Not all prerequisites are met for this course' });
                    }

                    // Check if the selected group exists and is not full
                    db.get('SELECT * FROM course_groups WHERE id = ? AND course_id = ?',
                      [group_id, course_id], (err, group) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      if (!group) {
                        return res.status(404).json({ error: 'Group not found' });
                      }

                      // Check if group is full
                      db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND group_id = ?',
                        [course_id, group_id], (err, groupEnrollmentCount) => {
                        if (err) {
                          return res.status(500).json({ error: err.message });
                        }

                        if (groupEnrollmentCount.count >= group.max_students) {
                          return res.status(400).json({ error: 'This group is full' });
                        }

                        // Enroll student in the course with the selected group
                        db.run('INSERT INTO enrollments (student_id, course_id, group_id) VALUES (?, ?, ?)',
                          [student.id, course_id, group_id], function(err) {
                          if (err) {
                            return res.status(500).json({ error: err.message });
                          }

                          res.json({
                            success: true,
                            enrollment: {
                              id: this.lastID,
                              student_id: student.id,
                              course_id: course_id,
                              group_id: group_id
                            }
                          });
                        });
                      });
                    });
                  });
                } else {
                  // No prerequisites, check if the selected group exists and is not full
                  db.get('SELECT * FROM course_groups WHERE id = ? AND course_id = ?',
                    [group_id, course_id], (err, group) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    if (!group) {
                      return res.status(404).json({ error: 'Group not found' });
                    }

                    // Check if group is full
                    db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND group_id = ?',
                      [course_id, group_id], (err, groupEnrollmentCount) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      if (groupEnrollmentCount.count >= group.max_students) {
                        return res.status(400).json({ error: 'This group is full' });
                      }

                      // Enroll student in the course with the selected group
                      db.run('INSERT INTO enrollments (student_id, course_id, group_id) VALUES (?, ?, ?)',
                        [student.id, course_id, group_id], function(err) {
                        if (err) {
                          return res.status(500).json({ error: err.message });
                        }

                        res.json({
                          success: true,
                          enrollment: {
                            id: this.lastID,
                            student_id: student.id,
                            course_id: course_id,
                            group_id: group_id
                          }
                        });
                      });
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  });
});

// Function to update max_students for a course
function updateCourseMaxStudents(courseId, callback) {
  console.log(`Updating max_students for course ${courseId}...`);

  // Get all groups for this course
  db.all('SELECT id, group_name, max_students FROM course_groups WHERE course_id = ?', [courseId], (err, groups) => {
    if (err) {
      console.error(`Error getting groups for course ${courseId}:`, err.message);
      if (callback) callback(err);
      return;
    }

    console.log(`Found ${groups.length} groups for course ${courseId}`);

    // Calculate total capacity
    let totalCapacity = 0;
    groups.forEach(group => {
      const groupCapacity = parseInt(group.max_students) || 0;
      console.log(`Group ${group.group_name} (ID: ${group.id}) has capacity: ${groupCapacity}`);
      totalCapacity += groupCapacity;
    });

    console.log(`Total capacity for course ${courseId}: ${totalCapacity}`);

    // Update the course max_students
    db.run('UPDATE courses SET max_students = ? WHERE id = ?', [totalCapacity, courseId], function(err) {
      if (err) {
        console.error(`Error updating max_students for course ${courseId}:`, err.message);
        if (callback) callback(err);
        return;
      }

      console.log(`Successfully updated max_students for course ${courseId} to ${totalCapacity}`);

      // Verify the update
      db.get('SELECT max_students FROM courses WHERE id = ?', [courseId], (verifyErr, verifyResult) => {
        if (verifyErr) {
          console.error(`Error verifying max_students update for course ${courseId}:`, verifyErr.message);
          if (callback) callback(verifyErr);
          return;
        }

        console.log(`Verified max_students for course ${courseId}: ${verifyResult.max_students}`);
        if (callback) callback(null, { id: courseId, max_students: totalCapacity });
      });
    });
  });
}

// Function to update max_students for all courses
function updateAllCoursesMaxStudents(callback) {
  console.log('Updating max_students for all courses...');

  // Get all courses
  db.all('SELECT id, course_code, name FROM courses', [], (err, courses) => {
    if (err) {
      console.error('Error getting courses:', err.message);
      if (callback) callback(err);
      return;
    }

    console.log(`Found ${courses.length} courses to update`);

    // Use a promise to process courses sequentially
    let promise = Promise.resolve();
    let updatedCourses = [];

    courses.forEach(course => {
      promise = promise.then(() => {
        return new Promise((resolve) => {
          console.log(`Processing course ${course.course_code} (${course.name}) with ID ${course.id}...`);

          updateCourseMaxStudents(course.id, (err, updatedCourse) => {
            if (err) {
              console.error(`Error updating max_students for course ${course.id}:`, err.message);
            } else if (updatedCourse) {
              updatedCourses.push(updatedCourse);
            }
            resolve();
          });
        });
      });
    });

    promise.then(() => {
      console.log('Finished updating max_students for all courses');
      if (callback) callback(null, updatedCourses);
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Update max_students for all courses on server start
  updateAllCoursesMaxStudents((err, updatedCourses) => {
    if (err) {
      console.error('Error updating max_students for all courses on server start:', err.message);
    } else {
      console.log(`Updated max_students for ${updatedCourses ? updatedCourses.length : 0} courses on server start`);
    }
  });
});
