# University Registration System - Project Documentation

## Project Overview

This project is a comprehensive University Registration System built with Node.js, Express, and SQLite. It provides a platform for university administration and students to manage course registrations, enrollments, and academic progress. The system is designed with a clear separation between admin and student interfaces, with appropriate authentication and authorization mechanisms.

## Technology Stack

- **Backend**: Node.js with Express.js framework
- **Database**: SQLite (with sqlite3 library)
- **Session Management**: express-session
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Authentication**: Custom session-based authentication

## Project Structure

The project follows a modular structure:

```
/
├── .data/                  # Database storage (for persistence)
├── node_modules/           # Node.js dependencies
├── public/                 # Static frontend files
│   ├── admin/              # Admin interface
│   ├── css/                # Stylesheets
│   ├── images/             # Image assets
│   ├── js/                 # JavaScript files
│   ├── student/            # Student interface
│   └── index.html          # Main login page
├── server/                 # Backend code
│   ├── database.js         # Database connection and schema
│   ├── server.js           # Express server and API routes
│   └── university.db       # Initial database template
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── check-db.js             # Utility to check database
├── check-max-limit.js      # Utility to check enrollment limits
├── index.js                # Main entry point
├── package.json            # Project metadata and dependencies
├── package-lock.json       # Dependency lock file
├── README.md               # Project documentation
├── reset-enrollments.js    # Utility to reset enrollments
├── update-auto-logout.js   # Utility to update auto-logout settings
└── update-max-limit.js     # Utility to update enrollment limits
```

## Database Schema

The system uses SQLite with the following table structure:

### 1. users
- `id`: Primary key
- `username`: Unique username (student ID for students)
- `password`: Password (registration number for students)
- `role`: User role ('admin' or 'student')
- `created_at`: Timestamp

### 2. departments
- `id`: Primary key
- `name`: Department name
- `created_at`: Timestamp

### 3. students
- `id`: Primary key
- `student_id`: Unique student ID
- `user_id`: Foreign key to users table
- `name`: Student name
- `department_id`: Foreign key to departments table
- `registration_number`: Unique registration number
- `semester`: Current semester
- `group_name`: Optional group name
- `created_at`: Timestamp

### 4. courses
- `id`: Primary key
- `course_code`: Unique course code
- `name`: Course name
- `department_id`: Foreign key to departments table
- `max_students`: Maximum number of students allowed
- `semester`: Course semester
- `created_at`: Timestamp

### 5. prerequisites
- `id`: Primary key
- `course_id`: Foreign key to courses table
- `prerequisite_id`: Foreign key to courses table
- `created_at`: Timestamp

### 6. enrollments
- `id`: Primary key
- `student_id`: Foreign key to students table
- `course_id`: Foreign key to courses table
- `group_id`: Foreign key to course_groups table
- `status`: Enrollment status
- `created_at`: Timestamp

### 7. completed_courses
- `id`: Primary key
- `student_id`: Foreign key to students table
- `course_id`: Foreign key to courses table
- `completed_at`: Timestamp

### 8. course_groups
- `id`: Primary key
- `course_id`: Foreign key to courses table
- `group_name`: Group name
- `max_students`: Maximum students per group
- `professor_name`: Professor name
- `time_slot`: Class time slot
- `created_at`: Timestamp

### 9. system_settings
- `id`: Primary key
- `key`: Setting key
- `value`: Setting value
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Authentication and Authorization

The system implements a session-based authentication mechanism:

1. **Login Process**:
   - Users provide username and password
   - Server validates credentials against the database
   - Upon successful authentication, a session is created with user information

2. **Authorization**:
   - Middleware functions check user role and session validity
   - Different routes are protected based on user role (admin or student)
   - Session timeout is configurable through system settings

## API Endpoints

### Authentication
- `POST /api/login`: Authenticate user
- `GET /api/logout`: End user session
- `GET /api/user`: Get current user information

### Admin Routes
- **Students Management**:
  - `GET /api/admin/students`: Get all students
  - `GET /api/admin/students/:id`: Get student details
  - `POST /api/admin/students`: Add new student
  - `PUT /api/admin/students/:id`: Update student
  - `DELETE /api/admin/students/:id`: Delete student
  - `GET /api/admin/students/:id/courses`: Get student courses

- **Departments Management**:
  - `GET /api/admin/departments`: Get all departments
  - `GET /api/admin/departments/:id`: Get department details
  - `POST /api/admin/departments`: Add new department
  - `PUT /api/admin/departments/:id`: Update department
  - `DELETE /api/admin/departments/:id`: Delete department

- **Courses Management**:
  - `GET /api/admin/courses`: Get all courses
  - `GET /api/admin/courses/:id`: Get course details
  - `POST /api/admin/courses`: Add new course
  - `PUT /api/admin/courses/:id`: Update course
  - `DELETE /api/admin/courses/:id`: Delete course
  - `GET /api/admin/courses/:id/prerequisites`: Get course prerequisites

- **Prerequisites Management**:
  - `POST /api/admin/prerequisites`: Add prerequisite
  - `DELETE /api/admin/prerequisites/:id`: Delete prerequisite

- **Enrollments Management**:
  - `POST /api/admin/completed-courses`: Mark course as completed
  - `DELETE /api/admin/completed-courses/:id`: Delete completed course
  - `DELETE /api/admin/enrollments/:id`: Delete enrollment

### Student Routes
- `GET /api/student/info`: Get student information
- `GET /api/student/completed-courses`: Get completed courses
- `GET /api/student/available-courses`: Get available courses
- `POST /api/student/enroll`: Enroll in a course
- `DELETE /api/student/enrollments/:id`: Cancel enrollment

## Business Logic and Rules

1. **Course Prerequisites**:
   - Students can only enroll in courses if they have completed all prerequisites
   - The system prevents circular dependencies in prerequisites

2. **Enrollment Limits**:
   - Each course has a maximum number of students
   - Students can only enroll in a limited number of courses (configurable)
   - Enrollment is prevented if a course is full

3. **Department Restrictions**:
   - Students can only enroll in courses from their department
   - Departments cannot be deleted if they have associated students or courses

4. **Course Completion**:
   - When a course is marked as completed, any enrollment in that course is automatically removed
   - Completed courses count toward prerequisite requirements

5. **Auto-Logout**:
   - Configurable auto-logout feature for security
   - Timeout duration is adjustable through system settings

## Frontend Structure

The frontend is divided into two main sections:

1. **Admin Interface** (`/public/admin/`):
   - Dashboard with system overview
   - Students management
   - Departments management
   - Courses management
   - Prerequisites management
   - System settings

2. **Student Interface** (`/public/student/`):
   - Dashboard with enrollment status
   - Available courses view
   - Enrolled courses view
   - Completed courses view

## Deployment and Environment

The system is designed to be deployed on platforms like Glitch with:

- Environment variables for configuration
- Persistent database storage in the `.data` directory
- Default port 3000 (configurable via PORT environment variable)

## Security Considerations

1. **Authentication**: Session-based with configurable timeout
2. **Authorization**: Role-based access control
3. **Data Validation**: Input validation on both client and server sides
4. **Error Handling**: Proper error responses without exposing sensitive information

## Future Enhancements

1. Password hashing for improved security
2. Email notifications for enrollment status changes
3. Advanced reporting and analytics
4. Mobile-responsive design improvements
5. Support for multiple semesters and academic years
