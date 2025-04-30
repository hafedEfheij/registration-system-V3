const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: 'hadhara_university_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
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
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Routes

// Login route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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

    // Check if current password is correct
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

    // Ensure all students have a semester value
    students.forEach(student => {
      if (!student.semester) {
        student.semester = 'الأول';
      }
    });

    res.json({ students });
  });
});

// Get a single student by ID
app.get('/api/admin/students/:id', adminMiddleware, (req, res) => {
  const studentId = req.params.id;

  db.get(`
    SELECT s.*, d.name as department_name, u.username, u.password
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `, [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // If semester is not set, default to "الأول"
    if (!student.semester) {
      student.semester = 'الأول';
    }

    res.json({ student });
  });
});

// Add student
app.post('/api/admin/students', adminMiddleware, (req, res) => {
  const { name, student_id, department_id, registration_number, semester } = req.body;

  console.log('Received student data:', { name, student_id, department_id, registration_number, semester });

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
            db.run('INSERT INTO students (name, student_id, department_id, registration_number, user_id, semester) VALUES (?, ?, ?, ?, ?, ?)',
              [name, student_id, department_id, registration_number, user_id, studentSemester],
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
  const { name, department_id, student_id, registration_number, semester } = req.body;

  console.log('Updating student:', studentId, { name, department_id, student_id, registration_number, semester });

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
          db.run('UPDATE students SET name = ?, student_id = ?, department_id = ?, registration_number = ?, semester = ? WHERE id = ?',
            [name, student_id, department_id, registration_number, studentSemester, studentId],
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
app.get('/api/admin/students/:id/courses', adminMiddleware, (req, res) => {
  const studentId = req.params.id;

  // Get student info
  db.get('SELECT * FROM students WHERE id = ?', [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!student) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // Get completed courses
    db.all(`
      SELECT cc.*, c.course_code, c.name, c.department_id, d.name as department_name
      FROM completed_courses cc
      JOIN courses c ON cc.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE cc.student_id = ?
    `, [studentId], (err, completedCourses) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get enrolled courses
      db.all(`
        SELECT e.*, c.course_code, c.name, c.department_id, d.name as department_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE e.student_id = ?
      `, [studentId], (err, enrolledCourses) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          student,
          completedCourses,
          enrolledCourses
        });
      });
    });
  });
});

// Get all departments
app.get('/api/admin/departments', adminMiddleware, (req, res) => {
  db.all('SELECT * FROM departments', (err, departments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
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
  const { course_code, name, department_id, max_students, semester } = req.body;

  console.log('Received course data:', { course_code, name, department_id, max_students, semester });

  // Validate input
  if (!course_code || !name || !department_id || !max_students) {
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
  const { course_code, name, department_id, max_students, semester } = req.body;

  console.log('Updating course:', courseId, { course_code, name, department_id, max_students, semester });

  // Validate input
  if (!course_code || !name || !department_id || !max_students) {
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

        // Update course
        db.run('UPDATE courses SET course_code = ?, name = ?, department_id = ?, max_students = ?, semester = ? WHERE id = ?',
          [course_code, name, department_id, max_students, semester, courseId],
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
                max_students,
                semester
              }
            });
          }
        );
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

  db.run('INSERT INTO completed_courses (student_id, course_id) VALUES (?, ?)',
    [student_id, course_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        completed_course: {
          id: this.lastID,
          student_id,
          course_id
        }
      });
    }
  );
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

        // Get student's enrolled courses
        db.all('SELECT course_id FROM enrollments WHERE student_id = ?', [student.id], (err, enrolledCourses) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const enrolledCourseIds = enrolledCourses.map(c => c.course_id);

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

              return {
                ...course,
                is_completed: isCompleted,
                is_enrolled: isEnrolled,
                prerequisites: coursePrerequisites.map(p => p.prerequisite_id),
                all_prerequisites_met: allPrerequisitesMet,
                is_full: isFull,
                can_register: !isCompleted && !isEnrolled && allPrerequisitesMet && !isFull
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

    // Get enrolled students
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
