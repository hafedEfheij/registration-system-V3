// Main JavaScript file

// Check if user is logged in
function checkAuth() {
    fetch('/api/user')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                // If not on login page, redirect to login
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    window.location.href = '/';
                }
                throw new Error('Not authenticated');
            }
        })
        .then(data => {
            // If on login page, redirect to appropriate dashboard
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin/dashboard.html';
                } else if (data.user.role === 'student') {
                    window.location.href = '/student/dashboard.html';
                }
            }

            // Set user info in navbar if it exists
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = data.user.username;
            }

            // Set role-specific elements
            if (data.user.role === 'admin') {
                const adminElements = document.querySelectorAll('.admin-only');
                adminElements.forEach(el => el.classList.remove('d-none'));
            } else if (data.user.role === 'student') {
                const studentElements = document.querySelectorAll('.student-only');
                studentElements.forEach(el => el.classList.remove('d-none'));
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
        });
}

// Handle login form submission
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin/dashboard.html';
                    } else if (data.user.role === 'student') {
                        window.location.href = '/student/dashboard.html';
                    }
                } else {
                    document.getElementById('login-error').classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                document.getElementById('login-error').classList.remove('d-none');
            });
        });
    }
}

// Handle logout
function setupLogout() {
    // Function to handle logout click
    function handleLogout(e) {
        e.preventDefault();

        fetch('/api/logout')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
            });
    }

    // Setup main logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Setup sidebar logout button
    const sidebarLogoutButton = document.getElementById('sidebar-logout-button');
    if (sidebarLogoutButton) {
        sidebarLogoutButton.addEventListener('click', handleLogout);
    }

    // Setup all logout buttons with class
    document.querySelectorAll('.logout-button').forEach(button => {
        button.addEventListener('click', handleLogout);
    });
}

// Admin: Load students
function loadStudents(filterDepartment = '', searchTerm = '', filterSemester = '') {
    const studentsTable = document.getElementById('students-table-body');
    const filterDepartmentSelect = document.getElementById('filter-student-department-select');
    const filterSemesterSelect = document.getElementById('filter-student-semester-select');

    if (studentsTable) {
        fetch('/api/admin/students')
            .then(response => response.json())
            .then(data => {
                // Store all students globally
                allStudents = data.students;

                // Fill filter department select if it exists and not already initialized
                if (filterDepartmentSelect && !window.departmentSelectInitialized) {
                    // Keep the first option (All departments)
                    filterDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';

                    // Get unique departments
                    const departmentMap = {};
                    data.students.forEach(student => {
                        if (student.department_id && student.department_name) {
                            departmentMap[student.department_id] = student.department_name;
                        }
                    });

                    // Add department options
                    Object.keys(departmentMap).forEach(departmentId => {
                        const option = document.createElement('option');
                        option.value = departmentId;
                        option.textContent = departmentMap[departmentId];
                        filterDepartmentSelect.appendChild(option);
                    });

                    // Mark as initialized
                    window.departmentSelectInitialized = true;
                }

                // Set selected department if provided
                if (filterDepartmentSelect && filterDepartment) {
                    filterDepartmentSelect.value = filterDepartment;
                }

                // Set selected semester if provided
                if (filterSemesterSelect) {
                    // Ensure the value is set correctly without triggering events
                    // This prevents unnecessary reloads that cause page jumping
                    filterSemesterSelect.value = filterSemester;
                }

                studentsTable.innerHTML = '';

                // Filter students based on department, semester, and search term
                let filteredStudents = data.students;

                // Update current filters display
                const currentFilters = document.getElementById('current-filters');
                const currentFilterText = document.getElementById('current-filter-text');

                // Build filter description
                let filterDescription = 'عرض';
                let hasFilters = false;

                if (filterDepartment) {
                    filteredStudents = filteredStudents.filter(student => student.department_id == filterDepartment);
                    // Get department name
                    const departmentName = filterDepartmentSelect.options[filterDepartmentSelect.selectedIndex].text;
                    filterDescription += ` طلبة تخصص ${departmentName}`;
                    hasFilters = true;

                    // Highlight the department select
                    filterDepartmentSelect.classList.add('border-primary');
                    filterDepartmentSelect.parentElement.querySelector('.input-group-text').classList.add('bg-primary', 'text-white');
                } else {
                    // Remove highlight if no department filter
                    filterDepartmentSelect.classList.remove('border-primary');
                    const groupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }

                if (filterSemester) {
                    filteredStudents = filteredStudents.filter(student => student.semester === filterSemester);
                    // Get semester name
                    const semesterName = filterSemesterSelect.options[filterSemesterSelect.selectedIndex].text;
                    if (hasFilters) {
                        filterDescription += ` في ${semesterName}`;
                    } else {
                        filterDescription += ` طلبة ${semesterName}`;
                        hasFilters = true;
                    }

                    // Highlight the semester select
                    filterSemesterSelect.classList.add('border-primary');
                    filterSemesterSelect.parentElement.querySelector('.input-group-text').classList.add('bg-primary', 'text-white');
                } else {
                    // Remove highlight if no semester filter
                    filterSemesterSelect.classList.remove('border-primary');
                    const groupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }

                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    filteredStudents = filteredStudents.filter(student =>
                        student.student_id.toLowerCase().includes(searchLower) ||
                        student.name.toLowerCase().includes(searchLower) ||
                        (student.registration_number && student.registration_number.toLowerCase().includes(searchLower))
                    );

                    if (hasFilters) {
                        filterDescription += ` (بحث: ${searchTerm})`;
                    } else {
                        filterDescription += ` نتائج البحث عن "${searchTerm}"`;
                        hasFilters = true;
                    }
                }

                if (!hasFilters) {
                    filterDescription += ' جميع الطلبة';
                }

                // Update filter display
                if (currentFilters && currentFilterText) {
                    currentFilterText.textContent = filterDescription;
                    if (hasFilters) {
                        currentFilters.classList.remove('d-none');
                    } else {
                        currentFilters.classList.add('d-none');
                    }
                }

                if (filteredStudents.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="6" class="text-center">لا يوجد طلاب مطابقين للبحث</td>
                    `;
                    studentsTable.appendChild(row);
                } else {
                    filteredStudents.forEach(student => {
                        // Ensure semester has a value
                        const semester = student.semester || 'الأول';

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${student.student_id}</td>
                            <td>${student.name}</td>
                            <td>${student.department_name || 'غير محدد'}</td>
                            <td>${semester}</td>
                            <td>${student.registration_number}</td>
                            <td>
                                <div class="d-flex flex-column flex-sm-row gap-1">
                                    <button class="btn btn-sm btn-primary edit-student mb-1 mb-sm-0" data-id="${student.id}">
                                        <i class="fas fa-edit"></i> <span class="d-none d-md-inline">تعديل</span>
                                    </button>
                                    <button class="btn btn-sm btn-info view-courses mb-1 mb-sm-0" data-id="${student.id}">
                                        <i class="fas fa-book"></i> <span class="d-none d-md-inline">المواد</span>
                                    </button>
                                    <button class="btn btn-sm btn-success view-student-report mb-1 mb-sm-0" data-id="${student.id}">
                                        <i class="fas fa-file-alt"></i> <span class="d-none d-md-inline">عرض تقرير</span>
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-student" data-id="${student.id}">
                                        <i class="fas fa-trash"></i> <span class="d-none d-md-inline">حذف</span>
                                    </button>
                                </div>
                            </td>
                        `;
                        studentsTable.appendChild(row);
                    });
                }

                // Setup edit buttons
                document.querySelectorAll('.edit-student').forEach(button => {
                    button.addEventListener('click', function() {
                        const studentId = this.getAttribute('data-id');
                        openEditStudentModal(studentId);
                    });
                });

                // Setup view courses buttons
                document.querySelectorAll('.view-courses').forEach(button => {
                    button.addEventListener('click', function() {
                        const studentId = this.getAttribute('data-id');
                        openStudentCoursesModal(studentId);
                    });
                });

                // Setup view student report buttons
                document.querySelectorAll('.view-student-report').forEach(button => {
                    button.addEventListener('click', function() {
                        const studentId = this.getAttribute('data-id');
                        openStudentReportModal(studentId);
                    });
                });

                // Setup delete student buttons
                document.querySelectorAll('.delete-student').forEach(button => {
                    button.addEventListener('click', function() {
                        const studentId = this.getAttribute('data-id');
                        const studentName = this.closest('tr').querySelector('td:nth-child(2)').textContent;
                        if (confirm(`هل أنت متأكد من حذف الطالب "${studentName}"؟`)) {
                            deleteStudent(studentId);
                        }
                    });
                });

                // Setup student search and filter events only if this is the first load
                // This prevents multiple event handlers being attached which can cause page jumping
                if (!window.studentsFiltersInitialized) {
                    setupStudentFilters();
                    window.studentsFiltersInitialized = true;
                }
            })
            .catch(error => {
                console.error('Error loading students:', error);
            });
    }
}

// Admin: Load departments
function loadDepartments() {
    const departmentsTable = document.getElementById('departments-table-body');
    const departmentSelect = document.getElementById('department-select');
    const courseDepartmentSelect = document.getElementById('course-department-select');
    const editDepartmentSelect = document.getElementById('edit-department-select');

    fetch('/api/admin/departments')
        .then(response => response.json())
        .then(data => {
            // Fill departments table if it exists
            if (departmentsTable) {
                departmentsTable.innerHTML = '';

                data.departments.forEach(department => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${department.id}</td>
                        <td>${department.name}</td>
                        <td>
                            <div class="d-flex flex-column flex-sm-row gap-1">
                                <button class="btn btn-sm btn-primary edit-department mb-1 mb-sm-0" data-id="${department.id}">
                                    <i class="fas fa-edit"></i> <span class="d-none d-md-inline">تعديل</span>
                                </button>
                                <button class="btn btn-sm btn-danger delete-department" data-id="${department.id}">
                                    <i class="fas fa-trash"></i> <span class="d-none d-md-inline">حذف</span>
                                </button>
                            </div>
                        </td>
                    `;
                    departmentsTable.appendChild(row);
                });

                // Setup edit department buttons
                document.querySelectorAll('.edit-department').forEach(button => {
                    button.addEventListener('click', function() {
                        const departmentId = this.getAttribute('data-id');
                        openEditDepartmentModal(departmentId);
                    });
                });

                // Setup delete department buttons
                document.querySelectorAll('.delete-department').forEach(button => {
                    button.addEventListener('click', function() {
                        const departmentId = this.getAttribute('data-id');
                        const departmentName = this.closest('tr').querySelector('td:nth-child(2)').textContent;
                        if (confirm(`هل أنت متأكد من حذف التخصص "${departmentName}"؟`)) {
                            deleteDepartment(departmentId);
                        }
                    });
                });
            }

            // Fill all department selects
            const fillDepartmentSelect = (selectElement) => {
                if (selectElement) {
                    selectElement.innerHTML = '<option value="">اختر التخصص</option>';

                    data.departments.forEach(department => {
                        const option = document.createElement('option');
                        option.value = department.id;
                        option.textContent = department.name;
                        selectElement.appendChild(option);
                    });
                }
            };

            // Fill all department selects
            fillDepartmentSelect(departmentSelect);
            fillDepartmentSelect(courseDepartmentSelect);
            fillDepartmentSelect(editDepartmentSelect);

            console.log('Departments loaded:', data.departments.length);
        })
        .catch(error => {
            console.error('Error loading departments:', error);
        });
}

// Global variables to store all courses and students
let allCourses = [];
let allStudents = [];

// Admin: Load courses
function loadCourses(filterDepartment = '', searchTerm = '', filterSemester = '') {
    const coursesTable = document.getElementById('courses-table-body');
    const courseSelect = document.getElementById('course-select');
    const prerequisiteSelect = document.getElementById('prerequisite-select');
    const filterDepartmentSelect = document.getElementById('filter-department-select');
    const filterSemesterSelect = document.getElementById('filter-course-semester-select');

    fetch('/api/admin/courses')
        .then(response => response.json())
        .then(data => {
            // Store all courses globally
            allCourses = data.courses;

            // Fill filter department select if it exists and not already initialized
            if (filterDepartmentSelect && !window.courseDepartmentSelectInitialized) {
                // Get unique departments
                const departments = [...new Set(data.courses.map(course => course.department_id))];

                // Keep the first option (All departments)
                filterDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';

                // Get department names from courses
                const departmentMap = {};
                data.courses.forEach(course => {
                    if (course.department_id && course.department_name) {
                        departmentMap[course.department_id] = course.department_name;
                    }
                });

                // Add department options
                Object.keys(departmentMap).forEach(departmentId => {
                    const option = document.createElement('option');
                    option.value = departmentId;
                    option.textContent = departmentMap[departmentId];
                    filterDepartmentSelect.appendChild(option);
                });

                // Mark as initialized
                window.courseDepartmentSelectInitialized = true;
            }

            // Set selected department if provided
            if (filterDepartmentSelect && filterDepartment) {
                filterDepartmentSelect.value = filterDepartment;
            }

            // Set selected semester if provided
            if (filterSemesterSelect && filterSemester) {
                filterSemesterSelect.value = filterSemester;
            }

            // Fill courses table if it exists
            if (coursesTable) {
                coursesTable.innerHTML = '';

                // Filter courses based on department, semester, and search term
                let filteredCourses = data.courses;

                // Update current filters display
                const currentFilters = document.getElementById('current-course-filters');
                const currentFilterText = document.getElementById('current-course-filter-text');

                // Build filter description
                let filterDescription = 'عرض';
                let hasFilters = false;

                if (filterDepartment) {
                    filteredCourses = filteredCourses.filter(course => course.department_id == filterDepartment);
                    // Get department name
                    const departmentName = filterDepartmentSelect.options[filterDepartmentSelect.selectedIndex].text;
                    filterDescription += ` مواد تخصص ${departmentName}`;
                    hasFilters = true;

                    // Highlight the department select
                    filterDepartmentSelect.classList.add('border-primary');
                    filterDepartmentSelect.parentElement.querySelector('.input-group-text').classList.add('bg-primary', 'text-white');
                } else {
                    // Remove highlight if no department filter
                    filterDepartmentSelect.classList.remove('border-primary');
                    const groupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }

                if (filterSemester) {
                    filteredCourses = filteredCourses.filter(course => course.semester === filterSemester);
                    // Get semester name
                    const semesterName = filterSemesterSelect.options[filterSemesterSelect.selectedIndex].text;
                    if (hasFilters) {
                        filterDescription += ` في ${semesterName}`;
                    } else {
                        filterDescription += ` مواد ${semesterName}`;
                        hasFilters = true;
                    }

                    // Highlight the semester select
                    filterSemesterSelect.classList.add('border-primary');
                    filterSemesterSelect.parentElement.querySelector('.input-group-text').classList.add('bg-primary', 'text-white');
                } else {
                    // Remove highlight if no semester filter
                    filterSemesterSelect.classList.remove('border-primary');
                    const groupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }

                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    filteredCourses = filteredCourses.filter(course =>
                        course.course_code.toLowerCase().includes(searchLower) ||
                        course.name.toLowerCase().includes(searchLower)
                    );

                    if (hasFilters) {
                        filterDescription += ` (بحث: ${searchTerm})`;
                    } else {
                        filterDescription += ` نتائج البحث عن "${searchTerm}"`;
                        hasFilters = true;
                    }
                }

                if (!hasFilters) {
                    filterDescription += ' جميع المواد';
                }

                // Update filter display
                if (currentFilters && currentFilterText) {
                    currentFilterText.textContent = filterDescription;
                    if (hasFilters) {
                        currentFilters.classList.remove('d-none');
                    } else {
                        currentFilters.classList.add('d-none');
                    }
                }

                if (filteredCourses.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="6" class="text-center">لا توجد مواد مطابقة للبحث</td>
                    `;
                    coursesTable.appendChild(row);
                } else {
                    filteredCourses.forEach(course => {
                        // Ensure semester has a value or display a dash
                        const semester = course.semester || '-';

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${course.course_code}</td>
                            <td>${course.name}</td>
                            <td>${course.department_name || 'غير محدد'}</td>
                            <td>${semester}</td>
                            <td>${course.max_students}</td>
                            <td>
                                <div class="d-flex flex-column flex-sm-row gap-1">
                                    <button class="btn btn-sm btn-primary edit-course mb-1 mb-sm-0" data-id="${course.id}">
                                        <i class="fas fa-edit"></i> <span class="d-none d-md-inline">تعديل</span>
                                    </button>
                                    <button class="btn btn-sm btn-info manage-prerequisites mb-1 mb-sm-0" data-id="${course.id}">
                                        <i class="fas fa-link"></i> <span class="d-none d-md-inline">المتطلبات</span>
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-course" data-id="${course.id}">
                                        <i class="fas fa-trash"></i> <span class="d-none d-md-inline">حذف</span>
                                    </button>
                                </div>
                            </td>
                        `;
                        coursesTable.appendChild(row);
                    });
                }

                // Setup edit course buttons
                document.querySelectorAll('.edit-course').forEach(button => {
                    button.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        openEditCourseModal(courseId);
                    });
                });

                // Setup manage prerequisites buttons
                document.querySelectorAll('.manage-prerequisites').forEach(button => {
                    button.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        openCoursePrerequisitesModal(courseId);
                    });
                });

                // Setup delete course buttons
                document.querySelectorAll('.delete-course').forEach(button => {
                    button.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        const courseName = this.closest('tr').querySelector('td:nth-child(2)').textContent;
                        if (confirm(`هل أنت متأكد من حذف المادة "${courseName}"؟`)) {
                            deleteCourse(courseId);
                        }
                    });
                });
            }

            // Fill course select if it exists
            if (courseSelect) {
                courseSelect.innerHTML = '<option value="">اختر المادة</option>';

                data.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.name}`;
                    option.dataset.departmentId = course.department_id || '';
                    courseSelect.appendChild(option);
                });

                // Add change event to update prerequisite select
                courseSelect.addEventListener('change', function() {
                    const selectedCourseId = this.value;
                    updatePrerequisiteSelect(selectedCourseId);
                });
            }

            // Fill prerequisite department select if it exists
            const prerequisiteDepartmentSelect = document.getElementById('prerequisite-department-select');
            if (prerequisiteDepartmentSelect) {
                // Keep the first option (All departments)
                prerequisiteDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';

                // Get unique departments
                const departmentMap = {};
                data.courses.forEach(course => {
                    if (course.department_id && course.department_name) {
                        departmentMap[course.department_id] = course.department_name;
                    }
                });

                // Add department options
                Object.keys(departmentMap).forEach(departmentId => {
                    const option = document.createElement('option');
                    option.value = departmentId;
                    option.textContent = departmentMap[departmentId];
                    prerequisiteDepartmentSelect.appendChild(option);
                });

                // Remove existing event listeners by cloning and replacing the element
                const oldSelect = prerequisiteDepartmentSelect;
                const newSelect = oldSelect.cloneNode(true);
                oldSelect.parentNode.replaceChild(newSelect, oldSelect);

                // Get the new reference after replacement
                const newPrerequisiteDepartmentSelect = document.getElementById('prerequisite-department-select');

                // Add change event to filter both course and prerequisite selects
                newPrerequisiteDepartmentSelect.addEventListener('change', function() {
                    const selectedDepartmentId = this.value;
                    console.log("Main form: Department changed to:", selectedDepartmentId);

                    // Filter course select
                    filterCourseSelectByDepartment(selectedDepartmentId);

                    // Filter prerequisite select
                    const selectedCourseId = courseSelect ? courseSelect.value : '';
                    filterPrerequisiteSelectByDepartment(selectedDepartmentId, selectedCourseId);
                });
            }

            // Fill prerequisite select if it exists
            if (prerequisiteSelect) {
                prerequisiteSelect.innerHTML = '<option value="">اختر المادة المتطلبة</option>';

                // Initially show all courses in the prerequisite select
                data.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.name}`;
                    option.dataset.departmentId = course.department_id || '';
                    prerequisiteSelect.appendChild(option);
                });
            }

            // Setup course search and filter events only if this is the first load
            // This prevents multiple event handlers being attached which can cause page jumping
            if (!window.courseFiltersInitialized) {
                setupCourseFilters();
                window.courseFiltersInitialized = true;
            }
        })
        .catch(error => {
            console.error('Error loading courses:', error);
        });
}

// Update prerequisite select based on selected course
function updatePrerequisiteSelect(selectedCourseId) {
    const prerequisiteSelect = document.getElementById('prerequisite-select');
    const prerequisiteDepartmentSelect = document.getElementById('prerequisite-department-select');

    if (!prerequisiteSelect || !selectedCourseId) {
        return;
    }

    // Save current scroll position
    const scrollPosition = window.scrollY;

    // Get all courses from global variable
    const courses = allCourses;

    // Clear and reset prerequisite select
    prerequisiteSelect.innerHTML = '<option value="">اختر المادة المتطلبة</option>';

    // Add all courses except the selected one
    courses.forEach(course => {
        // Don't include the selected course in the prerequisite options
        if (course.id != selectedCourseId) {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = `${course.course_code} - ${course.name}`;
            option.dataset.departmentId = course.department_id || '';
            prerequisiteSelect.appendChild(option);
        }
    });

    // Apply department filter if selected
    if (prerequisiteDepartmentSelect && prerequisiteDepartmentSelect.value) {
        filterPrerequisiteSelectByDepartment(prerequisiteDepartmentSelect.value, selectedCourseId);
    }

    // Restore scroll position
    window.scrollTo(0, scrollPosition);

    console.log(`Updated prerequisite select: Filtered out course ID ${selectedCourseId}`);
}

// Filter course select by department
function filterCourseSelectByDepartment(departmentId) {
    const courseSelect = document.getElementById('course-select');

    if (!courseSelect) {
        console.error("Could not find course-select element");
        return;
    }

    // Save current scroll position
    const scrollPosition = window.scrollY;

    // Save selected value
    const selectedValue = courseSelect.value;

    // Show loading indicator in the select
    courseSelect.innerHTML = '<option value="">جاري تحميل المواد...</option>';
    courseSelect.disabled = true;

    console.log(`Main form: Filtering courses by department ID: ${departmentId || 'all'}`);

    // Instead of filtering existing options, we'll reload all courses and filter them
    // This ensures we always have the complete list of courses to filter from
    fetch('/api/admin/courses')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المواد');
            }
            return response.json();
        })
        .then(data => {
            // Clear select and add placeholder
            courseSelect.innerHTML = '<option value="">اختر المادة</option>';
            courseSelect.disabled = false;

            if (data.courses && data.courses.length > 0) {
                // Filter courses by department if specified
                const filteredCourses = data.courses.filter(course => {
                    // Filter by department if specified
                    if (departmentId && course.department_id != departmentId) {
                        return false;
                    }
                    return true;
                });

                // Add filtered courses to select
                filteredCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.name}`;
                    option.dataset.departmentId = course.department_id || '';
                    courseSelect.appendChild(option);
                });

                console.log(`Main form: Filtered courses by department ID ${departmentId || 'all'}, showing ${filteredCourses.length} courses`);

                // If no courses were found, show a message
                if (filteredCourses.length === 0) {
                    courseSelect.innerHTML = '<option value="">لا توجد مواد متاحة في هذا التخصص</option>';
                } else {
                    // Try to restore selected value if it still exists in the filtered options
                    if (selectedValue) {
                        const stillExists = Array.from(courseSelect.options).some(option => option.value === selectedValue);
                        if (stillExists) {
                            courseSelect.value = selectedValue;
                        } else {
                            // If the previously selected value doesn't exist anymore, reset to placeholder
                            courseSelect.value = '';
                            // Also update prerequisite select since course changed
                            updatePrerequisiteSelect('');
                        }
                    }
                }
            } else {
                courseSelect.innerHTML = '<option value="">لا توجد مواد متاحة</option>';
            }

            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        })
        .catch(error => {
            console.error('Error reloading courses for department filter:', error);
            // Keep the placeholder in case of error
            courseSelect.innerHTML = '<option value="">خطأ في تحميل المواد</option>';
            courseSelect.disabled = false;
            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        });
}

// Filter prerequisite select by department
function filterPrerequisiteSelectByDepartment(departmentId, selectedCourseId) {
    const prerequisiteSelect = document.getElementById('prerequisite-select');

    if (!prerequisiteSelect) {
        console.error("Could not find prerequisite-select element");
        return;
    }

    // Save current scroll position
    const scrollPosition = window.scrollY;

    // Save selected value
    const selectedValue = prerequisiteSelect.value;

    // Show loading indicator in the select
    prerequisiteSelect.innerHTML = '<option value="">جاري تحميل المواد...</option>';
    prerequisiteSelect.disabled = true;

    console.log(`Main form: Filtering prerequisites by department ID: ${departmentId || 'all'}, course ID: ${selectedCourseId || 'none'}`);

    // Instead of filtering existing options, we'll reload all courses and filter them
    // This ensures we always have the complete list of courses to filter from
    fetch('/api/admin/courses')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المواد');
            }
            return response.json();
        })
        .then(data => {
            // Clear select and add placeholder
            prerequisiteSelect.innerHTML = '<option value="">اختر المادة المتطلبة</option>';
            prerequisiteSelect.disabled = false;

            if (data.courses && data.courses.length > 0) {
                // Filter out the current course
                const filteredCourses = data.courses.filter(course => {
                    // Don't include the selected course
                    if (selectedCourseId && course.id == selectedCourseId) {
                        return false;
                    }

                    // Filter by department if specified
                    if (departmentId && course.department_id != departmentId) {
                        return false;
                    }

                    return true;
                });

                // Add filtered courses to select
                filteredCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.name}`;
                    option.dataset.departmentId = course.department_id || '';
                    prerequisiteSelect.appendChild(option);
                });

                console.log(`Main form: Filtered courses by department ID ${departmentId || 'all'}, showing ${filteredCourses.length} courses`);

                // If no courses were found, show a message
                if (filteredCourses.length === 0) {
                    prerequisiteSelect.innerHTML = '<option value="">لا توجد مواد متاحة في هذا التخصص</option>';
                } else {
                    // Try to restore selected value if it still exists in the filtered options
                    if (selectedValue) {
                        const stillExists = Array.from(prerequisiteSelect.options).some(option => option.value === selectedValue);
                        if (stillExists) {
                            prerequisiteSelect.value = selectedValue;
                        } else {
                            // If the previously selected value doesn't exist anymore, reset to placeholder
                            prerequisiteSelect.value = '';
                        }
                    }
                }
            } else {
                prerequisiteSelect.innerHTML = '<option value="">لا توجد مواد متاحة</option>';
            }

            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        })
        .catch(error => {
            console.error('Error reloading courses for department filter:', error);
            // Keep the placeholder in case of error
            prerequisiteSelect.innerHTML = '<option value="">خطأ في تحميل المواد</option>';
            prerequisiteSelect.disabled = false;
            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        });
}

// Setup course search and filter events
function setupCourseFilters() {
    const searchInput = document.getElementById('course-search');
    const searchButton = document.getElementById('course-search-btn');
    const filterDepartmentSelect = document.getElementById('filter-department-select');
    const filterSemesterSelect = document.getElementById('filter-course-semester-select');
    const resetFiltersButton = document.getElementById('reset-filters');

    if (searchInput && searchButton) {
        // Remove existing event listeners
        searchButton.replaceWith(searchButton.cloneNode(true));
        const newSearchButton = document.getElementById('course-search-btn');

        // Search on button click
        newSearchButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchTerm = searchInput.value.trim();
            const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
            const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

            // Store current filter values in window object to preserve them
            window.currentCourseFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load courses with the filter
            loadCourses(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });

        // Remove existing event listeners
        searchInput.replaceWith(searchInput.cloneNode(true));
        const newSearchInput = document.getElementById('course-search');

        // Search on Enter key
        newSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                // Save current scroll position
                const scrollPosition = window.scrollY;

                const searchTerm = newSearchInput.value.trim();
                const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
                const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

                // Store current filter values in window object to preserve them
                window.currentCourseFilters = {
                    department: filterDepartment,
                    semester: filterSemester,
                    search: searchTerm
                };

                // Load courses with the filter
                loadCourses(filterDepartment, searchTerm, filterSemester);

                // Restore scroll position after a short delay
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                    });
                }, 10);
            }
        });
    }

    if (filterDepartmentSelect) {
        // Remove existing event listeners
        filterDepartmentSelect.replaceWith(filterDepartmentSelect.cloneNode(true));
        const newFilterDepartmentSelect = document.getElementById('filter-department-select');

        // Filter on department change
        newFilterDepartmentSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const filterDepartment = newFilterDepartmentSelect.value;
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const newFilterSemesterSelect = document.getElementById('filter-course-semester-select');
            const filterSemester = newFilterSemesterSelect ? newFilterSemesterSelect.value : '';

            // Apply visual highlight immediately without waiting for reload
            if (filterDepartment) {
                newFilterDepartmentSelect.classList.add('border-primary');
                const groupText = newFilterDepartmentSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.add('bg-primary', 'text-white');
                    groupText.classList.remove('bg-light');
                }
            } else {
                newFilterDepartmentSelect.classList.remove('border-primary');
                const groupText = newFilterDepartmentSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.remove('bg-primary', 'text-white');
                    groupText.classList.add('bg-light');
                }
            }

            // Store current filter values in window object to preserve them
            window.currentCourseFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load courses with the filter
            loadCourses(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }

    if (filterSemesterSelect) {
        // Store current value before replacing
        const currentValue = filterSemesterSelect.value;

        // Remove existing event listeners
        filterSemesterSelect.replaceWith(filterSemesterSelect.cloneNode(true));
        const newFilterSemesterSelect = document.getElementById('filter-course-semester-select');

        // Restore the selected value
        if (currentValue) {
            newFilterSemesterSelect.value = currentValue;
        }

        // Filter on semester change
        newFilterSemesterSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            // Get current filter values
            const newFilterDepartmentSelect = document.getElementById('filter-department-select');
            const filterDepartment = newFilterDepartmentSelect ? newFilterDepartmentSelect.value : '';
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const filterSemester = newFilterSemesterSelect.value;

            // Update the select element's title attribute to show the current selection
            const selectedOption = newFilterSemesterSelect.options[newFilterSemesterSelect.selectedIndex];
            newFilterSemesterSelect.title = selectedOption.text;

            // Apply visual highlight immediately without waiting for reload
            if (filterSemester) {
                newFilterSemesterSelect.classList.add('border-primary');
                const groupText = newFilterSemesterSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.add('bg-primary', 'text-white');
                    groupText.classList.remove('bg-light');
                }
            } else {
                newFilterSemesterSelect.classList.remove('border-primary');
                const groupText = newFilterSemesterSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.remove('bg-primary', 'text-white');
                    groupText.classList.add('bg-light');
                }
            }

            // Store current filter values in window object to preserve them
            window.currentCourseFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load courses with the filter
            loadCourses(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });

        // Set initial title
        const selectedOption = newFilterSemesterSelect.options[newFilterSemesterSelect.selectedIndex];
        newFilterSemesterSelect.title = selectedOption.text;
    }

    if (resetFiltersButton) {
        // Remove existing event listeners
        resetFiltersButton.replaceWith(resetFiltersButton.cloneNode(true));
        const newResetFiltersButton = document.getElementById('reset-filters');

        // Reset filters
        newResetFiltersButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchInput = document.getElementById('course-search');
            const filterDepartmentSelect = document.getElementById('filter-department-select');
            const filterSemesterSelect = document.getElementById('filter-course-semester-select');

            if (searchInput) searchInput.value = '';

            // Reset department filter and remove highlight
            if (filterDepartmentSelect) {
                filterDepartmentSelect.value = '';
                filterDepartmentSelect.classList.remove('border-primary');
                const deptGroupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                if (deptGroupText) {
                    deptGroupText.classList.remove('bg-primary', 'text-white');
                    deptGroupText.classList.add('bg-light');
                }
            }

            // Reset semester filter and remove highlight
            if (filterSemesterSelect) {
                filterSemesterSelect.value = '';
                filterSemesterSelect.classList.remove('border-primary');
                const semGroupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                if (semGroupText) {
                    semGroupText.classList.remove('bg-primary', 'text-white');
                    semGroupText.classList.add('bg-light');
                }
            }

            // Hide current filters display
            const currentFilters = document.getElementById('current-course-filters');
            if (currentFilters) {
                currentFilters.classList.add('d-none');
            }

            // Clear stored filters
            window.currentCourseFilters = {
                department: '',
                semester: '',
                search: ''
            };

            // Load courses with no filters
            loadCourses('', '', '');

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }
}

// Setup student search and filter events
function setupStudentFilters() {
    const searchInput = document.getElementById('student-search');
    const searchButton = document.getElementById('student-search-btn');
    const filterDepartmentSelect = document.getElementById('filter-student-department-select');
    const filterSemesterSelect = document.getElementById('filter-student-semester-select');
    const resetFiltersButton = document.getElementById('reset-student-filters');

    if (searchInput && searchButton) {
        // Remove existing event listeners
        searchButton.replaceWith(searchButton.cloneNode(true));
        const newSearchButton = document.getElementById('student-search-btn');

        // Search on button click
        newSearchButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchTerm = searchInput.value.trim();
            const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
            const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

            // Load students with the filter
            loadStudents(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });

        // Remove existing event listeners
        searchInput.replaceWith(searchInput.cloneNode(true));
        const newSearchInput = document.getElementById('student-search');

        // Search on Enter key
        newSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                // Save current scroll position
                const scrollPosition = window.scrollY;

                const searchTerm = newSearchInput.value.trim();
                const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
                const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

                // Load students with the filter
                loadStudents(filterDepartment, searchTerm, filterSemester);

                // Restore scroll position after a short delay
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                    });
                }, 10);
            }
        });
    }

    if (filterDepartmentSelect) {
        // Remove existing event listeners
        filterDepartmentSelect.replaceWith(filterDepartmentSelect.cloneNode(true));
        const newFilterDepartmentSelect = document.getElementById('filter-student-department-select');

        // Filter on department change
        newFilterDepartmentSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const filterDepartment = newFilterDepartmentSelect.value;
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const newFilterSemesterSelect = document.getElementById('filter-student-semester-select');
            const filterSemester = newFilterSemesterSelect ? newFilterSemesterSelect.value : '';

            // Apply visual highlight immediately without waiting for reload
            if (filterDepartment) {
                newFilterDepartmentSelect.classList.add('border-primary');
                const groupText = newFilterDepartmentSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.add('bg-primary', 'text-white');
                    groupText.classList.remove('bg-light');
                }
            } else {
                newFilterDepartmentSelect.classList.remove('border-primary');
                const groupText = newFilterDepartmentSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.remove('bg-primary', 'text-white');
                    groupText.classList.add('bg-light');
                }
            }

            // Store current filter values in window object to preserve them
            window.currentFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load students with the filter
            loadStudents(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }

    if (resetFiltersButton) {
        // Remove existing event listeners
        resetFiltersButton.replaceWith(resetFiltersButton.cloneNode(true));
        const newResetFiltersButton = document.getElementById('reset-student-filters');

        // Reset filters
        newResetFiltersButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchInput = document.getElementById('student-search');
            const filterDepartmentSelect = document.getElementById('filter-student-department-select');
            const filterSemesterSelect = document.getElementById('filter-student-semester-select');

            if (searchInput) searchInput.value = '';

            // Reset department filter and remove highlight
            if (filterDepartmentSelect) {
                filterDepartmentSelect.value = '';
                filterDepartmentSelect.classList.remove('border-primary');
                const deptGroupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                if (deptGroupText) {
                    deptGroupText.classList.remove('bg-primary', 'text-white');
                    deptGroupText.classList.add('bg-light');
                }
            }

            // Reset semester filter and remove highlight
            if (filterSemesterSelect) {
                filterSemesterSelect.value = '';
                filterSemesterSelect.classList.remove('border-primary');
                const semGroupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                if (semGroupText) {
                    semGroupText.classList.remove('bg-primary', 'text-white');
                    semGroupText.classList.add('bg-light');
                }
            }

            // Hide current filters display
            const currentFilters = document.getElementById('current-filters');
            if (currentFilters) {
                currentFilters.classList.add('d-none');
            }

            // Load students with no filters
            loadStudents('', '', '');

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }

    if (filterSemesterSelect) {
        // Store current value before replacing
        const currentValue = filterSemesterSelect.value;

        // Remove existing event listeners
        filterSemesterSelect.replaceWith(filterSemesterSelect.cloneNode(true));
        const newFilterSemesterSelect = document.getElementById('filter-student-semester-select');

        // Restore the selected value
        if (currentValue) {
            newFilterSemesterSelect.value = currentValue;
        }

        // Filter on semester change
        newFilterSemesterSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            // Get current filter values
            const newFilterDepartmentSelect = document.getElementById('filter-student-department-select');
            const filterDepartment = newFilterDepartmentSelect ? newFilterDepartmentSelect.value : '';
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const filterSemester = newFilterSemesterSelect.value;

            // Update the select element's title attribute to show the current selection
            const selectedOption = newFilterSemesterSelect.options[newFilterSemesterSelect.selectedIndex];
            newFilterSemesterSelect.title = selectedOption.text;

            // Apply visual highlight immediately without waiting for reload
            if (filterSemester) {
                newFilterSemesterSelect.classList.add('border-primary');
                const groupText = newFilterSemesterSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.add('bg-primary', 'text-white');
                    groupText.classList.remove('bg-light');
                }
            } else {
                newFilterSemesterSelect.classList.remove('border-primary');
                const groupText = newFilterSemesterSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.remove('bg-primary', 'text-white');
                    groupText.classList.add('bg-light');
                }
            }

            // Store current filter values in window object to preserve them
            window.currentFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load students with the filter
            loadStudents(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });

        // Set initial title
        const selectedOption = newFilterSemesterSelect.options[newFilterSemesterSelect.selectedIndex];
        newFilterSemesterSelect.title = selectedOption.text;
    }

    // Setup filtered report button
    const showFilteredReportBtn = document.getElementById('show-filtered-report');

    if (showFilteredReportBtn) {
        showFilteredReportBtn.addEventListener('click', function() {
            const filterDepartmentSelect = document.getElementById('filter-student-department-select');
            const filterSemesterSelect = document.getElementById('filter-student-semester-select');
            const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
            const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

            // Allow showing all students if no filter is selected
            openFilteredReportModal(filterDepartment, filterSemester);
        });
    }
}

// Admin: Setup add student form
function setupAddStudentForm() {
    const addStudentForm = document.getElementById('add-student-form');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Hide any previous messages
            document.getElementById('student-form-error').classList.add('d-none');
            document.getElementById('student-form-success').classList.add('d-none');

            const name = document.getElementById('student-name').value;
            const student_id = document.getElementById('student-id').value;
            const department_id = document.getElementById('department-select').value;
            const registration_number = document.getElementById('registration-number').value;
            const semester = document.getElementById('semester-select').value;

            // Validate inputs
            if (!name || !student_id || !department_id || !registration_number) {
                const errorElement = document.getElementById('student-form-error');
                errorElement.textContent = 'يرجى ملء جميع الحقول المطلوبة';
                errorElement.classList.remove('d-none');
                return;
            }

            console.log('Sending student data:', { name, student_id, department_id, registration_number, semester });

            // Disable form while submitting
            const submitButton = addStudentForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';

            fetch('/api/admin/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, student_id, department_id, registration_number, semester })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء إضافة الطالب');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    addStudentForm.reset();

                    // Show success message
                    const successElement = document.getElementById('student-form-success');
                    successElement.textContent = 'تمت إضافة الطالب بنجاح';
                    successElement.classList.remove('d-none');

                    // Reload students
                    loadStudents();

                    // Reload departments in case they were updated
                    loadDepartments();

                    // Also reload student select in the mark course completed form
                    loadStudentSelect();
                } else {
                    const errorElement = document.getElementById('student-form-error');
                    errorElement.textContent = data.error || 'حدث خطأ أثناء إضافة الطالب';
                    errorElement.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error adding student:', error);
                const errorElement = document.getElementById('student-form-error');
                errorElement.textContent = error.message || 'حدث خطأ أثناء إضافة الطالب';
                errorElement.classList.remove('d-none');
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Load student select for mark course completed form
function loadStudentSelect() {
    const studentSelect = document.getElementById('student-select');
    if (studentSelect) {
        fetch('/api/admin/students')
            .then(response => response.json())
            .then(data => {
                studentSelect.innerHTML = '<option value="">اختر الطالب</option>';

                data.students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.student_id} - ${student.name}`;
                    studentSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading students for select:', error);
            });
    }
}

// Open edit student modal
function openEditStudentModal(studentId) {
    // Hide any previous messages
    document.getElementById('edit-student-form-error').classList.add('d-none');
    document.getElementById('edit-student-form-success').classList.add('d-none');

    // Load departments for the select
    const departmentSelect = document.getElementById('edit-department-select');
    fetch('/api/admin/departments')
        .then(response => response.json())
        .then(data => {
            departmentSelect.innerHTML = '<option value="">اختر التخصص</option>';

            data.departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.id;
                option.textContent = department.name;
                departmentSelect.appendChild(option);
            });

            // After loading departments, load student data
            fetch(`/api/admin/students/${studentId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('فشل في الحصول على بيانات الطالب');
                    }
                    return response.json();
                })
                .then(data => {
                    const student = data.student;

                    // Set form values
                    document.getElementById('edit-student-id').value = student.id;
                    document.getElementById('edit-student-name').value = student.name;
                    document.getElementById('edit-student-id-field').value = student.student_id;
                    document.getElementById('edit-department-select').value = student.department_id;
                    document.getElementById('edit-registration-number').value = student.registration_number;

                    // Set semester value if it exists
                    const semesterSelect = document.getElementById('edit-semester-select');
                    if (semesterSelect) {
                        semesterSelect.value = student.semester || 'الأول';
                    }


                    // Show modal
                    const editModal = new bootstrap.Modal(document.getElementById('editStudentModal'));
                    editModal.show();
                })
                .catch(error => {
                    console.error('Error loading student data:', error);
                    alert('حدث خطأ أثناء تحميل بيانات الطالب: ' + error.message);
                });
        })
        .catch(error => {
            console.error('Error loading departments:', error);
            alert('حدث خطأ أثناء تحميل التخصصات: ' + error.message);
        });
}

// Setup edit student form
function setupEditStudentForm() {
    const saveChangesButton = document.getElementById('save-student-changes');
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', function() {
            // Hide any previous messages
            document.getElementById('edit-student-form-error').classList.add('d-none');
            document.getElementById('edit-student-form-success').classList.add('d-none');

            const studentId = document.getElementById('edit-student-id').value;
            const name = document.getElementById('edit-student-name').value;
            const student_id = document.getElementById('edit-student-id-field').value;
            const department_id = document.getElementById('edit-department-select').value;
            const registration_number = document.getElementById('edit-registration-number').value;
            const semester = document.getElementById('edit-semester-select').value;

            // Validate inputs
            if (!name || !student_id || !department_id || !registration_number) {
                const errorElement = document.getElementById('edit-student-form-error');
                errorElement.textContent = 'يرجى ملء جميع الحقول المطلوبة';
                errorElement.classList.remove('d-none');
                return;
            }

            console.log('Updating student:', studentId, { name, student_id, department_id, registration_number, semester });

            // Disable button while submitting
            const originalButtonText = saveChangesButton.textContent;
            saveChangesButton.disabled = true;
            saveChangesButton.textContent = 'جاري الحفظ...';

            fetch(`/api/admin/students/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, student_id, department_id, registration_number, semester })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء تحديث بيانات الطالب');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Show success message
                    const successElement = document.getElementById('edit-student-form-success');
                    successElement.textContent = 'تم تحديث بيانات الطالب بنجاح';
                    successElement.classList.remove('d-none');

                    // Reload students
                    loadStudents();

                    // Reload student select
                    loadStudentSelect();

                    // Close modal after a delay
                    setTimeout(() => {
                        const editModal = bootstrap.Modal.getInstance(document.getElementById('editStudentModal'));
                        if (editModal) {
                            editModal.hide();
                        }
                    }, 1500);
                } else {
                    const errorElement = document.getElementById('edit-student-form-error');
                    errorElement.textContent = data.error || 'حدث خطأ أثناء تحديث بيانات الطالب';
                    errorElement.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error updating student:', error);
                const errorElement = document.getElementById('edit-student-form-error');
                errorElement.textContent = error.message || 'حدث خطأ أثناء تحديث بيانات الطالب';
                errorElement.classList.remove('d-none');
            })
            .finally(() => {
                // Re-enable button
                saveChangesButton.disabled = false;
                saveChangesButton.textContent = originalButtonText;
            });
        });
    }
}

// Open edit department modal
function openEditDepartmentModal(departmentId) {
    // Hide any previous messages
    document.getElementById('edit-department-form-error').classList.add('d-none');
    document.getElementById('edit-department-form-success').classList.add('d-none');

    // Load department data
    fetch(`/api/admin/departments/${departmentId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات التخصص');
            }
            return response.json();
        })
        .then(data => {
            const department = data.department;

            // Set form values
            document.getElementById('edit-department-id').value = department.id;
            document.getElementById('edit-department-name').value = department.name;

            // Show modal
            const editModal = new bootstrap.Modal(document.getElementById('editDepartmentModal'));
            editModal.show();
        })
        .catch(error => {
            console.error('Error loading department data:', error);
            alert('حدث خطأ أثناء تحميل بيانات التخصص: ' + error.message);
        });
}

// Setup edit department form
function setupEditDepartmentForm() {
    const saveChangesButton = document.getElementById('save-department-changes');
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', function() {
            // Hide any previous messages
            document.getElementById('edit-department-form-error').classList.add('d-none');
            document.getElementById('edit-department-form-success').classList.add('d-none');

            const departmentId = document.getElementById('edit-department-id').value;
            const name = document.getElementById('edit-department-name').value;

            // Validate inputs
            if (!name) {
                const errorElement = document.getElementById('edit-department-form-error');
                errorElement.textContent = 'يرجى إدخال اسم التخصص';
                errorElement.classList.remove('d-none');
                return;
            }

            console.log('Updating department:', departmentId, { name });

            // Disable button while submitting
            const originalButtonText = saveChangesButton.textContent;
            saveChangesButton.disabled = true;
            saveChangesButton.textContent = 'جاري الحفظ...';

            fetch(`/api/admin/departments/${departmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء تحديث بيانات التخصص');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Show success message
                    const successElement = document.getElementById('edit-department-form-success');
                    successElement.textContent = 'تم تحديث بيانات التخصص بنجاح';
                    successElement.classList.remove('d-none');

                    // Reload departments
                    loadDepartments();

                    // Close modal after a delay
                    setTimeout(() => {
                        const editModal = bootstrap.Modal.getInstance(document.getElementById('editDepartmentModal'));
                        if (editModal) {
                            editModal.hide();
                        }
                    }, 1500);
                } else {
                    const errorElement = document.getElementById('edit-department-form-error');
                    errorElement.textContent = data.error || 'حدث خطأ أثناء تحديث بيانات التخصص';
                    errorElement.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error updating department:', error);
                const errorElement = document.getElementById('edit-department-form-error');
                errorElement.textContent = error.message || 'حدث خطأ أثناء تحديث بيانات التخصص';
                errorElement.classList.remove('d-none');
            })
            .finally(() => {
                // Re-enable button
                saveChangesButton.disabled = false;
                saveChangesButton.textContent = originalButtonText;
            });
        });
    }
}

// Admin: Setup add department form
function setupAddDepartmentForm() {
    const addDepartmentForm = document.getElementById('add-department-form');
    if (addDepartmentForm) {
        addDepartmentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('department-name').value;

            if (!name) {
                alert('يرجى إدخال اسم التخصص');
                return;
            }

            // Disable form while submitting
            const submitButton = addDepartmentForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';

            fetch('/api/admin/departments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء إضافة التخصص');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    addDepartmentForm.reset();

                    // Show success message
                    alert('تمت إضافة التخصص بنجاح');

                    // Reload departments
                    loadDepartments();
                } else {
                    alert(data.error || 'حدث خطأ أثناء إضافة التخصص');
                }
            })
            .catch(error => {
                console.error('Error adding department:', error);
                alert(error.message || 'حدث خطأ أثناء إضافة التخصص');
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Admin: Setup add course form
function setupAddCourseForm() {
    const addCourseForm = document.getElementById('add-course-form');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Hide any previous messages
            const errorElement = document.getElementById('course-form-error');
            const successElement = document.getElementById('course-form-success');

            if (errorElement) errorElement.classList.add('d-none');
            if (successElement) successElement.classList.add('d-none');

            const course_code = document.getElementById('course-code').value;
            const name = document.getElementById('course-name').value;
            const department_id = document.getElementById('course-department-select').value;
            const max_students = document.getElementById('max-students').value;
            const semester = document.getElementById('course-semester').value;

            // Validate inputs
            if (!course_code || !name || !department_id || !max_students) {
                if (errorElement) {
                    errorElement.textContent = 'يرجى ملء جميع الحقول المطلوبة';
                    errorElement.classList.remove('d-none');
                } else {
                    alert('يرجى ملء جميع الحقول المطلوبة');
                }
                return;
            }

            console.log('Sending course data:', { course_code, name, department_id, max_students, semester });

            // Disable form while submitting
            const submitButton = addCourseForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';

            fetch('/api/admin/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ course_code, name, department_id, max_students, semester })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء إضافة المادة');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    addCourseForm.reset();

                    // Show success message
                    if (successElement) {
                        successElement.textContent = 'تمت إضافة المادة بنجاح';
                        successElement.classList.remove('d-none');
                    } else {
                        alert('تمت إضافة المادة بنجاح');
                    }

                    // Reload courses
                    loadCourses();
                } else {
                    if (errorElement) {
                        errorElement.textContent = data.error || 'حدث خطأ أثناء إضافة المادة';
                        errorElement.classList.remove('d-none');
                    } else {
                        alert(data.error || 'حدث خطأ أثناء إضافة المادة');
                    }
                }
            })
            .catch(error => {
                console.error('Error adding course:', error);
                if (errorElement) {
                    errorElement.textContent = error.message || 'حدث خطأ أثناء إضافة المادة';
                    errorElement.classList.remove('d-none');
                } else {
                    alert(error.message || 'حدث خطأ أثناء إضافة المادة');
                }
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Open edit course modal
function openEditCourseModal(courseId) {
    // Hide any previous messages
    document.getElementById('edit-course-form-error').classList.add('d-none');
    document.getElementById('edit-course-form-success').classList.add('d-none');

    // Load departments for the select
    const departmentSelect = document.getElementById('edit-course-department-select');
    fetch('/api/admin/departments')
        .then(response => response.json())
        .then(data => {
            departmentSelect.innerHTML = '<option value="">اختر التخصص</option>';

            data.departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.id;
                option.textContent = department.name;
                departmentSelect.appendChild(option);
            });

            // After loading departments, load course data
            fetch(`/api/admin/courses/${courseId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('فشل في الحصول على بيانات المادة');
                    }
                    return response.json();
                })
                .then(data => {
                    const course = data.course;

                    // Set form values
                    document.getElementById('edit-course-id').value = course.id;
                    document.getElementById('edit-course-code').value = course.course_code;
                    document.getElementById('edit-course-name').value = course.name;
                    document.getElementById('edit-course-department-select').value = course.department_id;
                    document.getElementById('edit-max-students').value = course.max_students;

                    // Set semester value if it exists
                    const semesterSelect = document.getElementById('edit-course-semester');
                    if (semesterSelect) {
                        semesterSelect.value = course.semester || '';
                    }

                    // Show modal
                    const editModal = new bootstrap.Modal(document.getElementById('editCourseModal'));
                    editModal.show();
                })
                .catch(error => {
                    console.error('Error loading course data:', error);
                    alert('حدث خطأ أثناء تحميل بيانات المادة: ' + error.message);
                });
        })
        .catch(error => {
            console.error('Error loading departments:', error);
            alert('حدث خطأ أثناء تحميل التخصصات: ' + error.message);
        });
}

// Setup edit course form
function setupEditCourseForm() {
    const saveChangesButton = document.getElementById('save-course-changes');
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', function() {
            // Hide any previous messages
            document.getElementById('edit-course-form-error').classList.add('d-none');
            document.getElementById('edit-course-form-success').classList.add('d-none');

            const courseId = document.getElementById('edit-course-id').value;
            const course_code = document.getElementById('edit-course-code').value;
            const name = document.getElementById('edit-course-name').value;
            const department_id = document.getElementById('edit-course-department-select').value;
            const max_students = document.getElementById('edit-max-students').value;
            const semester = document.getElementById('edit-course-semester').value;

            // Validate inputs
            if (!course_code || !name || !department_id || !max_students) {
                const errorElement = document.getElementById('edit-course-form-error');
                errorElement.textContent = 'يرجى ملء جميع الحقول المطلوبة';
                errorElement.classList.remove('d-none');
                return;
            }

            console.log('Updating course:', courseId, { course_code, name, department_id, max_students, semester });

            // Disable button while submitting
            const originalButtonText = saveChangesButton.textContent;
            saveChangesButton.disabled = true;
            saveChangesButton.textContent = 'جاري الحفظ...';

            fetch(`/api/admin/courses/${courseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ course_code, name, department_id, max_students, semester })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء تحديث بيانات المادة');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Show success message
                    const successElement = document.getElementById('edit-course-form-success');
                    successElement.textContent = 'تم تحديث بيانات المادة بنجاح';
                    successElement.classList.remove('d-none');

                    // Reload courses
                    loadCourses();

                    // Close modal after a delay
                    setTimeout(() => {
                        const editModal = bootstrap.Modal.getInstance(document.getElementById('editCourseModal'));
                        if (editModal) {
                            editModal.hide();
                        }
                    }, 1500);
                } else {
                    const errorElement = document.getElementById('edit-course-form-error');
                    errorElement.textContent = data.error || 'حدث خطأ أثناء تحديث بيانات المادة';
                    errorElement.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error updating course:', error);
                const errorElement = document.getElementById('edit-course-form-error');
                errorElement.textContent = error.message || 'حدث خطأ أثناء تحديث بيانات المادة';
                errorElement.classList.remove('d-none');
            })
            .finally(() => {
                // Re-enable button
                saveChangesButton.disabled = false;
                saveChangesButton.textContent = originalButtonText;
            });
        });
    }
}

// Open course prerequisites modal
function openCoursePrerequisitesModal(courseId) {
    // Show loading
    document.getElementById('prerequisites-loading').classList.remove('d-none');
    document.getElementById('prerequisites-error').classList.add('d-none');
    document.getElementById('prerequisites-content').classList.add('d-none');

    // Reset containers
    document.getElementById('current-prerequisites-container').innerHTML = '<div class="alert alert-info">لا توجد متطلبات لهذه المادة</div>';

    // Set course ID for the add prerequisite form
    document.getElementById('prerequisite-course-id').value = courseId;

    // Show modal
    const prerequisitesModal = new bootstrap.Modal(document.getElementById('coursePrerequisitesModal'));
    prerequisitesModal.show();

    // Load course prerequisites
    fetch(`/api/admin/courses/${courseId}/prerequisites`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المتطلبات');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            document.getElementById('prerequisites-loading').classList.add('d-none');
            document.getElementById('prerequisites-content').classList.remove('d-none');

            // Set course info
            document.getElementById('prerequisites-course-name').textContent = data.course.name;
            document.getElementById('prerequisites-course-details').textContent =
                `رمز المادة: ${data.course.course_code} | التخصص: ${data.course.department_name || 'غير محدد'}`;

            // Load prerequisites
            if (data.prerequisites && data.prerequisites.length > 0) {
                const prerequisitesContainer = document.getElementById('current-prerequisites-container');
                prerequisitesContainer.innerHTML = '';

                const table = document.createElement('table');
                table.className = 'table table-striped';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>رمز المادة</th>
                            <th>اسم المادة</th>
                            <th>التخصص</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');

                data.prerequisites.forEach(prerequisite => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${prerequisite.course_code}</td>
                        <td>${prerequisite.name}</td>
                        <td>${prerequisite.department_name || 'غير محدد'}</td>
                        <td>
                            <button class="btn btn-sm btn-danger delete-prerequisite" data-id="${prerequisite.id}">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                prerequisitesContainer.appendChild(table);

                // Setup delete prerequisite buttons
                document.querySelectorAll('.delete-prerequisite').forEach(button => {
                    button.addEventListener('click', function() {
                        const prerequisiteId = this.getAttribute('data-id');
                        if (confirm('هل أنت متأكد من حذف هذا المتطلب؟')) {
                            deletePrerequisite(prerequisiteId, courseId);
                        }
                    });
                });
            }

            // Load courses for the select
            loadCoursesForPrerequisite(courseId);
        })
        .catch(error => {
            console.error('Error loading course prerequisites:', error);
            document.getElementById('prerequisites-loading').classList.add('d-none');
            const errorElement = document.getElementById('prerequisites-error');
            errorElement.textContent = error.message || 'حدث خطأ أثناء تحميل بيانات المتطلبات';
            errorElement.classList.remove('d-none');
        });
}

// Load courses for prerequisite select in the modal
function loadCoursesForPrerequisite(courseId) {
    const prerequisiteSelect = document.getElementById('prerequisite-select-modal');
    const prerequisiteDepartmentSelect = document.getElementById('prerequisite-department-select-modal');

    // First, get the current prerequisites
    fetch(`/api/admin/courses/${courseId}/prerequisites`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المتطلبات');
            }
            return response.json();
        })
        .then(prereqData => {
            // Get all courses
            return fetch('/api/admin/courses')
                .then(response => response.json())
                .then(data => {
                    // Create a set of prerequisite IDs for easy lookup
                    const existingPrereqIds = new Set();
                    if (prereqData.prerequisites && prereqData.prerequisites.length > 0) {
                        prereqData.prerequisites.forEach(prereq => {
                            existingPrereqIds.add(prereq.prerequisite_id.toString());
                        });
                    }

                    console.log('Existing prerequisite IDs:', Array.from(existingPrereqIds));

                    // Fill prerequisite department select if it exists
                    if (prerequisiteDepartmentSelect) {
                        // Keep the first option (All departments)
                        prerequisiteDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';

                        // Get unique departments
                        const departmentMap = {};
                        data.courses.forEach(course => {
                            if (course.department_id && course.department_name) {
                                departmentMap[course.department_id] = course.department_name;
                            }
                        });

                        // Add department options
                        Object.keys(departmentMap).forEach(departmentId => {
                            const option = document.createElement('option');
                            option.value = departmentId;
                            option.textContent = departmentMap[departmentId];
                            prerequisiteDepartmentSelect.appendChild(option);
                        });

                        // Remove existing event listeners by cloning and replacing the element
                        const oldSelect = prerequisiteDepartmentSelect;
                        const newSelect = oldSelect.cloneNode(true);
                        oldSelect.parentNode.replaceChild(newSelect, oldSelect);

                        // Get the new reference after replacement
                        const newPrerequisiteDepartmentSelect = document.getElementById('prerequisite-department-select-modal');

                        // Add change event to filter prerequisite select
                        newPrerequisiteDepartmentSelect.addEventListener('change', function() {
                            const selectedDepartmentId = this.value;
                            console.log("Department changed to:", selectedDepartmentId);
                            filterModalPrerequisiteSelectByDepartment(selectedDepartmentId, courseId, existingPrereqIds);
                        });

                        // Initial filtering if department is already selected
                        if (newPrerequisiteDepartmentSelect.value) {
                            filterModalPrerequisiteSelectByDepartment(newPrerequisiteDepartmentSelect.value, courseId, existingPrereqIds);
                        }
                    }

                    prerequisiteSelect.innerHTML = '<option value="">اختر المادة المتطلبة</option>';

                    if (data.courses && data.courses.length > 0) {
                        // Filter out the current course and existing prerequisites
                        const filteredCourses = data.courses.filter(course => {
                            // Don't include the current course
                            if (course.id == courseId) {
                                return false;
                            }

                            // Don't include courses that are already prerequisites
                            if (existingPrereqIds.has(course.id.toString())) {
                                return false;
                            }

                            return true;
                        });

                        filteredCourses.forEach(course => {
                            const option = document.createElement('option');
                            option.value = course.id;
                            option.textContent = `${course.course_code} - ${course.name}`;
                            option.dataset.departmentId = course.department_id || '';
                            prerequisiteSelect.appendChild(option);
                        });

                        console.log('Filtered courses count:', filteredCourses.length);
                    }
                });
        })
        .catch(error => {
            console.error('Error loading courses for prerequisite:', error);
            prerequisiteSelect.innerHTML = '<option value="">خطأ في تحميل المواد</option>';
            if (prerequisiteDepartmentSelect) {
                prerequisiteDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';
            }
        });
}

// Filter modal prerequisite select by department
function filterModalPrerequisiteSelectByDepartment(departmentId, courseId, existingPrereqIds) {
    const prerequisiteSelect = document.getElementById('prerequisite-select-modal');

    if (!prerequisiteSelect) {
        console.error("Could not find prerequisite-select-modal element");
        return;
    }

    // Save current scroll position
    const scrollPosition = window.scrollY;

    // Show loading indicator in the select
    prerequisiteSelect.innerHTML = '<option value="">جاري تحميل المواد...</option>';
    prerequisiteSelect.disabled = true;

    console.log(`Filtering modal prerequisites by department ID: ${departmentId || 'all'}, course ID: ${courseId}`);

    // Instead of filtering existing options, we'll reload all courses and filter them
    // This ensures we always have the complete list of courses to filter from
    fetch('/api/admin/courses')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المواد');
            }
            return response.json();
        })
        .then(data => {
            // Clear select and add placeholder
            prerequisiteSelect.innerHTML = '<option value="">اختر المادة المتطلبة</option>';
            prerequisiteSelect.disabled = false;

            if (data.courses && data.courses.length > 0) {
                // Filter out the current course and existing prerequisites
                const filteredCourses = data.courses.filter(course => {
                    // Don't include the current course
                    if (course.id == courseId) {
                        return false;
                    }

                    // Don't include courses that are already prerequisites
                    if (existingPrereqIds && existingPrereqIds.has(course.id.toString())) {
                        return false;
                    }

                    // Filter by department if specified
                    if (departmentId && course.department_id != departmentId) {
                        return false;
                    }

                    return true;
                });

                // Add filtered courses to select
                filteredCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.name}`;
                    option.dataset.departmentId = course.department_id || '';
                    prerequisiteSelect.appendChild(option);
                });

                console.log(`Filtered courses by department ID ${departmentId || 'all'}, showing ${filteredCourses.length} courses`);

                // If no courses were found, show a message
                if (filteredCourses.length === 0) {
                    prerequisiteSelect.innerHTML = '<option value="">لا توجد مواد متاحة في هذا التخصص</option>';
                }
            } else {
                prerequisiteSelect.innerHTML = '<option value="">لا توجد مواد متاحة</option>';
            }

            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        })
        .catch(error => {
            console.error('Error reloading courses for department filter:', error);
            // Keep the placeholder in case of error
            prerequisiteSelect.innerHTML = '<option value="">خطأ في تحميل المواد</option>';
            prerequisiteSelect.disabled = false;
            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        });
}

// Delete student
function deleteStudent(studentId, forceDelete = false) {
    const url = forceDelete
        ? `/api/admin/students/${studentId}?force=true`
        : `/api/admin/students/${studentId}`;

    fetch(url, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.status === 409) {
            // This is a warning, not an error
            return response.json().then(data => {
                if (data.warning) {
                    const enrollments = data.details.enrollments;
                    const completedCourses = data.details.completedCourses;

                    let message = 'تنبيه: هذا الطالب لديه بيانات مرتبطة:\n';

                    if (enrollments > 0) {
                        message += `- مسجل في ${enrollments} مادة\n`;
                    }

                    if (completedCourses > 0) {
                        message += `- أنجز ${completedCourses} مادة\n`;
                    }

                    message += '\nحذف الطالب سيؤدي إلى حذف جميع هذه البيانات.\nهل أنت متأكد من حذف الطالب؟';

                    if (confirm(message)) {
                        // User confirmed, proceed with force delete
                        deleteStudent(studentId, true);
                    }
                    return { aborted: true };
                }
                throw new Error(data.error || 'حدث خطأ أثناء حذف الطالب');
            });
        }

        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء حذف الطالب');
            });
        }

        return response.json();
    })
    .then(data => {
        if (data.aborted) {
            // User aborted the deletion after seeing the warning
            return;
        }

        if (data.success) {
            // Show success message
            alert('تم حذف الطالب بنجاح');

            // Reload students
            loadStudents();

            // Reload student select in the mark course completed form
            loadStudentSelect();
        } else {
            alert(data.error || 'حدث خطأ أثناء حذف الطالب');
        }
    })
    .catch(error => {
        console.error('Error deleting student:', error);
        alert(error.message || 'حدث خطأ أثناء حذف الطالب');
    });
}

// Delete department
function deleteDepartment(departmentId) {
    fetch(`/api/admin/departments/${departmentId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء حذف التخصص');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success message
            alert('تم حذف التخصص بنجاح');

            // Reload departments
            loadDepartments();
        } else {
            alert(data.error || 'حدث خطأ أثناء حذف التخصص');
        }
    })
    .catch(error => {
        console.error('Error deleting department:', error);
        alert(error.message || 'حدث خطأ أثناء حذف التخصص');
    });
}

// Delete course
function deleteCourse(courseId) {
    fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء حذف المادة');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success message
            alert('تم حذف المادة بنجاح');

            // Reload courses
            loadCourses();
        } else {
            alert(data.error || 'حدث خطأ أثناء حذف المادة');
        }
    })
    .catch(error => {
        console.error('Error deleting course:', error);
        alert(error.message || 'حدث خطأ أثناء حذف المادة');
    });
}

// Delete prerequisite
function deletePrerequisite(prerequisiteId, courseId) {
    fetch(`/api/admin/prerequisites/${prerequisiteId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء حذف المتطلب');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success message
            alert('تم حذف المتطلب بنجاح');

            // Reload prerequisites
            openCoursePrerequisitesModal(courseId);
        } else {
            alert(data.error || 'حدث خطأ أثناء حذف المتطلب');
        }
    })
    .catch(error => {
        console.error('Error deleting prerequisite:', error);
        alert(error.message || 'حدث خطأ أثناء حذف المتطلب');
    });
}

// Setup add prerequisite form in the modal
function setupAddPrerequisiteModalForm() {
    const addPrerequisiteModalForm = document.getElementById('add-prerequisite-modal-form');
    if (addPrerequisiteModalForm) {
        addPrerequisiteModalForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const course_id = document.getElementById('prerequisite-course-id').value;
            const prerequisite_id = document.getElementById('prerequisite-select-modal').value;

            if (!course_id || !prerequisite_id) {
                alert('يرجى اختيار المادة المتطلبة');
                return;
            }

            // Disable form while submitting
            const submitButton = addPrerequisiteModalForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';

            fetch('/api/admin/prerequisites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ course_id, prerequisite_id })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء إضافة المتطلب');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    addPrerequisiteModalForm.reset();
                    document.getElementById('prerequisite-course-id').value = course_id;

                    // Show success message
                    alert('تمت إضافة المتطلب بنجاح');

                    // Reload prerequisites
                    openCoursePrerequisitesModal(course_id);
                } else {
                    alert(data.error || 'حدث خطأ أثناء إضافة المتطلب');
                }
            })
            .catch(error => {
                console.error('Error adding prerequisite:', error);
                alert(error.message || 'حدث خطأ أثناء إضافة المتطلب');
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Admin: Setup add prerequisite form
function setupAddPrerequisiteForm() {
    const addPrerequisiteForm = document.getElementById('add-prerequisite-form');
    if (addPrerequisiteForm) {
        addPrerequisiteForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const course_id = document.getElementById('course-select').value;
            const prerequisite_id = document.getElementById('prerequisite-select').value;

            if (!course_id || !prerequisite_id) {
                alert('يرجى اختيار المادة والمادة المتطلبة');
                return;
            }

            // Disable form while submitting
            const submitButton = addPrerequisiteForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';

            fetch('/api/admin/prerequisites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ course_id, prerequisite_id })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء إضافة المتطلب');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    addPrerequisiteForm.reset();

                    // Show success message
                    alert('تمت إضافة المتطلب بنجاح');
                } else {
                    alert(data.error || 'حدث خطأ أثناء إضافة المتطلب');
                }
            })
            .catch(error => {
                console.error('Error adding prerequisite:', error);
                alert(error.message || 'حدث خطأ أثناء إضافة المتطلب');
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Open student courses modal
function openStudentCoursesModal(studentId) {
    // Show loading
    document.getElementById('student-courses-loading').classList.remove('d-none');
    document.getElementById('student-courses-error').classList.add('d-none');
    document.getElementById('student-courses-content').classList.add('d-none');

    // Reset containers
    document.getElementById('completed-courses-container').innerHTML = '<div class="alert alert-info">لا توجد مواد منجزة</div>';
    document.getElementById('enrolled-courses-container').innerHTML = '<div class="alert alert-info">لا توجد مواد مسجل فيها حالياً</div>';

    // Set student ID for the mark course completed form
    document.getElementById('mark-course-student-id').value = studentId;

    // Show modal
    const coursesModal = new bootstrap.Modal(document.getElementById('studentCoursesModal'));
    coursesModal.show();

    // Load student courses
    fetch(`/api/admin/students/${studentId}/courses`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المواد');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            document.getElementById('student-courses-loading').classList.add('d-none');
            document.getElementById('student-courses-content').classList.remove('d-none');

            // Set student info
            document.getElementById('student-courses-name').textContent = data.student.name;
            document.getElementById('student-courses-details').textContent =
                `رقم القيد: ${data.student.student_id} | رقم المنظومة: ${data.student.registration_number}`;

            // Load completed courses
            if (data.completedCourses && data.completedCourses.length > 0) {
                const completedCoursesContainer = document.getElementById('completed-courses-container');
                completedCoursesContainer.innerHTML = '';

                const table = document.createElement('table');
                table.className = 'table table-striped';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>رمز المادة</th>
                            <th>اسم المادة</th>
                            <th>التخصص</th>
                            <th>تاريخ الإنجاز</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');

                data.completedCourses.forEach(course => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${course.course_code}</td>
                        <td>${course.name}</td>
                        <td>${course.department_name || 'غير محدد'}</td>
                        <td>${new Date(course.completed_at).toLocaleDateString('ar-LY')}</td>
                    `;
                    tbody.appendChild(row);
                });

                completedCoursesContainer.appendChild(table);
            }

            // Load enrolled courses
            if (data.enrolledCourses && data.enrolledCourses.length > 0) {
                const enrolledCoursesContainer = document.getElementById('enrolled-courses-container');
                enrolledCoursesContainer.innerHTML = '';

                const table = document.createElement('table');
                table.className = 'table table-striped';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>رمز المادة</th>
                            <th>اسم المادة</th>
                            <th>التخصص</th>
                            <th>تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');

                data.enrolledCourses.forEach(course => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${course.course_code}</td>
                        <td>${course.name}</td>
                        <td>${course.department_name || 'غير محدد'}</td>
                        <td>${new Date(course.created_at).toLocaleDateString('ar-LY')}</td>
                    `;
                    tbody.appendChild(row);
                });

                enrolledCoursesContainer.appendChild(table);
            }

            // Load courses for the select
            loadCoursesForStudent(studentId);
        })
        .catch(error => {
            console.error('Error loading student courses:', error);
            document.getElementById('student-courses-loading').classList.add('d-none');
            const errorElement = document.getElementById('student-courses-error');
            errorElement.textContent = error.message || 'حدث خطأ أثناء تحميل بيانات المواد';
            errorElement.classList.remove('d-none');
        });
}

// Load courses for student select in the modal
function loadCoursesForStudent(studentId) {
    const courseSelect = document.getElementById('mark-course-select');

    fetch('/api/admin/courses')
        .then(response => response.json())
        .then(data => {
            courseSelect.innerHTML = '<option value="">اختر المادة</option>';

            if (data.courses && data.courses.length > 0) {
                data.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.name}`;
                    courseSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading courses for student:', error);
        });
}

// Setup mark course completed form in the modal
function setupMarkCourseCompletedModalForm() {
    const markCourseCompletedModalForm = document.getElementById('mark-course-completed-modal-form');
    if (markCourseCompletedModalForm) {
        markCourseCompletedModalForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const student_id = document.getElementById('mark-course-student-id').value;
            const course_id = document.getElementById('mark-course-select').value;

            if (!student_id || !course_id) {
                alert('يرجى اختيار المادة');
                return;
            }

            // Disable form while submitting
            const submitButton = markCourseCompletedModalForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري التحديد...';

            fetch('/api/admin/completed-courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id, course_id })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'حدث خطأ أثناء تحديد المادة كمنجزة');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Reset form
                    markCourseCompletedModalForm.reset();

                    // Show success message
                    alert('تم تحديد المادة كمنجزة بنجاح');

                    // Reload student courses
                    openStudentCoursesModal(student_id);
                } else {
                    alert(data.error || 'حدث خطأ أثناء تحديد المادة كمنجزة');
                }
            })
            .catch(error => {
                console.error('Error marking course as completed:', error);
                alert(error.message || 'حدث خطأ أثناء تحديد المادة كمنجزة');
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Admin: Setup mark course as completed form
function setupMarkCourseCompletedForm() {
    const markCourseCompletedForm = document.getElementById('mark-course-completed-form');
    if (markCourseCompletedForm) {
        markCourseCompletedForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const student_id = document.getElementById('student-select').value;
            const course_id = document.getElementById('course-select').value;

            if (!student_id || !course_id) {
                alert('يرجى اختيار الطالب والمادة');
                return;
            }

            fetch('/api/admin/completed-courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id, course_id })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Reset form
                    markCourseCompletedForm.reset();

                    // Show success message
                    alert('تم تحديد المادة كمنجزة بنجاح');
                } else {
                    alert(data.error || 'حدث خطأ أثناء تحديد المادة كمنجزة');
                }
            })
            .catch(error => {
                console.error('Error marking course as completed:', error);
                alert('حدث خطأ أثناء تحديد المادة كمنجزة');
            });
        });
    }
}

// Student: Load student info
function loadStudentInfo() {
    const studentInfoContainer = document.getElementById('student-info');
    if (studentInfoContainer) {
        fetch('/api/student/info')
            .then(response => response.json())
            .then(data => {
                const student = data.student;

                // Ensure semester has a value
                const semester = student.semester || 'الأول';

                studentInfoContainer.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">معلومات الطالب</h5>
                            <p><strong>الاسم:</strong> ${student.name}</p>
                            <p><strong>رقم القيد:</strong> ${student.student_id}</p>
                            <p><strong>التخصص:</strong> ${student.department_name || 'غير محدد'}</p>
                            <p><strong>الفصل الدراسي:</strong> ${semester}</p>
                            <p><strong>رقم المنظومة:</strong> ${student.registration_number}</p>
                        </div>
                    </div>
                `;
            })
            .catch(error => {
                console.error('Error loading student info:', error);
                studentInfoContainer.innerHTML = '<div class="alert alert-danger">حدث خطأ أثناء تحميل معلومات الطالب</div>';
            });
    }
}

// Student: Load completed courses
function loadCompletedCourses() {
    const completedCoursesContainer = document.getElementById('completed-courses');
    if (completedCoursesContainer) {
        fetch('/api/student/completed-courses')
            .then(response => response.json())
            .then(data => {
                if (data.completed_courses.length === 0) {
                    completedCoursesContainer.innerHTML = '<div class="alert alert-info">لا توجد مواد منجزة</div>';
                    return;
                }

                let html = '<div class="table-container"><table class="table table-striped">';
                html += '<thead><tr><th>رمز المادة</th><th>اسم المادة</th><th>تاريخ الإنجاز</th></tr></thead>';
                html += '<tbody>';

                data.completed_courses.forEach(course => {
                    html += `
                        <tr>
                            <td>${course.course_code}</td>
                            <td>${course.name}</td>
                            <td>${new Date(course.completed_at).toLocaleDateString('ar-LY')}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                completedCoursesContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading completed courses:', error);
                completedCoursesContainer.innerHTML = '<div class="alert alert-danger">حدث خطأ أثناء تحميل المواد المنجزة</div>';
            });
    }
}

// Student: Load max courses limit and enrollment count
function loadMaxCoursesLimit() {
    const maxCoursesLimit = document.getElementById('max-courses-limit');
    const maxCoursesBadge = document.getElementById('max-courses-badge');
    const currentCoursesCount = document.getElementById('current-courses-count');

    if (maxCoursesLimit || maxCoursesBadge || currentCoursesCount) {
        // Use the new API to get both enrollment count and max limit
        fetch('/api/student/enrollment-count')
            .then(response => response.json())
            .then(data => {
                const limit = data.max_courses_limit;
                const count = data.enrollment_count;

                console.log(`Loaded from API - Max limit: ${limit}, Current count: ${count}`);

                // Update the max limit displays
                if (maxCoursesLimit) maxCoursesLimit.textContent = limit;
                if (maxCoursesBadge) maxCoursesBadge.textContent = limit;

                // Update the current count display with the accurate count from the server
                if (currentCoursesCount) {
                    updateEnrolledCoursesCount(count);
                }
            })
            .catch(error => {
                console.error('Error loading enrollment data:', error);

                // Fallback to just loading the max limit if the enrollment count API fails
                fetch('/api/max-courses-limit')
                    .then(response => response.json())
                    .then(data => {
                        const limit = data.max_courses_limit;
                        console.log(`Fallback - Loaded max courses limit: ${limit}`);

                        if (maxCoursesLimit) maxCoursesLimit.textContent = limit;
                        if (maxCoursesBadge) maxCoursesBadge.textContent = limit;
                    })
                    .catch(error => {
                        console.error('Error loading max courses limit:', error);
                    });
            });
    }
}

// Student: Update enrolled courses count
function updateEnrolledCoursesCount(count) {
    const currentCoursesCount = document.getElementById('current-courses-count');
    if (currentCoursesCount) {
        // Ensure count is a number
        count = parseInt(count) || 0;

        // Update the count display
        currentCoursesCount.textContent = count;

        // Update badge color based on count vs limit
        const maxCoursesBadge = document.getElementById('max-courses-badge');
        const limit = maxCoursesBadge ? parseInt(maxCoursesBadge.textContent) : 6;

        console.log(`Updating count: ${count} of limit: ${limit}`);

        if (count >= limit) {
            currentCoursesCount.className = 'badge bg-danger';
        } else if (count >= limit * 0.75) {
            currentCoursesCount.className = 'badge bg-warning';
        } else {
            currentCoursesCount.className = 'badge bg-primary';
        }
    }
}

// Student: Load available courses
function loadAvailableCourses() {
    const availableCoursesContainer = document.getElementById('available-courses');
    if (availableCoursesContainer) {
        // Load max courses limit
        loadMaxCoursesLimit();

        // First check if registration is open
        fetch('/api/registration-status')
            .then(response => response.json())
            .then(statusData => {
                // If registration is closed, show message
                if (!statusData.registration_open) {
                    availableCoursesContainer.innerHTML = '<div class="alert alert-warning"><i class="fas fa-lock me-2"></i>التسجيل مغلق حالياً. يرجى المحاولة لاحقاً.</div>';
                    return;
                }

                // If registration is open, load courses
                return fetch('/api/student/available-courses');
            })
            .then(response => {
                if (!response) return; // Registration is closed
                return response.json();
            })
            .then(data => {
                if (!data) return; // Registration is closed

                if (data.courses.length === 0) {
                    availableCoursesContainer.innerHTML = '<div class="alert alert-info">لا توجد مواد متاحة</div>';
                    return;
                }

                // Count enrolled courses and update counter
                const enrolledCourses = data.courses.filter(course => course.is_enrolled);
                console.log(`Found ${enrolledCourses.length} enrolled courses`);

                // Get the enrolled course IDs for debugging
                const enrolledCourseIds = enrolledCourses.map(course => course.id);
                console.log(`Enrolled course IDs: ${JSON.stringify(enrolledCourseIds)}`);

                // Update the counter with the actual number of enrolled courses
                updateEnrolledCoursesCount(enrolledCourses.length);

                // Sort courses by status: منجزة -> متاحة -> مكتملة -> غير متاحة
                const sortedCourses = [...data.courses].sort((a, b) => {
                    // Define priority for each status
                    const getPriority = (course) => {
                        if (course.is_completed) return 1; // منجزة (أعلى أولوية)
                        if (course.is_enrolled) return 2; // مسجل
                        if (course.all_prerequisites_met && !course.is_full) return 3; // متاحة
                        if (course.is_full) return 4; // مكتملة
                        return 5; // غير متاحة (أقل أولوية)
                    };

                    // Sort by priority, then by course code if same priority
                    const priorityA = getPriority(a);
                    const priorityB = getPriority(b);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    // If same priority, sort by course code
                    return a.course_code.localeCompare(b.course_code);
                });

                let html = '<div class="row">';

                // Add section headers
                let currentSection = null;

                sortedCourses.forEach(course => {
                    let statusClass = '';
                    let statusText = '';
                    let enrollButton = '';
                    let section = '';

                    if (course.is_completed) {
                        statusClass = 'bg-completed';
                        statusText = 'منجزة';
                        enrollButton = `<button class="btn btn-secondary" disabled>تم الإنجاز</button>`;
                        section = 'completed';
                    } else if (course.is_enrolled) {
                        statusClass = 'bg-enrolled';
                        statusText = 'مسجل';
                        enrollButton = `<button class="btn btn-danger unenroll-button" data-id="${course.id}">إلغاء التسجيل</button>`;
                        section = 'enrolled';
                    } else if (course.all_prerequisites_met && !course.is_full) {
                        statusClass = 'bg-available';
                        statusText = 'متاحة';
                        enrollButton = `<button class="btn btn-primary enroll-button" data-id="${course.id}">تسجيل</button>`;
                        section = 'available';
                    } else if (course.is_full) {
                        statusClass = 'bg-full';
                        statusText = 'مكتملة';
                        enrollButton = `<button class="btn btn-secondary" disabled>مكتملة</button>`;
                        section = 'full';
                    } else {
                        statusClass = 'bg-unavailable';
                        statusText = 'غير متاحة';
                        enrollButton = `<button class="btn btn-secondary" disabled>غير متاحة</button>`;
                        section = 'unavailable';
                    }

                    // Add section header if section changed
                    if (section !== currentSection) {
                        currentSection = section;

                        // Close previous row and start a new one
                        if (html !== '<div class="row">') {
                            html += '</div><div class="row">';
                        }

                        // Add section header
                        let headerText = '';
                        let headerClass = '';
                        let textColorClass = 'text-white';

                        switch (section) {
                            case 'completed':
                                headerText = 'المواد المنجزة';
                                headerClass = 'bg-success';
                                break;
                            case 'enrolled':
                                headerText = 'المواد المسجل فيها';
                                headerClass = 'bg-primary';
                                break;
                            case 'available':
                                headerText = 'المواد المتاحة للتسجيل';
                                headerClass = 'bg-info';
                                break;
                            case 'full':
                                headerText = 'المواد المكتملة';
                                headerClass = 'bg-warning';
                                textColorClass = 'text-dark';
                                break;
                            case 'unavailable':
                                headerText = 'المواد غير المتاحة';
                                headerClass = 'bg-secondary';
                                break;
                        }

                        html += `
                            <div class="col-12 mb-3">
                                <div class="card">
                                    <div class="card-header ${headerClass} ${textColorClass}">
                                        <h5 class="card-title mb-0">${headerText}</h5>
                                    </div>
                                </div>
                            </div>
                        `;
                    }

                    html += `
                        <div class="col-md-4 mb-4">
                            <div class="card course-card">
                                <div class="card-header ${statusClass}">
                                    <h5 class="card-title mb-0">${course.course_code}</h5>
                                </div>
                                <div class="card-body">
                                    <h6 class="card-subtitle mb-2">${course.name}</h6>
                                    <p class="card-text">
                                        <span class="badge ${statusClass}">${statusText}</span>
                                        <span class="badge bg-info">${course.enrolled_students}/${course.max_students} طالب</span>
                                    </p>
                                    <div class="mt-auto">
                                        ${enrollButton}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                availableCoursesContainer.innerHTML = html;

                // Setup enroll buttons
                document.querySelectorAll('.enroll-button').forEach(button => {
                    button.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        enrollInCourse(courseId);
                    });
                });

                // Setup unenroll buttons
                document.querySelectorAll('.unenroll-button').forEach(button => {
                    button.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        if (confirm('هل أنت متأكد من إلغاء التسجيل في هذه المادة؟')) {
                            unenrollFromCourse(courseId);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error loading available courses:', error);
                availableCoursesContainer.innerHTML = '<div class="alert alert-danger">حدث خطأ أثناء تحميل المواد المتاحة</div>';
            });
    }
}

// Student: Enroll in course
function enrollInCourse(courseId) {
    fetch('/api/student/enroll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ course_id: courseId })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء التسجيل في المادة');
            });
        }
    })
    .then(data => {
        if (data.success) {
            alert('تم التسجيل في المادة بنجاح');

            // Reload the enrollment count from the server to ensure accuracy
            loadMaxCoursesLimit();

            loadAvailableCourses();
        } else {
            alert('حدث خطأ أثناء التسجيل في المادة');
        }
    })
    .catch(error => {
        console.error('Error enrolling in course:', error);
        alert(error.message);
    });
}

// Student: Unenroll from course
function unenrollFromCourse(courseId) {
    fetch('/api/student/unenroll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ course_id: courseId })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء إلغاء التسجيل في المادة');
            });
        }
    })
    .then(data => {
        if (data.success) {
            alert('تم إلغاء التسجيل في المادة بنجاح');

            // Reload the enrollment count from the server to ensure accuracy
            loadMaxCoursesLimit();

            loadAvailableCourses();
        } else {
            alert(data.error || 'حدث خطأ أثناء إلغاء التسجيل في المادة');
        }
    })
    .catch(error => {
        console.error('Error unenrolling from course:', error);
        alert(error.message || 'حدث خطأ أثناء إلغاء التسجيل في المادة');
    });
}

// Student: Load student report
function loadStudentReport() {
    const studentReportContainer = document.getElementById('student-report');
    if (studentReportContainer) {
        // Show loading spinner
        studentReportContainer.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">جاري التحميل...</span>
                </div>
                <p class="mt-2">جاري تحميل التقرير...</p>
            </div>
        `;

        // First, get student info
        fetch('/api/student/info')
            .then(response => {
                if (!response.ok) {
                    throw new Error('فشل في الحصول على معلومات الطالب');
                }
                return response.json();
            })
            .then(studentData => {
                if (!studentData || !studentData.student) {
                    throw new Error('بيانات الطالب غير متوفرة');
                }

                const student = studentData.student;

                // Then, get available courses (which includes enrolled courses)
                return fetch('/api/student/available-courses')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('فشل في الحصول على المواد المسجل بها');
                        }
                        return response.json();
                    })
                    .then(coursesData => {
                        if (!coursesData || !Array.isArray(coursesData.courses)) {
                            throw new Error('بيانات المواد غير متوفرة');
                        }

                        try {
                            // Filter enrolled courses and ensure enrollment_percentage is calculated correctly
                            const enrolledCourses = coursesData.courses.filter(course => course.is_enrolled).map(course => {
                                // Calculate enrollment percentage if it's not already calculated or is NaN
                                if (!course.enrollment_percentage || isNaN(course.enrollment_percentage)) {
                                    if (course.max_students > 0) {
                                        course.enrollment_percentage = (course.enrolled_students / course.max_students) * 100;
                                    } else {
                                        course.enrollment_percentage = 0;
                                    }
                                }
                                return course;
                            });

                            // Generate report HTML
                            let reportHtml = `
                                <div class="student-report-container">
                                    <div class="card mb-4">
                                        <div class="card-header bg-primary text-white">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <h5 class="card-title mb-0">معلومات الطالب</h5>
                                                <span class="badge bg-light text-dark">تاريخ التقرير: ${new Date().toLocaleDateString('ar-LY')}</span>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <p><strong>الاسم:</strong> ${student.name}</p>
                                                    <p><strong>رقم القيد:</strong> ${student.student_id}</p>
                                                    <p><strong>الفصل الدراسي:</strong> ${student.semester || 'الأول'}</p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p><strong>التخصص:</strong> ${student.department_name || 'غير محدد'}</p>
                                                    <p><strong>رقم المنظومة:</strong> ${student.registration_number}</p>
                                                    <p><strong>المواد المسجلة:</strong> ${enrolledCourses.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header bg-info text-white">
                                            <h5 class="card-title mb-0">المواد المسجل بها</h5>
                                        </div>
                                        <div class="card-body">
                            `;

                            if (enrolledCourses.length === 0) {
                                reportHtml += `<div class="alert alert-info">لا توجد مواد مسجل بها حالياً</div>`;
                            } else {
                                reportHtml += `
                                    <div class="table-responsive">
                                        <table class="table table-striped table-bordered">
                                            <thead class="table-primary">
                                                <tr>
                                                    <th>#</th>
                                                    <th>رمز المادة</th>
                                                    <th>اسم المادة</th>
                                                    <th>التخصص</th>
                                                    <th>الفصل الدراسي</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;

                                enrolledCourses.forEach((course, index) => {
                                    // Get course semester (if available)
                                    const courseSemester = course.semester || 'غير محدد';

                                    reportHtml += `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${course.course_code}</td>
                                            <td>${course.name}</td>
                                            <td>${course.department_name || 'غير محدد'}</td>
                                            <td>${courseSemester}</td>
                                        </tr>
                                    `;
                                });

                                reportHtml += `
                                            </tbody>
                                        </table>
                                    </div>
                                `;
                            }

                            reportHtml += `
                                        </div>
                                        <div class="card-footer text-muted text-center">
                                            إجمالي المواد المسجل بها: ${enrolledCourses.length}
                                        </div>
                                    </div>
                                </div>
                            `;

                            // Update container with report
                            studentReportContainer.innerHTML = reportHtml;
                        } catch (err) {
                            console.error('Error generating report:', err);
                            throw new Error('حدث خطأ أثناء إنشاء التقرير');
                        }
                    });
            })
            .catch(error => {
                console.error('Error loading student report:', error);
                studentReportContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message || 'حدث خطأ أثناء تحميل تقرير الطالب'}
                    </div>
                `;
            });
    }
}

// Admin: Open student report modal
function openStudentReportModal(studentId) {
    // Show modal
    const reportModal = new bootstrap.Modal(document.getElementById('studentReportModal'));
    reportModal.show();

    // Show loading, hide error and content
    document.getElementById('student-report-loading').classList.remove('d-none');
    document.getElementById('student-report-error').classList.add('d-none');
    document.getElementById('admin-student-report').classList.add('d-none');

    // Fetch student data
    fetch(`/api/admin/students/${studentId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات الطالب');
            }
            return response.json();
        })
        .then(studentData => {
            const student = studentData.student;

            // Fetch student courses
            return fetch(`/api/admin/students/${studentId}/courses`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('فشل في الحصول على بيانات المواد');
                    }
                    return response.json();
                })
                .then(coursesData => {
                    // Hide loading, show content
                    document.getElementById('student-report-loading').classList.add('d-none');
                    document.getElementById('admin-student-report').classList.remove('d-none');

                    // Generate report HTML
                    let reportHtml = `
                        <div class="student-report-container">
                            <div class="card mb-4">
                                <div class="card-header bg-primary text-white">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="card-title mb-0">معلومات الطالب</h5>
                                        <span class="badge bg-light text-dark">تاريخ التقرير: ${new Date().toLocaleDateString('ar-LY')}</span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>الاسم:</strong> ${student.name}</p>
                                            <p><strong>رقم القيد:</strong> ${student.student_id}</p>
                                            <p><strong>الفصل الدراسي:</strong> ${student.semester || 'الأول'}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>التخصص:</strong> ${student.department_name || 'غير محدد'}</p>
                                            <p><strong>رقم المنظومة:</strong> ${student.registration_number}</p>
                                            <p><strong>المواد المسجلة:</strong> ${coursesData.enrolledCourses ? coursesData.enrolledCourses.length : 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card mb-4">
                                <div class="card-header bg-success text-white">
                                    <h5 class="card-title mb-0">المواد المنجزة</h5>
                                </div>
                                <div class="card-body">
                    `;

                    if (!coursesData.completedCourses || coursesData.completedCourses.length === 0) {
                        reportHtml += `<div class="alert alert-info">لا توجد مواد منجزة</div>`;
                    } else {
                        reportHtml += `
                            <div class="table-responsive">
                                <table class="table table-striped table-bordered">
                                    <thead class="table-success">
                                        <tr>
                                            <th>#</th>
                                            <th>رمز المادة</th>
                                            <th>اسم المادة</th>
                                            <th>التخصص</th>
                                            <th>الفصل الدراسي</th>
                                            <th>تاريخ الإنجاز</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                        `;

                        coursesData.completedCourses.forEach((course, index) => {
                            // Format date with modern Arabic numerals
                            const completedDate = new Date(course.completed_at);
                            const formattedDate = completedDate.toLocaleDateString('ar-LY');

                            // Get course semester (if available)
                            const courseSemester = course.semester || 'غير محدد';

                            reportHtml += `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${course.course_code}</td>
                                    <td>${course.name}</td>
                                    <td>${course.department_name || 'غير محدد'}</td>
                                    <td>${courseSemester}</td>
                                    <td>${formattedDate}</td>
                                </tr>
                            `;
                        });

                        reportHtml += `
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }

                    reportHtml += `
                                </div>
                                <div class="card-footer text-muted text-center">
                                    إجمالي المواد المنجزة: ${coursesData.completedCourses ? coursesData.completedCourses.length : 0}
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header bg-info text-white">
                                    <h5 class="card-title mb-0">المواد المسجل بها حالياً</h5>
                                </div>
                                <div class="card-body">
                    `;

                    if (!coursesData.enrolledCourses || coursesData.enrolledCourses.length === 0) {
                        reportHtml += `<div class="alert alert-info">لا توجد مواد مسجل بها حالياً</div>`;
                    } else {
                        reportHtml += `
                            <div class="table-responsive">
                                <table class="table table-striped table-bordered">
                                    <thead class="table-info">
                                        <tr>
                                            <th>#</th>
                                            <th>رمز المادة</th>
                                            <th>اسم المادة</th>
                                            <th>التخصص</th>
                                            <th>الفصل الدراسي</th>
                                            <th>تاريخ التسجيل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                        `;

                        coursesData.enrolledCourses.forEach((course, index) => {
                            // Format date with modern Arabic numerals
                            const enrollmentDate = new Date(course.created_at);
                            const formattedDate = enrollmentDate.toLocaleDateString('ar-LY');

                            // Get course semester (if available)
                            const courseSemester = course.semester || 'غير محدد';

                            reportHtml += `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${course.course_code}</td>
                                    <td>${course.name}</td>
                                    <td>${course.department_name || 'غير محدد'}</td>
                                    <td>${courseSemester}</td>
                                    <td>${formattedDate}</td>
                                </tr>
                            `;
                        });

                        reportHtml += `
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }

                    reportHtml += `
                                </div>
                                <div class="card-footer text-muted text-center">
                                    إجمالي المواد المسجل بها: ${coursesData.enrolledCourses ? coursesData.enrolledCourses.length : 0}
                                </div>
                            </div>
                        </div>
                    `;

                    // Update container with report
                    document.getElementById('admin-student-report').innerHTML = reportHtml;

                    // Setup print button
                    setupPrintAdminReport();
                });
        })
        .catch(error => {
            console.error('Error loading student report:', error);
            document.getElementById('student-report-loading').classList.add('d-none');
            document.getElementById('student-report-error').classList.remove('d-none');
            document.getElementById('student-report-error').textContent = error.message || 'حدث خطأ أثناء تحميل تقرير الطالب';
        });
}

// Admin: Open filtered students report modal
function openFilteredReportModal(departmentId, semester) {
    // Show modal
    const reportModal = new bootstrap.Modal(document.getElementById('filteredReportModal'));
    reportModal.show();

    // Show loading, hide error and content
    document.getElementById('filtered-report-loading').classList.remove('d-none');
    document.getElementById('filtered-report-error').classList.add('d-none');
    document.getElementById('filtered-students-report').classList.add('d-none');

    // Get filter names
    const departmentSelect = document.getElementById('filter-student-department-select');
    const semesterSelect = document.getElementById('filter-student-semester-select');
    let departmentName = 'جميع التخصصات';
    let semesterName = 'جميع الفصول الدراسية';

    if (departmentId && departmentSelect) {
        const selectedOption = departmentSelect.querySelector(`option[value="${departmentId}"]`);
        if (selectedOption) {
            departmentName = selectedOption.textContent;
        }
    }

    if (semester && semesterSelect) {
        const selectedOption = semesterSelect.querySelector(`option[value="${semester}"]`);
        if (selectedOption) {
            semesterName = selectedOption.textContent;
        }
    }

    // Fetch students
    fetch('/api/admin/students')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات الطلبة');
            }
            return response.json();
        })
        .then(data => {
            // Filter students based on criteria
            let filteredStudents = data.students;

            if (departmentId) {
                filteredStudents = filteredStudents.filter(student => student.department_id == departmentId);
            }

            if (semester) {
                filteredStudents = filteredStudents.filter(student => student.semester === semester);
            }

            // Hide loading, show content
            document.getElementById('filtered-report-loading').classList.add('d-none');
            document.getElementById('filtered-students-report').classList.remove('d-none');

            // Generate report title based on filters
            let reportTitle = 'تقرير الطلبة';
            if (departmentId && semester) {
                reportTitle = `تقرير طلبة تخصص ${departmentName} في ${semesterName}`;
            } else if (departmentId) {
                reportTitle = `تقرير طلبة تخصص ${departmentName}`;
            } else if (semester) {
                reportTitle = `تقرير طلبة ${semesterName}`;
            }

            // Generate report HTML
            let reportHtml = `
                <div class="filtered-report-container">
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0">${reportTitle}</h5>
                                <span class="badge bg-light text-dark">تاريخ التقرير: ${new Date().toLocaleDateString('ar-LY')}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <p><strong>التخصص:</strong> ${departmentName}</p>
                                    <p><strong>الفصل الدراسي:</strong> ${semesterName}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>عدد الطلبة:</strong> ${filteredStudents.length}</p>
                                </div>
                            </div>

                            <div class="table-responsive">
                                <table class="table table-striped table-bordered">
                                    <thead class="table-primary">
                                        <tr>
                                            <th>#</th>
                                            <th>رقم القيد</th>
                                            <th>اسم الطالب</th>
                                            <th>التخصص</th>
                                            <th>الفصل الدراسي</th>
                                            <th>رقم المنظومة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            if (filteredStudents.length === 0) {
                reportHtml += `
                    <tr>
                        <td colspan="6" class="text-center">لا يوجد طلبة مطابقين للتصنيف المحدد</td>
                    </tr>
                `;
            } else {
                // Determine grouping based on filters
                if (departmentId && !semester) {
                    // Group by semester when only department is selected
                    const studentsBySemester = {};
                    filteredStudents.forEach(student => {
                        const sem = student.semester || 'الأول';
                        if (!studentsBySemester[sem]) {
                            studentsBySemester[sem] = [];
                        }
                        studentsBySemester[sem].push(student);
                    });

                    // Sort semesters in logical order
                    const semesterOrder = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن'];
                    const sortedSemesters = Object.keys(studentsBySemester).sort((a, b) => {
                        return semesterOrder.indexOf(a) - semesterOrder.indexOf(b);
                    });

                    // Display students by semester
                    let studentIndex = 1;
                    sortedSemesters.forEach(sem => {
                        // Add semester header
                        reportHtml += `
                            <tr class="table-secondary">
                                <td colspan="6" class="fw-bold">الفصل الدراسي ${sem}</td>
                            </tr>
                        `;

                        // Add students in this semester
                        studentsBySemester[sem].forEach(student => {
                            reportHtml += `
                                <tr>
                                    <td>${studentIndex++}</td>
                                    <td>${student.student_id}</td>
                                    <td>${student.name}</td>
                                    <td>${student.department_name || 'غير محدد'}</td>
                                    <td>${student.semester || 'الأول'}</td>
                                    <td>${student.registration_number}</td>
                                </tr>
                            `;
                        });
                    });
                } else if (!departmentId && semester) {
                    // Group by department when only semester is selected
                    const studentsByDepartment = {};
                    filteredStudents.forEach(student => {
                        const dept = student.department_name || 'غير محدد';
                        if (!studentsByDepartment[dept]) {
                            studentsByDepartment[dept] = [];
                        }
                        studentsByDepartment[dept].push(student);
                    });

                    // Sort departments alphabetically
                    const sortedDepartments = Object.keys(studentsByDepartment).sort();

                    // Display students by department
                    let studentIndex = 1;
                    sortedDepartments.forEach(dept => {
                        // Add department header
                        reportHtml += `
                            <tr class="table-secondary">
                                <td colspan="6" class="fw-bold">تخصص ${dept}</td>
                            </tr>
                        `;

                        // Add students in this department
                        studentsByDepartment[dept].forEach(student => {
                            reportHtml += `
                                <tr>
                                    <td>${studentIndex++}</td>
                                    <td>${student.student_id}</td>
                                    <td>${student.name}</td>
                                    <td>${student.department_name || 'غير محدد'}</td>
                                    <td>${student.semester || 'الأول'}</td>
                                    <td>${student.registration_number}</td>
                                </tr>
                            `;
                        });
                    });
                } else if (!departmentId && !semester) {
                    // Group by department when no filter is selected
                    const studentsByDepartment = {};
                    filteredStudents.forEach(student => {
                        const dept = student.department_name || 'غير محدد';
                        if (!studentsByDepartment[dept]) {
                            studentsByDepartment[dept] = [];
                        }
                        studentsByDepartment[dept].push(student);
                    });

                    // Sort departments alphabetically
                    const sortedDepartments = Object.keys(studentsByDepartment).sort();

                    // Display students by department
                    let studentIndex = 1;
                    sortedDepartments.forEach(dept => {
                        // Add department header
                        reportHtml += `
                            <tr class="table-secondary">
                                <td colspan="6" class="fw-bold">تخصص ${dept}</td>
                            </tr>
                        `;

                        // Add students in this department
                        studentsByDepartment[dept].forEach(student => {
                            reportHtml += `
                                <tr>
                                    <td>${studentIndex++}</td>
                                    <td>${student.student_id}</td>
                                    <td>${student.name}</td>
                                    <td>${student.department_name || 'غير محدد'}</td>
                                    <td>${student.semester || 'الأول'}</td>
                                    <td>${student.registration_number}</td>
                                </tr>
                            `;
                        });
                    });
                } else {
                    // Just list all students when both filters are applied
                    filteredStudents.forEach((student, index) => {
                        reportHtml += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${student.student_id}</td>
                                <td>${student.name}</td>
                                <td>${student.department_name || 'غير محدد'}</td>
                                <td>${student.semester || 'الأول'}</td>
                                <td>${student.registration_number}</td>
                            </tr>
                        `;
                    });
                }
            }

            reportHtml += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer text-muted text-center">
                            إجمالي عدد الطلبة: ${filteredStudents.length}
                        </div>
                    </div>
                </div>
            `;

            // Update container with report
            document.getElementById('filtered-students-report').innerHTML = reportHtml;

            // Setup print button
            const printReportBtn = document.getElementById('print-filtered-report');
            if (printReportBtn) {
                printReportBtn.addEventListener('click', function() {
                    const reportContent = document.getElementById('filtered-students-report').innerHTML;
                    const printWindow = window.open('', '_blank');

                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html lang="ar" dir="rtl">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>تقرير الطلبة حسب التصنيف</title>
                            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
                            <style>
                                body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    padding: 20px;
                                }
                                .report-header {
                                    text-align: center;
                                    margin-bottom: 30px;
                                }
                                .report-header h1 {
                                    font-size: 24px;
                                    margin-bottom: 10px;
                                }
                                .report-header p {
                                    font-size: 16px;
                                    color: #666;
                                }
                                .university-logo {
                                    max-width: 100px;
                                    margin-bottom: 15px;
                                }
                                @media print {
                                    .no-print {
                                        display: none;
                                    }
                                    body {
                                        padding: 0;
                                        margin: 0;
                                    }
                                    .card {
                                        border: none !important;
                                        box-shadow: none !important;
                                    }
                                    .card-header {
                                        background-color: #f8f9fa !important;
                                        color: #000 !important;
                                        border-bottom: 1px solid #dee2e6 !important;
                                    }
                                    .table-primary th, .table-secondary td {
                                        background-color: #f8f9fa !important;
                                        color: #000 !important;
                                    }
                                    .badge {
                                        border: 1px solid #dee2e6 !important;
                                        color: #000 !important;
                                        background-color: transparent !important;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="report-header">
                                <img src="/images/images.jpg" alt="شعار الجامعة" class="university-logo">
                                <h1>جامعة الحاضرة</h1>
                                <p>تقرير الطلبة حسب التصنيف</p>
                            </div>

                            ${reportContent}

                            <div class="text-center mt-4 no-print">
                                <button class="btn btn-primary" onclick="window.print()">طباعة</button>
                                <button class="btn btn-secondary" onclick="window.close()">إغلاق</button>
                            </div>
                        </body>
                        </html>
                    `);

                    printWindow.document.close();
                });
            }
        })
        .catch(error => {
            console.error('Error loading filtered students report:', error);
            document.getElementById('filtered-report-loading').classList.add('d-none');
            document.getElementById('filtered-report-error').classList.remove('d-none');
            document.getElementById('filtered-report-error').textContent = error.message || 'حدث خطأ أثناء تحميل تقرير الطلبة';
        });
}

// Setup print admin report
function setupPrintAdminReport() {
    const printReportBtn = document.getElementById('print-admin-report');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', function() {
            const reportContent = document.getElementById('admin-student-report').innerHTML;

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>تقرير الطالب</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        .card {
                            margin-bottom: 20px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                        }
                        .card-header {
                            padding: 10px 15px;
                            border-bottom: 1px solid #ddd;
                        }
                        .card-body {
                            padding: 15px;
                        }
                        .card-footer {
                            padding: 10px 15px;
                            border-top: 1px solid #ddd;
                        }
                        .bg-primary {
                            background-color: #0d6efd !important;
                            color: white !important;
                        }
                        .bg-info {
                            background-color: #0dcaf0 !important;
                            color: white !important;
                        }
                        .bg-success {
                            background-color: #198754 !important;
                            color: white !important;
                        }
                        .bg-light {
                            background-color: #f8f9fa !important;
                            color: #212529 !important;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        th, td {
                            padding: 8px;
                            border: 1px solid #ddd;
                            text-align: right;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                        .badge {
                            padding: 5px 10px;
                            border-radius: 4px;
                            font-weight: bold;
                        }
                        .text-muted {
                            color: #6c757d !important;
                        }
                        .text-center {
                            text-align: center !important;
                        }
                        .alert {
                            padding: 15px;
                            margin-bottom: 20px;
                            border: 1px solid transparent;
                            border-radius: 4px;
                        }
                        .alert-info {
                            color: #0c5460;
                            background-color: #d1ecf1;
                            border-color: #bee5eb;
                        }
                        @media print {
                            .no-print {
                                display: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="text-center mb-4">
                            <h2>تقرير الطالب</h2>
                        </div>
                        ${reportContent}
                        <div class="no-print text-center mt-4">
                            <button class="btn btn-primary" onclick="window.print()">طباعة</button>
                            <button class="btn btn-secondary" onclick="window.close()">إغلاق</button>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }
}

// Print student report
function setupPrintReport() {
    const printReportBtn = document.getElementById('print-report');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', function() {
            const reportContent = document.getElementById('student-report').innerHTML;

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>تقرير الطالب</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            direction: rtl;
                            text-align: right;
                            padding: 20px;
                            color: #333;
                            line-height: 1.6;
                        }
                        .container {
                            max-width: 1000px;
                            margin: 0 auto;
                        }
                        .report-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #0d6efd;
                            padding-bottom: 15px;
                        }
                        .report-header h2 {
                            font-size: 24px;
                            color: #0d6efd;
                            margin-bottom: 5px;
                        }
                        .report-header p {
                            color: #6c757d;
                            font-size: 14px;
                            margin-top: 0;
                        }
                        .card {
                            margin-bottom: 25px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                            page-break-inside: avoid;
                        }
                        .card-header {
                            padding: 12px 20px;
                            border-bottom: 1px solid #ddd;
                            background-color: #f8f9fa;
                            border-radius: 8px 8px 0 0;
                            font-weight: bold;
                        }
                        .bg-primary {
                            background-color: #0d6efd !important;
                            color: white !important;
                        }
                        .bg-info {
                            background-color: #0dcaf0 !important;
                            color: white !important;
                        }
                        .bg-light {
                            background-color: #f8f9fa !important;
                            color: #212529 !important;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        th, td {
                            padding: 8px;
                            border: 1px solid #ddd;
                            text-align: right;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                        .badge {
                            padding: 5px 10px;
                            border-radius: 4px;
                            font-weight: bold;
                        }
                        .bg-danger {
                            background-color: #dc3545;
                            color: white;
                        }
                        .bg-warning {
                            background-color: #ffc107;
                        }
                        .bg-info {
                            background-color: #0dcaf0;
                            color: white;
                        }
                        .bg-success {
                            background-color: #198754;
                            color: white;
                        }
                        .text-muted {
                            color: #6c757d !important;
                        }
                        .text-center {
                            text-align: center !important;
                        }
                        .alert {
                            padding: 15px;
                            margin-bottom: 20px;
                            border: 1px solid transparent;
                            border-radius: 4px;
                        }
                        .alert-info {
                            color: #0c5460;
                            background-color: #d1ecf1;
                            border-color: #bee5eb;
                        }
                        .alert-danger {
                            color: #721c24;
                            background-color: #f8d7da;
                            border-color: #f5c6cb;
                        }
                        @media print {
                            .no-print {
                                display: none;
                            }
                            body {
                                padding: 0;
                                font-size: 12pt;
                            }
                            .container {
                                max-width: 100%;
                                width: 100%;
                            }
                            .card {
                                border: none;
                                box-shadow: none;
                            }
                            .card-header {
                                background-color: #f8f9fa !important;
                                color: #000 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            th {
                                background-color: #f2f2f2 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .table-striped tbody tr:nth-of-type(odd) {
                                background-color: rgba(0, 0, 0, 0.03) !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="report-header">
                            <h2>تقرير الطالب</h2>
                            <p>جامعة الحاضرة - نظام التسجيل الإلكتروني</p>
                        </div>
                        ${reportContent}
                        <div class="no-print text-center mt-4">
                            <button class="btn btn-primary" onclick="window.print()">طباعة</button>
                            <button class="btn btn-secondary" onclick="window.close()">إغلاق</button>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();

    // Setup login form
    setupLoginForm();

    // Setup logout
    setupLogout();

    // Setup registration control
    setupRegistrationControl();

    // Modal close buttons are now handled by modal-fixes.js

    // Function to load dashboard statistics
function loadDashboardStatistics() {
    const dashboardStatsLoading = document.getElementById('dashboard-stats-loading');
    const dashboardStatsError = document.getElementById('dashboard-stats-error');
    const dashboardStatsContent = document.getElementById('dashboard-stats-content');

    if (!dashboardStatsLoading || !dashboardStatsError || !dashboardStatsContent) return;

    // Show loading, hide error and content
    dashboardStatsLoading.classList.remove('d-none');
    dashboardStatsError.classList.add('d-none');
    dashboardStatsContent.classList.add('d-none');

    fetch('/api/admin/course-statistics')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على إحصائيات المواد');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            dashboardStatsLoading.classList.add('d-none');
            dashboardStatsContent.classList.remove('d-none');

            // Calculate summary statistics
            const totalCourses = data.courses.length;
            const totalEnrollments = data.courses.reduce((sum, course) => sum + course.enrolled_students, 0);
            const avgEnrollmentRate = parseFloat((data.courses.reduce((sum, course) => sum + course.enrollment_percentage, 0) / totalCourses).toFixed(2));
            const fullCourses = data.courses.filter(course => course.enrollment_percentage >= 90).length;

            // Update dashboard stats
            const totalCoursesElement = document.getElementById('dashboard-total-courses');
            const totalEnrollmentsElement = document.getElementById('dashboard-total-enrollments');
            const avgEnrollmentRateElement = document.getElementById('dashboard-avg-enrollment-rate');
            const fullCoursesElement = document.getElementById('dashboard-full-courses');

            if (totalCoursesElement) totalCoursesElement.innerHTML = `<span class="stat-number">${totalCourses}</span>`;
            if (totalEnrollmentsElement) totalEnrollmentsElement.innerHTML = `<span class="stat-number">${totalEnrollments}</span>`;
            if (avgEnrollmentRateElement) avgEnrollmentRateElement.innerHTML = `<span class="summary-percentage">${avgEnrollmentRate}<span class="percent-sign">%</span></span>`;
            if (fullCoursesElement) fullCoursesElement.innerHTML = `<span class="stat-number">${fullCourses}</span>`;
        })
        .catch(error => {
            console.error('Error loading dashboard statistics:', error);
            dashboardStatsLoading.classList.add('d-none');
            dashboardStatsError.classList.remove('d-none');
            dashboardStatsError.textContent = error.message || 'حدث خطأ أثناء تحميل الإحصائيات';
        });
}

// Setup refresh dashboard statistics button
function setupDashboardStatisticsRefresh() {
    const refreshButton = document.getElementById('refresh-dashboard-stats');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            loadDashboardStatistics();
        });
    }
}

// Setup registration control
function setupRegistrationControl() {
    const toggleRegistrationBtn = document.getElementById('toggle-registration-btn');
    const registrationStatusBadge = document.getElementById('registration-status-badge');

    if (!toggleRegistrationBtn || !registrationStatusBadge) return;

    // Load current registration status
    loadRegistrationStatus();

    // Setup toggle registration button
    toggleRegistrationBtn.addEventListener('click', function() {
        // Get current status from badge class
        const isCurrentlyOpen = registrationStatusBadge.classList.contains('bg-success');

        // Toggle status
        updateRegistrationStatus(!isCurrentlyOpen);
    });

    // Load registration status
    function loadRegistrationStatus() {
        fetch('/api/registration-status')
            .then(response => response.json())
            .then(data => {
                updateRegistrationStatusUI(data.registration_open);
            })
            .catch(error => {
                console.error('Error loading registration status:', error);
                alert('حدث خطأ أثناء تحميل حالة التسجيل');
            });
    }

    // Update registration status
    function updateRegistrationStatus(isOpen) {
        // Disable button while updating
        toggleRegistrationBtn.disabled = true;

        fetch('/api/admin/registration-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_open: isOpen })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في تحديث حالة التسجيل');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateRegistrationStatusUI(data.registration_open);
                alert(isOpen ? 'تم فتح التسجيل بنجاح' : 'تم إغلاق التسجيل بنجاح');
            } else {
                throw new Error('فشل في تحديث حالة التسجيل');
            }
        })
        .catch(error => {
            console.error('Error updating registration status:', error);
            alert(error.message || 'حدث خطأ أثناء تحديث حالة التسجيل');
        })
        .finally(() => {
            // Re-enable button
            toggleRegistrationBtn.disabled = false;
        });
    }

    // Update registration status UI
    function updateRegistrationStatusUI(isOpen) {
        if (isOpen) {
            registrationStatusBadge.textContent = 'مفتوح';
            registrationStatusBadge.className = 'badge bg-success fs-5';
            toggleRegistrationBtn.innerHTML = '<i class="fas fa-lock me-2"></i> إغلاق التسجيل';
            toggleRegistrationBtn.className = 'btn btn-danger btn-lg px-4 py-3';
        } else {
            registrationStatusBadge.textContent = 'مغلق';
            registrationStatusBadge.className = 'badge bg-danger fs-5';
            toggleRegistrationBtn.innerHTML = '<i class="fas fa-lock-open me-2"></i> فتح التسجيل';
            toggleRegistrationBtn.className = 'btn btn-success btn-lg px-4 py-3';
        }
    }
}





// Function to load course statistics
function loadCourseStatistics(filterDepartment = '', searchTerm = '', filterSemester = '') {
    const courseStatsLoading = document.getElementById('course-stats-loading');
    const courseStatsError = document.getElementById('course-stats-error');
    const courseStatsContent = document.getElementById('course-stats-content');
    const courseStatsTableBody = document.getElementById('course-stats-table-body');
    const filterDepartmentSelect = document.getElementById('stats-filter-department-select');
    const filterSemesterSelect = document.getElementById('stats-filter-semester-select');

    if (!courseStatsTableBody) return;

    // Show loading, hide error and content
    courseStatsLoading.classList.remove('d-none');
    courseStatsError.classList.add('d-none');
    courseStatsContent.classList.add('d-none');

    fetch('/api/admin/course-statistics')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على إحصائيات المواد');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            courseStatsLoading.classList.add('d-none');
            courseStatsContent.classList.remove('d-none');

            // Clear table
            courseStatsTableBody.innerHTML = '';

            // Filter courses based on department, semester, and search term
            let filteredCourses = data.courses;

            // Update current filters display
            const currentFilters = document.getElementById('current-stats-filters');
            const currentFilterText = document.getElementById('current-stats-filter-text');

            // Build filter description
            let filterDescription = 'عرض';
            let hasFilters = false;

            if (filterDepartment && filterDepartmentSelect) {
                filteredCourses = filteredCourses.filter(course => course.department_id == filterDepartment);
                // Get department name
                const departmentName = filterDepartmentSelect.options[filterDepartmentSelect.selectedIndex].text;
                filterDescription += ` مواد تخصص ${departmentName}`;
                hasFilters = true;

                // Highlight the department select - with null checks
                filterDepartmentSelect.classList.add('border-primary');
                if (filterDepartmentSelect.parentElement) {
                    const groupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.add('bg-primary', 'text-white');
                    }
                }
            } else if (filterDepartmentSelect) {
                // Remove highlight if no department filter
                filterDepartmentSelect.classList.remove('border-primary');
                if (filterDepartmentSelect.parentElement) {
                    const groupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }
            }

            if (filterSemester && filterSemesterSelect) {
                filteredCourses = filteredCourses.filter(course => course.semester === filterSemester);
                // Get semester name
                const semesterName = filterSemesterSelect.options[filterSemesterSelect.selectedIndex].text;
                if (hasFilters) {
                    filterDescription += ` في ${semesterName}`;
                } else {
                    filterDescription += ` مواد ${semesterName}`;
                    hasFilters = true;
                }

                // Highlight the semester select - with null checks
                filterSemesterSelect.classList.add('border-primary');
                if (filterSemesterSelect.parentElement) {
                    const groupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.add('bg-primary', 'text-white');
                    }
                }
            } else if (filterSemesterSelect) {
                // Remove highlight if no semester filter
                filterSemesterSelect.classList.remove('border-primary');
                if (filterSemesterSelect.parentElement) {
                    const groupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }
            }

            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                filteredCourses = filteredCourses.filter(course =>
                    course.course_code.toLowerCase().includes(searchLower) ||
                    course.name.toLowerCase().includes(searchLower)
                );

                if (hasFilters) {
                    filterDescription += ` (بحث: ${searchTerm})`;
                } else {
                    filterDescription += ` نتائج البحث عن "${searchTerm}"`;
                    hasFilters = true;
                }
            }

            if (!hasFilters) {
                filterDescription += ' جميع المواد';
            }

            // Update filter display
            if (currentFilters && currentFilterText) {
                currentFilterText.textContent = filterDescription;
                if (hasFilters) {
                    currentFilters.classList.remove('d-none');
                } else {
                    currentFilters.classList.add('d-none');
                }
            }

            if (filteredCourses.length === 0) {
                courseStatsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">لا توجد مواد مطابقة للبحث</td>
                    </tr>
                `;

                // Reset summary stats
                updateSummaryStats(0, 0, 0, 0);
                return;
            }

            // Calculate summary statistics
            const totalCourses = filteredCourses.length;
            const totalEnrollments = filteredCourses.reduce((sum, course) => sum + course.enrolled_students, 0);
            const avgEnrollmentRate = parseFloat((filteredCourses.reduce((sum, course) => sum + course.enrollment_percentage, 0) / totalCourses).toFixed(2));
            const fullCourses = filteredCourses.filter(course => course.enrollment_percentage >= 90).length;

            // Update summary stats
            updateSummaryStats(totalCourses, totalEnrollments, avgEnrollmentRate, fullCourses);

            // Fill table with course statistics
            filteredCourses.forEach(course => {
                const row = document.createElement('tr');

                // Determine color class based on enrollment percentage
                let percentageClass = '';
                if (course.enrollment_percentage >= 90) {
                    percentageClass = 'bg-danger text-white';
                } else if (course.enrollment_percentage >= 70) {
                    percentageClass = 'bg-warning';
                } else if (course.enrollment_percentage >= 50) {
                    percentageClass = 'bg-info text-white';
                } else {
                    percentageClass = 'bg-success text-white';
                }

                // Ensure semester has a value
                const semester = course.semester || 'غير محدد';

                row.innerHTML = `
                    <td>${course.course_code}</td>
                    <td>${course.name}</td>
                    <td class="d-none d-md-table-cell">${course.department_name || 'غير محدد'}</td>
                    <td class="d-none d-lg-table-cell">${semester}</td>
                    <td>${course.enrolled_students}</td>
                    <td class="d-none d-sm-table-cell">${course.max_students}</td>
                    <td class="text-center"><span class="badge ${percentageClass} px-2 py-1">${course.enrollment_percentage.toFixed(2)}<span class="percent-sign">%</span></span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-info view-course-students" data-id="${course.id}">
                            <i class="fas fa-users"></i> <span class="d-none d-md-inline">عرض الطلبة</span>
                        </button>
                    </td>
                `;

                courseStatsTableBody.appendChild(row);
            });

            // Setup view course students buttons
            setupViewCourseStudentsButtons();
        })
        .catch(error => {
            console.error('Error loading course statistics:', error);
            courseStatsLoading.classList.add('d-none');
            courseStatsError.classList.remove('d-none');
            courseStatsError.textContent = error.message || 'حدث خطأ أثناء تحميل إحصائيات المواد';

            // Reset summary stats on error
            updateSummaryStats(0, 0, 0, 0);
        });
}

// Setup view course students buttons
function setupViewCourseStudentsButtons() {
    document.querySelectorAll('.view-course-students').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-id');
            openCourseStudentsModal(courseId);
        });
    });
}

// Open course students modal
function openCourseStudentsModal(courseId) {
    // Get modal elements
    const modal = new bootstrap.Modal(document.getElementById('courseStudentsModal'));
    const modalLoading = document.getElementById('course-students-loading');
    const modalError = document.getElementById('course-students-error');
    const modalContent = document.getElementById('course-students-content');
    const modalTableBody = document.getElementById('course-students-table-body');
    const noStudentsMessage = document.getElementById('no-students-message');

    // Show modal
    modal.show();

    // Show loading, hide error and content
    modalLoading.classList.remove('d-none');
    modalError.classList.add('d-none');
    modalContent.classList.add('d-none');

    // Fetch course students data
    fetch(`/api/admin/course/${courseId}/students`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات الطلبة');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            modalLoading.classList.add('d-none');
            modalContent.classList.remove('d-none');

            // Update course info
            document.getElementById('modal-course-name').textContent = data.course.name;
            document.getElementById('modal-course-code').textContent = data.course.course_code;
            document.getElementById('modal-course-department').textContent = data.course.department_name || 'غير محدد';
            document.getElementById('modal-enrolled-students').textContent = data.course.enrolled_students;
            document.getElementById('modal-max-students').textContent = data.course.max_students;
            // Determine color class based on enrollment percentage
            let percentageClass = '';
            if (data.course.enrollment_percentage >= 90) {
                percentageClass = 'bg-danger text-white';
            } else if (data.course.enrollment_percentage >= 70) {
                percentageClass = 'bg-warning';
            } else if (data.course.enrollment_percentage >= 50) {
                percentageClass = 'bg-info text-white';
            } else {
                percentageClass = 'bg-success text-white';
            }

            document.getElementById('modal-enrollment-percentage').innerHTML = `<span class="badge ${percentageClass} px-2 py-1">${data.course.enrollment_percentage.toFixed(2)}<span class="percent-sign">%</span></span>`;

            // Clear table
            modalTableBody.innerHTML = '';

            // Check if there are students
            if (data.students.length === 0) {
                noStudentsMessage.classList.remove('d-none');
            } else {
                // Hide no students message
                noStudentsMessage.classList.add('d-none');
            }

            // Fill table with students
            data.students.forEach((student, index) => {
                const row = document.createElement('tr');

                // Format date with modern Arabic numerals
                const enrollmentDate = new Date(student.enrollment_date);
                // First get the date in Arabic format
                const arabicDate = enrollmentDate.toLocaleDateString('ar-EG');
                // Then convert to modern Arabic numerals (1234567890)
                const formattedDate = arabicDate.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(d.charCodeAt(0) - 1632));

                // Ensure semester has a value
                const semester = student.semester || 'الأول';

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.registration_number}</td>
                    <td>${student.department_name || 'غير محدد'}</td>
                    <td>${semester}</td>
                    <td>${formattedDate}</td>
                `;

                modalTableBody.appendChild(row);
            });

            // Setup export button
            setupExportStudentsCSV(data.course, data.students);
        })
        .catch(error => {
            console.error('Error loading course students:', error);
            modalLoading.classList.add('d-none');
            modalError.classList.remove('d-none');
            modalError.textContent = error.message || 'حدث خطأ أثناء تحميل بيانات الطلبة';
        });
}

// Setup export students functions
function setupExportStudentsCSV(course, students) {
    const exportExcelButton = document.getElementById('export-students-excel');
    const viewPdfButton = document.getElementById('view-students-pdf');

    // Setup PDF view button
    if (viewPdfButton) {
        viewPdfButton.onclick = function() {
            viewStudentsAsPdf(course, students);
        };
    }

    // Setup Excel export button
    if (exportExcelButton && typeof XLSX !== 'undefined') {
        exportExcelButton.onclick = function() {
            try {
                // Prepare data for Excel
                const excelData = [
                    // Header row
                    ['رقم', 'رقم القيد', 'اسم الطالب', 'رقم المنظومة', 'التخصص', 'الفصل الدراسي', 'تاريخ التسجيل']
                ];

                // Check if there are students
                if (students.length === 0) {
                    // Add a row indicating no students
                    excelData.push(['', 'لا يوجد طلبة مسجلين في هذه المادة', '', '', '', '', '']);
                } else {
                    // Add student rows
                    students.forEach((student, index) => {
                        // Format date with modern Arabic numerals
                        const enrollmentDate = new Date(student.enrollment_date);
                        // First get the date in Arabic format
                        const arabicDate = enrollmentDate.toLocaleDateString('ar-EG');
                        // Then convert to modern Arabic numerals (1234567890)
                        const formattedDate = arabicDate.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(d.charCodeAt(0) - 1632));

                        // Ensure semester has a value
                        const semester = student.semester || 'الأول';

                        excelData.push([
                            index + 1,
                            student.student_id,
                            student.name,
                            student.registration_number,
                            student.department_name || 'غير محدد',
                            semester,
                            formattedDate
                        ]);
                    });
                }

                // Create worksheet
                const ws = XLSX.utils.aoa_to_sheet(excelData);

                // Set RTL direction for the worksheet
                ws['!cols'] = [
                    { wch: 5 },  // رقم
                    { wch: 15 }, // رقم القيد
                    { wch: 30 }, // اسم الطالب
                    { wch: 15 }, // رقم المنظومة
                    { wch: 20 }, // التخصص
                    { wch: 15 }, // الفصل الدراسي
                    { wch: 15 }  // تاريخ التسجيل
                ];

                // Create workbook
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'الطلبة المسجلين');

                // Generate Excel file
                const fileName = `طلبة_${course.course_code}_${new Date().toISOString().slice(0,10)}.xlsx`;
                XLSX.writeFile(wb, fileName);

                // Show success message
                alert('تم تصدير بيانات الطلبة بنجاح بتنسيق Excel');
            } catch (error) {
                console.error('Error exporting to Excel:', error);
                alert('حدث خطأ أثناء تصدير البيانات: ' + error.message);
            }
        };
    }
}

// Update summary statistics
function updateSummaryStats(totalCourses, totalEnrollments, avgEnrollmentRate, fullCourses) {
    const totalCoursesElement = document.getElementById('total-courses');
    const totalEnrollmentsElement = document.getElementById('total-enrollments');
    const avgEnrollmentRateElement = document.getElementById('avg-enrollment-rate');
    const fullCoursesElement = document.getElementById('full-courses');

    if (totalCoursesElement) totalCoursesElement.innerHTML = `<span class="stat-number">${totalCourses}</span>`;
    if (totalEnrollmentsElement) totalEnrollmentsElement.innerHTML = `<span class="stat-number">${totalEnrollments}</span>`;
    if (avgEnrollmentRateElement) avgEnrollmentRateElement.innerHTML = `<span class="summary-percentage">${avgEnrollmentRate.toFixed(2)}<span class="percent-sign">%</span></span>`;
    if (fullCoursesElement) fullCoursesElement.innerHTML = `<span class="stat-number">${fullCourses}</span>`;
}

// Setup course statistics filters
function setupCourseStatisticsFilters() {
    const searchInput = document.getElementById('stats-search');
    const searchButton = document.getElementById('stats-search-btn');
    const filterDepartmentSelect = document.getElementById('stats-filter-department-select');
    const filterSemesterSelect = document.getElementById('stats-filter-semester-select');
    const resetFiltersButton = document.getElementById('reset-stats-filters');

    if (searchInput && searchButton) {
        // Remove existing event listeners
        searchButton.replaceWith(searchButton.cloneNode(true));
        const newSearchButton = document.getElementById('stats-search-btn');

        // Search on button click
        newSearchButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchTerm = searchInput.value.trim();
            const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
            const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

            // Store current filter values in window object to preserve them
            window.currentStatsFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load statistics with the filter
            loadCourseStatistics(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });

        // Remove existing event listeners
        searchInput.replaceWith(searchInput.cloneNode(true));
        const newSearchInput = document.getElementById('stats-search');

        // Search on Enter key
        newSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                // Save current scroll position
                const scrollPosition = window.scrollY;

                const searchTerm = newSearchInput.value.trim();
                const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
                const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

                // Store current filter values in window object to preserve them
                window.currentStatsFilters = {
                    department: filterDepartment,
                    semester: filterSemester,
                    search: searchTerm
                };

                // Load statistics with the filter
                loadCourseStatistics(filterDepartment, searchTerm, filterSemester);

                // Restore scroll position after a short delay
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                    });
                }, 10);
            }
        });
    }

    if (filterDepartmentSelect) {
        // Always load departments to ensure they are available
        console.log('Loading departments for filter...');
        fetch('/api/admin/departments')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load departments');
                }
                return response.json();
            })
            .then(data => {
                // Clear existing options
                filterDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';

                // Add departments
                data.departments.forEach(department => {
                    const option = document.createElement('option');
                    option.value = department.id;
                    option.textContent = department.name;
                    filterDepartmentSelect.appendChild(option);
                });

                console.log(`Loaded ${data.departments.length} departments for filter`);

                // If there was a previously selected department, try to restore it
                if (window.currentStatsFilters && window.currentStatsFilters.department) {
                    filterDepartmentSelect.value = window.currentStatsFilters.department;
                }

                // Now that departments are loaded, setup the event listener
                // Clone the select element with its options to preserve them
                const clone = filterDepartmentSelect.cloneNode(true);

                // Remove existing event listeners by replacing with clone
                filterDepartmentSelect.replaceWith(clone);
                const newFilterDepartmentSelect = document.getElementById('stats-filter-department-select');

                // Setup the change event listener
                setupDepartmentFilterChangeListener(newFilterDepartmentSelect, searchInput, filterSemesterSelect);
            })
            .catch(error => {
                console.error('Error loading departments for filter:', error);
            });
    }

    // Helper function to setup department filter change listener
    function setupDepartmentFilterChangeListener(departmentSelect, searchInput, semesterSelect) {

        // Filter on department change
        departmentSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const filterDepartment = departmentSelect.value;
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const currentSemesterSelect = document.getElementById('stats-filter-semester-select');
            const filterSemester = currentSemesterSelect ? currentSemesterSelect.value : '';

            // Apply visual highlight immediately without waiting for reload
            if (filterDepartment) {
                departmentSelect.classList.add('border-primary');
                if (departmentSelect.parentElement) {
                    const groupText = departmentSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.add('bg-primary', 'text-white');
                        groupText.classList.remove('bg-light');
                    }
                }
            } else {
                departmentSelect.classList.remove('border-primary');
                if (departmentSelect.parentElement) {
                    const groupText = departmentSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }
            }

            // Store current filter values in window object to preserve them
            window.currentStatsFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load statistics with the filter
            loadCourseStatistics(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }

    if (filterSemesterSelect) {
        // Store current value before replacing
        const currentValue = filterSemesterSelect.value;

        // Remove existing event listeners
        filterSemesterSelect.replaceWith(filterSemesterSelect.cloneNode(true));
        const newFilterSemesterSelect = document.getElementById('stats-filter-semester-select');

        // Restore the selected value
        if (currentValue) {
            newFilterSemesterSelect.value = currentValue;
        }

        // Setup the semester filter change listener
        setupSemesterFilterChangeListener(newFilterSemesterSelect, searchInput);

        // Set initial title
        const selectedOption = newFilterSemesterSelect.options[newFilterSemesterSelect.selectedIndex];
        if (selectedOption) {
            newFilterSemesterSelect.title = selectedOption.text;
        }
    }

    // Helper function to setup semester filter change listener
    function setupSemesterFilterChangeListener(semesterSelect, searchInput) {
        // Filter on semester change
        semesterSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            // Get current filter values
            const departmentSelect = document.getElementById('stats-filter-department-select');
            const filterDepartment = departmentSelect ? departmentSelect.value : '';
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const filterSemester = semesterSelect.value;

            // Update the select element's title attribute to show the current selection
            const selectedOption = semesterSelect.options[semesterSelect.selectedIndex];
            if (selectedOption) {
                semesterSelect.title = selectedOption.text;
            }

            // Apply visual highlight immediately without waiting for reload
            if (filterSemester) {
                semesterSelect.classList.add('border-primary');
                if (semesterSelect.parentElement) {
                    const groupText = semesterSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.add('bg-primary', 'text-white');
                        groupText.classList.remove('bg-light');
                    }
                }
            } else {
                semesterSelect.classList.remove('border-primary');
                if (semesterSelect.parentElement) {
                    const groupText = semesterSelect.parentElement.querySelector('.input-group-text');
                    if (groupText) {
                        groupText.classList.remove('bg-primary', 'text-white');
                        groupText.classList.add('bg-light');
                    }
                }
            }

            // Store current filter values in window object to preserve them
            window.currentStatsFilters = {
                department: filterDepartment,
                semester: filterSemester,
                search: searchTerm
            };

            // Load statistics with the filter
            loadCourseStatistics(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }

    if (resetFiltersButton) {
        // Remove existing event listeners
        resetFiltersButton.replaceWith(resetFiltersButton.cloneNode(true));
        const newResetFiltersButton = document.getElementById('reset-stats-filters');

        // Reset filters
        newResetFiltersButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchInput = document.getElementById('stats-search');
            const filterDepartmentSelect = document.getElementById('stats-filter-department-select');
            const filterSemesterSelect = document.getElementById('stats-filter-semester-select');

            if (searchInput) searchInput.value = '';

            // Reset department filter and remove highlight
            if (filterDepartmentSelect) {
                filterDepartmentSelect.value = '';
                filterDepartmentSelect.classList.remove('border-primary');
                if (filterDepartmentSelect.parentElement) {
                    const deptGroupText = filterDepartmentSelect.parentElement.querySelector('.input-group-text');
                    if (deptGroupText) {
                        deptGroupText.classList.remove('bg-primary', 'text-white');
                        deptGroupText.classList.add('bg-light');
                    }
                }
            }

            // Reset semester filter and remove highlight
            if (filterSemesterSelect) {
                filterSemesterSelect.value = '';
                filterSemesterSelect.classList.remove('border-primary');
                if (filterSemesterSelect.parentElement) {
                    const semGroupText = filterSemesterSelect.parentElement.querySelector('.input-group-text');
                    if (semGroupText) {
                        semGroupText.classList.remove('bg-primary', 'text-white');
                        semGroupText.classList.add('bg-light');
                    }
                }
            }

            // Hide current filters display
            const currentFilters = document.getElementById('current-stats-filters');
            if (currentFilters) {
                currentFilters.classList.add('d-none');
            }

            // Clear stored filters
            window.currentStatsFilters = {
                department: '',
                semester: '',
                search: ''
            };

            // Load statistics with no filters
            loadCourseStatistics('', '', '');

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }
}

// Setup refresh course statistics button
function setupCourseStatisticsRefresh() {
    const refreshButton = document.getElementById('refresh-course-stats');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            const searchInput = document.getElementById('stats-search');
            const filterDepartmentSelect = document.getElementById('stats-filter-department-select');
            const filterSemesterSelect = document.getElementById('stats-filter-semester-select');

            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
            const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';

            // Load statistics with the current filters
            loadCourseStatistics(filterDepartment, searchTerm, filterSemester);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }
}

// Setup max courses limit control
function setupMaxCoursesControl() {
    const maxCoursesForm = document.getElementById('max-courses-form');
    const maxCoursesInput = document.getElementById('max-courses-input');
    const maxCoursesBadge = document.getElementById('max-courses-badge');

    if (!maxCoursesForm || !maxCoursesInput || !maxCoursesBadge) return;

    // Disable the form until data is loaded
    const submitButton = maxCoursesForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    // Load current max courses limit immediately
    console.log('Loading max courses limit...');
    loadMaxCoursesLimit();

    // Setup max courses form
    maxCoursesForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const maxCoursesLimit = parseInt(maxCoursesInput.value);

        if (isNaN(maxCoursesLimit) || maxCoursesLimit < 1) {
            alert('الرجاء إدخال قيمة صحيحة للحد الأقصى للمواد');
            return;
        }

        updateMaxCoursesLimit(maxCoursesLimit);
    });

    // Load max courses limit
    function loadMaxCoursesLimit() {
        // Show loading indicator
        maxCoursesBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        maxCoursesInput.placeholder = 'جاري التحميل...';

        fetch('/api/max-courses-limit')
            .then(response => {
                if (!response.ok) {
                    throw new Error('فشل في تحميل الحد الأقصى للمواد');
                }
                return response.json();
            })
            .then(data => {
                console.log('Max courses limit loaded:', data.max_courses_limit);
                updateMaxCoursesLimitUI(data.max_courses_limit);

                // Enable the form after data is loaded
                if (submitButton) submitButton.disabled = false;
            })
            .catch(error => {
                console.error('Error loading max courses limit:', error);
                maxCoursesBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                maxCoursesInput.placeholder = 'حدث خطأ';
            });
    }

    // Update max courses limit
    function updateMaxCoursesLimit(maxCoursesLimit) {
        // Disable form while updating
        const submitButton = maxCoursesForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        // Show loading indicator
        maxCoursesBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        fetch('/api/admin/max-courses-limit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ max_courses_limit: maxCoursesLimit })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في تحديث الحد الأقصى للمواد');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateMaxCoursesLimitUI(data.max_courses_limit);
                alert('تم تحديث الحد الأقصى للمواد بنجاح');
            } else {
                throw new Error('فشل في تحديث الحد الأقصى للمواد');
            }
        })
        .catch(error => {
            console.error('Error updating max courses limit:', error);
            alert('حدث خطأ أثناء تحديث الحد الأقصى للمواد');
            maxCoursesBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        })
        .finally(() => {
            submitButton.disabled = false;
        });
    }

    // Update UI based on max courses limit
    function updateMaxCoursesLimitUI(maxCoursesLimit) {
        maxCoursesInput.value = maxCoursesLimit;
        maxCoursesInput.placeholder = '';
        maxCoursesBadge.textContent = maxCoursesLimit;
    }
}

// Setup reset enrollments button
function setupResetEnrollmentsButton() {
    const resetEnrollmentsBtn = document.getElementById('reset-enrollments-btn');
    const resetStudentEnrollmentsForm = document.getElementById('reset-student-enrollments-form');

    // Setup reset all enrollments button
    if (resetEnrollmentsBtn) {
        resetEnrollmentsBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من إعادة ضبط جميع التسجيلات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                // Disable button while processing
                resetEnrollmentsBtn.disabled = true;
                resetEnrollmentsBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> جاري المعالجة...';

                fetch('/api/admin/reset-enrollments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('فشل في إعادة ضبط التسجيلات');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        alert(`تم إعادة ضبط التسجيلات بنجاح. تم حذف ${data.enrollments_before} تسجيل.`);
                    } else {
                        throw new Error('فشل في إعادة ضبط التسجيلات');
                    }
                })
                .catch(error => {
                    console.error('Error resetting enrollments:', error);
                    alert('حدث خطأ أثناء إعادة ضبط التسجيلات');
                })
                .finally(() => {
                    // Re-enable button
                    resetEnrollmentsBtn.disabled = false;
                    resetEnrollmentsBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i> إعادة ضبط جميع التسجيلات';
                });
            }
        });
    }

    // Setup reset student enrollments form
    if (resetStudentEnrollmentsForm) {
        resetStudentEnrollmentsForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const studentRegInput = document.getElementById('student-registration-input');
            const registrationNumber = studentRegInput.value.trim();

            if (!registrationNumber) {
                alert('الرجاء إدخال رقم قيد صحيح');
                return;
            }

            if (confirm(`هل أنت متأكد من إعادة ضبط تسجيلات الطالب برقم القيد ${registrationNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                // Disable form while processing
                const submitButton = resetStudentEnrollmentsForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> جاري المعالجة...';

                fetch('/api/admin/reset-student-enrollments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ registration_number: registrationNumber })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'فشل في إعادة ضبط تسجيلات الطالب');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        alert(`تم إعادة ضبط تسجيلات الطالب ${data.student_name || ''} برقم القيد ${registrationNumber} بنجاح. تم حذف ${data.rows_affected} تسجيل.`);
                        // Clear the input field after successful reset
                        studentRegInput.value = '';
                    } else {
                        throw new Error('فشل في إعادة ضبط تسجيلات الطالب');
                    }
                })
                .catch(error => {
                    console.error('Error resetting student enrollments:', error);
                    alert(error.message || 'حدث خطأ أثناء إعادة ضبط تسجيلات الطالب');
                })
                .finally(() => {
                    // Re-enable form
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-trash-alt me-2"></i> إعادة ضبط تسجيلات الطالب';
                });
            }
        });
    }
}



// Admin functions
    if (window.location.pathname.includes('/admin/')) {
        // Load data
        loadStudents();
        loadDepartments();
        loadCourses();
        loadStudentSelect();

        // Load statistics if on dashboard
        if (window.location.pathname.includes('/dashboard.html')) {
            loadDashboardStatistics();
            setupDashboardStatisticsRefresh();
            setupRegistrationControl();
            setupMaxCoursesControl();
            setupResetEnrollmentsButton();
        }

        // Setup course statistics page
        if (window.location.pathname.includes('/course-statistics.html')) {
            loadCourseStatistics();
            setupCourseStatisticsRefresh();
            setupCourseStatisticsFilters();
        }

        // Setup forms
        setupAddStudentForm();
        setupEditStudentForm();
        setupAddDepartmentForm();
        setupEditDepartmentForm();
        setupAddCourseForm();
        setupEditCourseForm();
        setupAddPrerequisiteForm();
        setupAddPrerequisiteModalForm();
        setupMarkCourseCompletedForm();
        setupMarkCourseCompletedModalForm();
    }

    // Student functions
    if (window.location.pathname.includes('/student/')) {
        // Load data
        loadStudentInfo();
        loadCompletedCourses();
        loadAvailableCourses();

        // Load student report when modal is opened
        const studentReportModal = document.getElementById('studentReportModal');
        if (studentReportModal) {
            studentReportModal.addEventListener('show.bs.modal', function() {
                loadStudentReport();
            });
        }

        // Setup print report button
        setupPrintReport();
    }
});
