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
                } else if (data.user.role === 'financial_supervisor') {
                    window.location.href = '/admin/payment-management.html';
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
            } else if (data.user.role === 'financial_supervisor') {
                const financialElements = document.querySelectorAll('.financial-only');
                financialElements.forEach(el => el.classList.remove('d-none'));

                // Hide admin-only elements for financial supervisor
                const adminElements = document.querySelectorAll('.admin-only:not(.financial-only)');
                adminElements.forEach(el => el.classList.add('d-none'));
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
        });
}

// Handle login form submission
function setupLoginForm() {
    console.log('Setting up login form...');
    const loginForm = document.getElementById('login-form');
    console.log('Login form element:', loginForm);
    const loginError = document.getElementById('login-error');
    console.log('Login error element:', loginError);
    let blockTimer = null;

    if (loginForm) {
        console.log('Adding event listener to login form');
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            console.log('Username:', username);

            // Deshabilitar el botón durante la solicitud
            submitButton.disabled = true;
            console.log('Submit button disabled');

            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'same-origin' // Include cookies in the request
            })
            .then(response => {
                console.log('Response received:', response.status);
                // Convertir la respuesta a JSON independientemente del código de estado
                return response.json().then(data => {
                    console.log('Response data:', data);
                    // Agregar el código de estado a los datos para poder verificarlo después
                    return { ...data, status: response.status };
                });
            })
            .then(data => {
                console.log('Processed data:', data);
                // Habilitar el botón después de recibir la respuesta
                submitButton.disabled = false;

                if (data.success) {
                    console.log('Login successful:', data.user);
                    // Store user info in localStorage for client-side access
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Limpiar cualquier mensaje de error
                    loginError.classList.add('d-none');

                    // Limpiar cualquier temporizador existente
                    if (blockTimer) {
                        clearInterval(blockTimer);
                        blockTimer = null;
                    }

                    if (data.user.role === 'admin') {
                        window.location.href = '/admin/dashboard.html';
                    } else if (data.user.role === 'student') {
                        window.location.href = '/student/dashboard.html';
                    } else if (data.user.role === 'financial_supervisor') {
                        window.location.href = '/admin/payment-management.html';
                    }
                } else if (data.status === 429) {
                    console.log('Too many failed attempts, user blocked');
                    // Demasiados intentos fallidos - usuario bloqueado
                    loginError.textContent = data.message || 'تم حظر تسجيل الدخول مؤقتًا. يرجى المحاولة لاحقًا.';
                    loginError.classList.remove('d-none');

                    // Deshabilitar el formulario durante el bloqueo
                    const formInputs = loginForm.querySelectorAll('input, button');
                    formInputs.forEach(input => input.disabled = true);
                    console.log('Form inputs disabled');

                    // Iniciar temporizador de cuenta regresiva
                    let timeLeft = data.timeLeft || 30;
                    console.log('Starting countdown timer:', timeLeft);

                    // Limpiar cualquier temporizador existente
                    if (blockTimer) {
                        clearInterval(blockTimer);
                    }

                    blockTimer = setInterval(() => {
                        timeLeft--;
                        console.log('Time left:', timeLeft);
                        loginError.textContent = `تم حظر تسجيل الدخول مؤقتًا. يرجى المحاولة بعد ${timeLeft} ثانية`;

                        if (timeLeft <= 0) {
                            console.log('Countdown finished');
                            clearInterval(blockTimer);
                            blockTimer = null;

                            // Habilitar el formulario nuevamente
                            formInputs.forEach(input => input.disabled = false);
                            console.log('Form inputs enabled');
                            loginError.textContent = 'يمكنك المحاولة مرة أخرى الآن.';

                            // Después de 2 segundos, ocultar el mensaje
                            setTimeout(() => {
                                loginError.classList.add('d-none');
                            }, 2000);
                        }
                    }, 1000);
                } else if (data.status === 401) {
                    console.log('Invalid credentials');
                    // Credenciales inválidas
                    if (data.attemptsLeft !== undefined) {
                        console.log('Attempts left:', data.attemptsLeft);
                        loginError.textContent = `خطأ في تسجيل الدخول. يرجى التحقق من رقم القيد ورقم المنظومة. (محاولات متبقية: ${data.attemptsLeft})`;
                    } else {
                        loginError.textContent = 'خطأ في تسجيل الدخول. يرجى التحقق من رقم القيد ورقم المنظومة.';
                    }
                    loginError.classList.remove('d-none');
                } else {
                    console.log('Other error');
                    // Otro error
                    loginError.textContent = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
                    loginError.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                submitButton.disabled = false;
                loginError.textContent = 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.';
                loginError.classList.remove('d-none');
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
function loadStudents(filterDepartment = '', searchTerm = '', filterSemester = '', filterGroup = '') {
    console.log(`تحميل الطلبة مع التصفية - التخصص: ${filterDepartment}, البحث: ${searchTerm}, الفصل: ${filterSemester}, المجموعة: ${filterGroup}`);

    // استخدام القيم المخزنة في window.currentFilters إذا لم يتم تمرير قيم جديدة
    if (filterDepartment === '' && window.currentFilters && window.currentFilters.department) {
        filterDepartment = window.currentFilters.department;
        console.log(`استخدام قيمة التخصص المخزنة في window.currentFilters: ${filterDepartment}`);
    }

    if (filterSemester === '' && window.currentFilters && window.currentFilters.semester) {
        filterSemester = window.currentFilters.semester;
        console.log(`استخدام قيمة الفصل المخزنة في window.currentFilters: ${filterSemester}`);
    }

    if (searchTerm === '' && window.currentFilters && window.currentFilters.search) {
        searchTerm = window.currentFilters.search;
        console.log(`استخدام قيمة البحث المخزنة في window.currentFilters: ${searchTerm}`);
    }

    if (filterGroup === '' && window.currentFilters && window.currentFilters.group) {
        filterGroup = window.currentFilters.group;
        console.log(`استخدام قيمة المجموعة المخزنة في window.currentFilters: ${filterGroup}`);
    }

    // تخزين قيم التصفية الحالية في متغير عالمي للاحتفاظ بها
    window.currentFilters = {
        department: filterDepartment,
        semester: filterSemester,
        search: searchTerm,
        group: filterGroup
    };

    console.log(`تم تخزين قيم التصفية في window.currentFilters: ${JSON.stringify(window.currentFilters)}`);

    const studentsTable = document.getElementById('students-table-body');
    const filterDepartmentSelect = document.getElementById('filter-student-department-select');
    const filterSemesterSelect = document.getElementById('filter-student-semester-select');
    const filterGroupSelect = document.getElementById('filter-student-group-select');

    // استخدام القيم المخزنة في window.currentFilters إذا كانت موجودة
    if (window.currentFilters) {
        // استخدام القيم المخزنة فقط إذا لم يتم تمرير قيم جديدة
        if (!filterDepartment && window.currentFilters.department) {
            filterDepartment = window.currentFilters.department;
            console.log(`استخدام قيمة التخصص المخزنة: ${filterDepartment}`);
        }
        if (!filterSemester && window.currentFilters.semester) {
            filterSemester = window.currentFilters.semester;
            console.log(`استخدام قيمة الفصل الدراسي المخزنة: ${filterSemester}`);
        }
        if (!searchTerm && window.currentFilters.search) {
            searchTerm = window.currentFilters.search;
            console.log(`استخدام قيمة البحث المخزنة: ${searchTerm}`);
        }
    }

    // تأكد من أن قيمة التخصص المحددة محفوظة في القائمة المنسدلة
    if (filterDepartmentSelect && filterDepartment) {
        filterDepartmentSelect.value = String(filterDepartment);
        console.log(`تم تعيين قيمة التخصص المحدد في القائمة المنسدلة: ${filterDepartment}`);
    }

    // تأكد من أن قيمة الفصل الدراسي المحددة محفوظة في القائمة المنسدلة
    if (filterSemesterSelect && filterSemester) {
        filterSemesterSelect.value = filterSemester;
        console.log(`تم تعيين قيمة الفصل الدراسي المحدد في القائمة المنسدلة: ${filterSemester}`);
    }

    // تخزين القيم الحالية في window.currentFilters
    window.currentFilters = {
        department: filterDepartment,
        semester: filterSemester,
        group: filterGroup,
        search: searchTerm
    };

    if (studentsTable) {
        fetch('/api/admin/students')
            .then(response => response.json())
            .then(data => {
                // Store all students globally
                allStudents = data.students;

                // لا نقوم بتحديث قائمة التخصصات هنا لتجنب التعارض مع setupStudentFilters
                // سيتم تحديث قائمة التخصصات فقط في setupStudentFilters
                console.log('تم تخطي تحديث قائمة التخصصات في loadStudents لتجنب التعارض');

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
                    // تصفية الطلبة حسب التخصص - المعرفات الآن نصوص من الخادم
                    console.log(`تصفية الطلبة حسب التخصص: ${filterDepartment}`);
                    console.log(`عدد الطلبة قبل التصفية: ${filteredStudents.length}`);

                    // طباعة معرفات التخصصات للطلبة للتصحيح
                    console.log('معرفات تخصصات الطلبة:');
                    filteredStudents.forEach(student => {
                        // تأكد من أن معرف التخصص هو نص
                        if (student.department_id !== null && student.department_id !== undefined) {
                            student.department_id = String(student.department_id);
                        }
                        console.log(`الطالب: ${student.name}, معرف التخصص: ${student.department_id}, نوع المعرف: ${typeof student.department_id}`);
                    });

                    filteredStudents = filteredStudents.filter(student => {
                        // تحويل كلا المعرفين إلى نصوص للمقارنة
                        const studentDeptId = String(student.department_id);
                        const filterDeptId = String(filterDepartment);
                        const match = studentDeptId === filterDeptId;
                        console.log(`مقارنة: ${student.name} - ${studentDeptId} === ${filterDeptId} = ${match}`);
                        return match;
                    });

                    // Get department name - with safety checks
                    let departmentName = "غير معروف";
                    if (filterDepartmentSelect && filterDepartmentSelect.selectedIndex >= 0) {
                        const selectedOption = filterDepartmentSelect.options[filterDepartmentSelect.selectedIndex];
                        if (selectedOption) {
                            departmentName = selectedOption.text;
                        }
                    }

                    // إذا لم نجد اسم التخصص، نحاول الحصول عليه من قائمة التخصصات
                    if (departmentName === "غير معروف") {
                        // استعلام عن التخصصات من الخادم
                        fetch('/api/admin/departments')
                            .then(response => response.json())
                            .then(data => {
                                const department = data.departments.find(dept => String(dept.id) === String(filterDepartment));
                                if (department) {
                                    departmentName = department.name;
                                    // تحديث وصف التصفية
                                    const currentFilterText = document.getElementById('current-filter-text');
                                    if (currentFilterText) {
                                        currentFilterText.textContent = currentFilterText.textContent.replace("غير معروف", departmentName);
                                    }
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching department name:', error);
                            });
                    }

                    filterDescription += ` طلبة تخصص ${departmentName}`;
                    hasFilters = true;

                    console.log(`تصفية الطلبة حسب التخصص: ${filterDepartment}, عدد الطلبة بعد التصفية: ${filteredStudents.length}, اسم التخصص: ${departmentName}`);

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

                if (filterGroup) {
                    filteredStudents = filteredStudents.filter(student => {
                        // تصفية حسب اسم المجموعة
                        const studentGroup = student.group_name || '';
                        return studentGroup === filterGroup;
                    });

                    // Get group name
                    if (hasFilters) {
                        filterDescription += ` في مجموعة ${filterGroup}`;
                    } else {
                        filterDescription += ` طلبة مجموعة ${filterGroup}`;
                        hasFilters = true;
                    }

                    // Highlight the group select
                    if (filterGroupSelect) {
                        filterGroupSelect.classList.add('border-primary');
                        filterGroupSelect.parentElement.querySelector('.input-group-text').classList.add('bg-primary', 'text-white');
                    }

                    console.log(`تصفية الطلبة حسب المجموعة: ${filterGroup}, عدد الطلبة بعد التصفية: ${filteredStudents.length}`);
                } else {
                    // Remove highlight if no group filter
                    if (filterGroupSelect) {
                        filterGroupSelect.classList.remove('border-primary');
                        const groupText = filterGroupSelect.parentElement.querySelector('.input-group-text');
                        if (groupText) {
                            groupText.classList.remove('bg-primary', 'text-white');
                            groupText.classList.add('bg-light');
                        }
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
                            <td>${student.group_name || '-'}</td>
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

    // Use the new loadDepartmentsFromAPI function
    loadDepartmentsFromAPI()
        .then(departments => {
            // Fill departments table if it exists
            if (departmentsTable) {
                departmentsTable.innerHTML = '';

                if (departments.length === 0) {
                    departmentsTable.innerHTML = '<tr><td colspan="3" class="text-center">لا توجد تخصصات</td></tr>';
                } else {
                    // استخدام فهرس للترقيم التسلسلي بدلاً من معرف قاعدة البيانات
                    departments.forEach((department, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
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
            }

            // Fill all department selects
            const fillDepartmentSelect = (selectElement) => {
                if (selectElement) {
                    selectElement.innerHTML = '<option value="">اختر التخصص</option>';

                    departments.forEach(department => {
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

            console.log('Departments loaded:', departments.length);

            // Update all department selects to ensure they have the latest data
            setTimeout(() => {
                updateAllDepartmentSelects();
            }, 500);
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
    console.log(`تحميل المواد مع التصفية - التخصص: ${filterDepartment}, البحث: ${searchTerm}, الفصل: ${filterSemester}`);

    // استخدام القيم المخزنة في window.currentCourseFilters إذا لم يتم تمرير قيم جديدة
    if (filterDepartment === '' && window.currentCourseFilters && window.currentCourseFilters.department) {
        filterDepartment = window.currentCourseFilters.department;
        console.log(`استخدام قيمة التخصص المخزنة في window.currentCourseFilters: ${filterDepartment}`);
    }

    if (filterSemester === '' && window.currentCourseFilters && window.currentCourseFilters.semester) {
        filterSemester = window.currentCourseFilters.semester;
        console.log(`استخدام قيمة الفصل المخزنة في window.currentCourseFilters: ${filterSemester}`);
    }

    if (searchTerm === '' && window.currentCourseFilters && window.currentCourseFilters.search) {
        searchTerm = window.currentCourseFilters.search;
        console.log(`استخدام قيمة البحث المخزنة في window.currentCourseFilters: ${searchTerm}`);
    }

    // تخزين قيم التصفية الحالية في متغير عالمي للاحتفاظ بها
    window.currentCourseFilters = {
        department: filterDepartment,
        semester: filterSemester,
        search: searchTerm
    };

    console.log(`تم تخزين قيم التصفية في window.currentCourseFilters: ${JSON.stringify(window.currentCourseFilters)}`);

    const coursesTable = document.getElementById('courses-table-body');
    const courseSelect = document.getElementById('course-select');
    const prerequisiteSelect = document.getElementById('prerequisite-select');
    const filterDepartmentSelect = document.getElementById('filter-department-select');
    const filterSemesterSelect = document.getElementById('filter-course-semester-select');

    // استخدام القيم المخزنة في window.currentCourseFilters إذا كانت موجودة
    if (window.currentCourseFilters) {
        // استخدام القيم المخزنة فقط إذا لم يتم تمرير قيم جديدة
        if (!filterDepartment && window.currentCourseFilters.department) {
            filterDepartment = window.currentCourseFilters.department;
            console.log(`استخدام قيمة التخصص المخزنة للمواد: ${filterDepartment}`);
        }
        if (!filterSemester && window.currentCourseFilters.semester) {
            filterSemester = window.currentCourseFilters.semester;
            console.log(`استخدام قيمة الفصل الدراسي المخزنة للمواد: ${filterSemester}`);
        }
        if (!searchTerm && window.currentCourseFilters.search) {
            searchTerm = window.currentCourseFilters.search;
            console.log(`استخدام قيمة البحث المخزنة للمواد: ${searchTerm}`);
        }
    }

    // تأكد من أن قيمة التخصص المحددة محفوظة في القائمة المنسدلة
    if (filterDepartmentSelect && filterDepartment) {
        filterDepartmentSelect.value = String(filterDepartment);
        console.log(`تم تعيين قيمة التخصص المحدد في قائمة المواد: ${filterDepartment}`);
    }

    // تأكد من أن قيمة الفصل الدراسي المحددة محفوظة في القائمة المنسدلة
    if (filterSemesterSelect && filterSemester) {
        filterSemesterSelect.value = filterSemester;
        console.log(`تم تعيين قيمة الفصل الدراسي المحدد في قائمة المواد: ${filterSemester}`);
    }

    // تخزين القيم الحالية في window.currentCourseFilters
    window.currentCourseFilters = {
        department: filterDepartment,
        semester: filterSemester,
        search: searchTerm
    };

    fetch('/api/admin/courses')
        .then(response => response.json())
        .then(data => {
            // Store all courses globally
            allCourses = data.courses;

            // Always update the filter department select with the latest departments from the API
            if (filterDepartmentSelect) {
                console.log('Updating course filter department select...');

                // Save current selection
                const currentSelection = filterDepartmentSelect.value || filterDepartment;

                // Keep the first option (All departments)
                filterDepartmentSelect.innerHTML = '<option value="">جميع التخصصات</option>';

                // Get departments directly from the API
                fetch('/api/admin/departments')
                    .then(response => response.json())
                    .then(deptData => {
                        console.log(`Loaded ${deptData.departments.length} departments for course filter`);

                        // Add departments from the API
                        deptData.departments.forEach(department => {
                            const option = document.createElement('option');
                            // تأكد من أن القيمة هي نص
                            option.value = String(department.id);
                            option.textContent = department.name;
                            // إضافة معرف التخصص كخاصية للعنصر
                            option.dataset.departmentId = String(department.id);
                            filterDepartmentSelect.appendChild(option);

                            // طباعة معلومات التخصص للتصحيح
                            console.log(`إضافة تخصص لقائمة المواد: ${department.name}, المعرف: ${option.value}, نوع المعرف: ${typeof option.value}`);
                        });

                        // Restore previous selection if it exists
                        if (currentSelection) {
                            console.log(`Restoring department selection to: ${currentSelection}`);
                            filterDepartmentSelect.value = currentSelection;
                        }

                        // Add change event to filter course list (without cloning to avoid losing the selection)
                        if (filterDepartmentSelect) {
                            // Remove existing event listeners by cloning and replacing
                            const oldSelect = filterDepartmentSelect;
                            const newSelect = oldSelect.cloneNode(true);

                            // Make sure to set the value before replacing
                            if (currentSelection) {
                                newSelect.value = currentSelection;
                            }

                            oldSelect.parentNode.replaceChild(newSelect, oldSelect);

                            // Get the new reference after replacement
                            const newFilterDepartmentSelect = document.getElementById('filter-department-select');

                            // Add change event to filter course list
                            newFilterDepartmentSelect.addEventListener('change', function() {
                                const selectedDepartmentId = this.value;
                                const searchTerm = document.getElementById('course-search') ?
                                    document.getElementById('course-search').value.trim() : '';
                                const filterSemester = document.getElementById('filter-course-semester-select') ?
                                    document.getElementById('filter-course-semester-select').value : '';

                                console.log(`Department filter changed to: ${selectedDepartmentId}`);

                                // Update the global filter state
                                window.currentCourseFilters = {
                                    department: selectedDepartmentId,
                                    semester: filterSemester,
                                    search: searchTerm
                                };

                                console.log(`Updated window.currentCourseFilters:`, window.currentCourseFilters);

                                loadCourses(selectedDepartmentId, searchTerm, filterSemester);
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error loading departments for course filter:', error);
                    });
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
                    // تصفية المواد حسب التخصص - المعرفات الآن نصوص من الخادم
                    console.log(`تصفية المواد حسب التخصص: ${filterDepartment}`);
                    console.log(`عدد المواد قبل التصفية: ${filteredCourses.length}`);

                    // طباعة معرفات التخصصات للمواد للتصحيح
                    console.log('معرفات تخصصات المواد:');
                    filteredCourses.forEach(course => {
                        // تأكد من أن معرف التخصص هو نص
                        if (course.department_id !== null && course.department_id !== undefined) {
                            course.department_id = String(course.department_id);
                        }
                        console.log(`المادة: ${course.name}, معرف التخصص: ${course.department_id}, نوع المعرف: ${typeof course.department_id}`);
                    });

                    filteredCourses = filteredCourses.filter(course => {
                        // تحويل كلا المعرفين إلى نصوص للمقارنة
                        const courseDeptId = String(course.department_id);
                        const filterDeptId = String(filterDepartment);
                        const match = courseDeptId === filterDeptId;
                        console.log(`مقارنة: ${course.name} - ${courseDeptId} === ${filterDeptId} = ${match}`);
                        return match;
                    });

                    // Get department name - with safety checks
                    let departmentName = "غير معروف";
                    if (filterDepartmentSelect && filterDepartmentSelect.selectedIndex >= 0) {
                        const selectedOption = filterDepartmentSelect.options[filterDepartmentSelect.selectedIndex];
                        if (selectedOption) {
                            departmentName = selectedOption.text;
                        }
                    }

                    // إذا لم نجد اسم التخصص، نحاول الحصول عليه من قائمة التخصصات
                    if (departmentName === "غير معروف") {
                        // استعلام عن التخصصات من الخادم
                        fetch('/api/admin/departments')
                            .then(response => response.json())
                            .then(data => {
                                const department = data.departments.find(dept => String(dept.id) === String(filterDepartment));
                                if (department) {
                                    departmentName = department.name;
                                    // تحديث وصف التصفية
                                    const currentFilterText = document.getElementById('current-course-filter-text');
                                    if (currentFilterText) {
                                        currentFilterText.textContent = currentFilterText.textContent.replace("غير معروف", departmentName);
                                    }
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching department name:', error);
                            });
                    }

                    filterDescription += ` مواد تخصص ${departmentName}`;
                    hasFilters = true;

                    console.log(`تصفية المواد حسب التخصص: ${filterDepartment}, عدد المواد بعد التصفية: ${filteredCourses.length}, اسم التخصص: ${departmentName}`);

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
                        <td colspan="7" class="text-center">لا توجد مواد مطابقة للبحث</td>
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
                            <td class="text-center">
                                <button class="btn btn-sm btn-success manage-groups" data-id="${course.id}">
                                    <i class="fas fa-users"></i> <span class="d-none d-md-inline">المجموعات</span>
                                </button>
                            </td>
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

                // Setup manage groups buttons
                document.querySelectorAll('.manage-groups').forEach(button => {
                    button.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        openCourseGroupsModal(courseId);
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
                    if (departmentId && course.department_id !== departmentId) {
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
                    if (departmentId && course.department_id !== departmentId) {
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

    // تهيئة window.currentCourseFilters إذا لم تكن موجودة
    if (!window.currentCourseFilters) {
        window.currentCourseFilters = {
            department: filterDepartmentSelect ? filterDepartmentSelect.value : '',
            semester: filterSemesterSelect ? filterSemesterSelect.value : '',
            search: searchInput ? searchInput.value.trim() : ''
        };
        console.log('تم تهيئة window.currentCourseFilters:', window.currentCourseFilters);
    }

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
        console.log('Setting up department filter for courses...');

        // Store current value before replacing
        const currentValue = filterDepartmentSelect.value;
        console.log('Current department filter value:', currentValue);

        // Remove existing event listeners
        filterDepartmentSelect.replaceWith(filterDepartmentSelect.cloneNode(true));
        const newFilterDepartmentSelect = document.getElementById('filter-department-select');

        // استخدام الوظيفة المساعدة لتحميل التخصصات
        loadDepartmentsIntoFilterSelect(newFilterDepartmentSelect, currentValue)
            .then(() => {
                // Filter on department change
                newFilterDepartmentSelect.addEventListener('change', function() {
                    // Save current scroll position
                    const scrollPosition = window.scrollY;

                    const filterDepartment = newFilterDepartmentSelect.value;
                    const searchTerm = searchInput ? searchInput.value.trim() : '';
                    const newFilterSemesterSelect = document.getElementById('filter-course-semester-select');
                    const filterSemester = newFilterSemesterSelect ? newFilterSemesterSelect.value : '';

                    // Update the select element's title attribute to show the current selection
                    const selectedOption = newFilterDepartmentSelect.options[newFilterDepartmentSelect.selectedIndex];
                    newFilterDepartmentSelect.title = selectedOption.text;

                    // تسجيل معلومات التصفية للتصحيح
                    console.log(`تصفية المواد: التخصص=${filterDepartment}, الفصل=${filterSemester}, البحث=${searchTerm}`);

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

// Function to refresh the group filter dropdown with the latest group values
function refreshGroupFilterDropdown() {
    const filterGroupSelect = document.getElementById('filter-student-group-select');
    if (!filterGroupSelect) return;

    // Store current selected value
    const currentValue = filterGroupSelect.value;

    console.log('Refreshing group filter dropdown, current value:', currentValue);

    // Fetch latest student data to get updated group values
    fetch('/api/admin/students')
        .then(response => response.json())
        .then(data => {
            // Extract unique groups from student data
            const uniqueGroups = new Set();
            data.students.forEach(student => {
                if (student.group_name && student.group_name.trim() !== '') {
                    uniqueGroups.add(student.group_name);
                }
            });

            // Rebuild the dropdown
            filterGroupSelect.innerHTML = '<option value="">جميع المجموعات</option>';
            Array.from(uniqueGroups).sort().forEach(groupName => {
                const option = document.createElement('option');
                option.value = groupName;
                option.textContent = groupName;
                filterGroupSelect.appendChild(option);
            });

            // Restore selected value if it still exists in the options
            if (currentValue) {
                const groupExists = Array.from(filterGroupSelect.options).some(option => option.value === currentValue);
                if (groupExists) {
                    filterGroupSelect.value = currentValue;
                }
            }

            console.log(`Group filter dropdown refreshed with ${uniqueGroups.size} groups`);
        })
        .catch(error => {
            console.error('Error refreshing group filter dropdown:', error);
        });
}

// Setup student search and filter events
function setupStudentFilters() {
    const searchInput = document.getElementById('student-search');
    const searchButton = document.getElementById('student-search-btn');
    const filterDepartmentSelect = document.getElementById('filter-student-department-select');
    const filterSemesterSelect = document.getElementById('filter-student-semester-select');
    const filterGroupSelect = document.getElementById('filter-student-group-select');
    const resetFiltersButton = document.getElementById('reset-student-filters');

    console.log('Setting up student filters...');
    console.log('Filter department select:', filterDepartmentSelect ? filterDepartmentSelect.id : 'not found');
    console.log('Filter semester select:', filterSemesterSelect ? filterSemesterSelect.id : 'not found');
    console.log('Filter group select:', filterGroupSelect ? filterGroupSelect.id : 'not found');

    // تهيئة window.currentFilters إذا لم تكن موجودة
    if (!window.currentFilters) {
        window.currentFilters = {
            department: filterDepartmentSelect ? filterDepartmentSelect.value : '',
            semester: filterSemesterSelect ? filterSemesterSelect.value : '',
            group: filterGroupSelect ? filterGroupSelect.value : '',
            search: searchInput ? searchInput.value.trim() : ''
        };
        console.log('تم تهيئة window.currentFilters:', window.currentFilters);
    }

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
        console.log('Setting up department filter for students...');

        // Store current value before replacing
        const currentValue = filterDepartmentSelect.value;
        console.log('Current department filter value:', currentValue);

        // Remove existing event listeners
        filterDepartmentSelect.replaceWith(filterDepartmentSelect.cloneNode(true));
        const newFilterDepartmentSelect = document.getElementById('filter-student-department-select');

        // استخدام الوظيفة المساعدة لتحميل التخصصات
        loadDepartmentsIntoFilterSelect(newFilterDepartmentSelect, currentValue)
            .then(() => {
                // Filter on department change
                newFilterDepartmentSelect.addEventListener('change', function() {
                    // Save current scroll position
                    const scrollPosition = window.scrollY;

                    // Get current filter values
                    const filterDepartment = newFilterDepartmentSelect.value;
                    const searchTerm = searchInput ? searchInput.value.trim() : '';
                    const newFilterSemesterSelect = document.getElementById('filter-student-semester-select');
                    const filterSemester = newFilterSemesterSelect ? newFilterSemesterSelect.value : '';

                    // Update the select element's title attribute to show the current selection
                    const selectedOption = newFilterDepartmentSelect.options[newFilterDepartmentSelect.selectedIndex];
                    newFilterDepartmentSelect.title = selectedOption.text;

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
                    // Get the current group filter value
                    const newFilterGroupSelect = document.getElementById('filter-student-group-select');
                    const filterGroup = newFilterGroupSelect ? newFilterGroupSelect.value : '';

                    window.currentFilters = {
                        department: filterDepartment,
                        semester: filterSemester,
                        group: filterGroup,
                        search: searchTerm
                    };

                    console.log(`تم تحديث window.currentFilters: ${JSON.stringify(window.currentFilters)}`);

                    // Load students with the filter
                    loadStudents(filterDepartment, searchTerm, filterSemester, filterGroup);

                    // Restore scroll position after a short delay
                    setTimeout(() => {
                        window.scrollTo({
                            top: scrollPosition,
                            behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                        });
                    }, 10);
                });
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

            // Reset group filter and remove highlight
            const filterGroupSelect = document.getElementById('filter-student-group-select');
            if (filterGroupSelect) {
                filterGroupSelect.value = '';
                filterGroupSelect.classList.remove('border-primary');
                const groupText = filterGroupSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.remove('bg-primary', 'text-white');
                    groupText.classList.add('bg-light');
                }
            }

            // Hide current filters display
            const currentFilters = document.getElementById('current-filters');
            if (currentFilters) {
                currentFilters.classList.add('d-none');
            }

            // Clear stored filters
            window.currentFilters = {
                department: '',
                semester: '',
                group: '',
                search: ''
            };

            // Load students with no filters
            loadStudents('', '', '', '');

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
            const newFilterGroupSelect = document.getElementById('filter-student-group-select');
            const filterDepartment = newFilterDepartmentSelect ? newFilterDepartmentSelect.value : '';
            const filterGroup = newFilterGroupSelect ? newFilterGroupSelect.value : '';
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
                group: filterGroup,
                search: searchTerm
            };

            // Load students with the filter
            loadStudents(filterDepartment, searchTerm, filterSemester, filterGroup);

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

    // إضافة معالج حدث للتصفية حسب المجموعة
    if (filterGroupSelect) {
        // Store current value before replacing
        const currentValue = filterGroupSelect.value;

        // Remove existing event listeners
        filterGroupSelect.replaceWith(filterGroupSelect.cloneNode(true));
        const newFilterGroupSelect = document.getElementById('filter-student-group-select');

        // Restore the selected value
        if (currentValue) {
            newFilterGroupSelect.value = currentValue;
        }

        // تحميل المجموعات المتاحة
        fetch('/api/admin/students')
            .then(response => response.json())
            .then(data => {
                // استخراج المجموعات الفريدة من بيانات الطلاب
                const uniqueGroups = new Set();
                data.students.forEach(student => {
                    if (student.group_name && student.group_name.trim() !== '') {
                        uniqueGroups.add(student.group_name);
                    }
                });

                // إضافة المجموعات إلى القائمة المنسدلة
                newFilterGroupSelect.innerHTML = '<option value="">جميع المجموعات</option>';
                Array.from(uniqueGroups).sort().forEach(groupName => {
                    const option = document.createElement('option');
                    option.value = groupName;
                    option.textContent = groupName;
                    newFilterGroupSelect.appendChild(option);
                });

                // استعادة القيمة المحددة سابقًا إذا كانت موجودة
                if (window.currentFilters && window.currentFilters.group) {
                    const groupExists = Array.from(newFilterGroupSelect.options).some(option => option.value === window.currentFilters.group);
                    if (groupExists) {
                        newFilterGroupSelect.value = window.currentFilters.group;
                    }
                }

                console.log(`تم تحميل ${uniqueGroups.size} مجموعة للتصفية`);
            })
            .catch(error => {
                console.error('خطأ في تحميل المجموعات:', error);
            });

        // Filter on group change
        newFilterGroupSelect.addEventListener('change', function() {
            // Save current scroll position
            const scrollPosition = window.scrollY;

            // Get current filter values
            const newFilterDepartmentSelect = document.getElementById('filter-student-department-select');
            const newFilterSemesterSelect = document.getElementById('filter-student-semester-select');
            const filterDepartment = newFilterDepartmentSelect ? newFilterDepartmentSelect.value : '';
            const filterSemester = newFilterSemesterSelect ? newFilterSemesterSelect.value : '';
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const filterGroup = newFilterGroupSelect.value;

            // Update the select element's title attribute to show the current selection
            const selectedOption = newFilterGroupSelect.options[newFilterGroupSelect.selectedIndex];
            newFilterGroupSelect.title = selectedOption.text;

            // Apply visual highlight immediately without waiting for reload
            if (filterGroup) {
                newFilterGroupSelect.classList.add('border-primary');
                const groupText = newFilterGroupSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.add('bg-primary', 'text-white');
                    groupText.classList.remove('bg-light');
                }
            } else {
                newFilterGroupSelect.classList.remove('border-primary');
                const groupText = newFilterGroupSelect.parentElement.querySelector('.input-group-text');
                if (groupText) {
                    groupText.classList.remove('bg-primary', 'text-white');
                    groupText.classList.add('bg-light');
                }
            }

            // Store current filter values in window object to preserve them
            window.currentFilters = {
                department: filterDepartment,
                semester: filterSemester,
                group: filterGroup,
                search: searchTerm
            };

            // Load students with the filter
            loadStudents(filterDepartment, searchTerm, filterSemester, filterGroup);

            // Restore scroll position after a short delay
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 10);
        });
    }

    // Setup filtered report button
    const showFilteredReportBtn = document.getElementById('show-filtered-report');

    if (showFilteredReportBtn) {
        showFilteredReportBtn.addEventListener('click', function() {
            const filterDepartmentSelect = document.getElementById('filter-student-department-select');
            const filterSemesterSelect = document.getElementById('filter-student-semester-select');
            const filterGroupSelect = document.getElementById('filter-student-group-select');
            const filterDepartment = filterDepartmentSelect ? filterDepartmentSelect.value : '';
            const filterSemester = filterSemesterSelect ? filterSemesterSelect.value : '';
            const filterGroup = filterGroupSelect ? filterGroupSelect.value : '';

            // Allow showing all students if no filter is selected
            openFilteredReportModal(filterDepartment, filterSemester, filterGroup);
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
            const group_name = document.getElementById('group-name').value;

            // Validate inputs
            if (!name || !student_id || !department_id || !registration_number) {
                const errorElement = document.getElementById('student-form-error');
                errorElement.textContent = 'يرجى ملء جميع الحقول المطلوبة';
                errorElement.classList.remove('d-none');
                return;
            }

            console.log('Sending student data:', { name, student_id, department_id, registration_number, semester, group_name });

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
                body: JSON.stringify({ name, student_id, department_id, registration_number, semester, group_name })
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

                    // Refresh the group filter dropdown with the new group
                    refreshGroupFilterDropdown();
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

                    // Set group_name value if it exists
                    const groupNameInput = document.getElementById('edit-group-name');
                    if (groupNameInput) {
                        groupNameInput.value = student.group_name || '';
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
            const group_name = document.getElementById('edit-group-name').value;

            // Validate inputs
            if (!name || !student_id || !department_id || !registration_number) {
                const errorElement = document.getElementById('edit-student-form-error');
                errorElement.textContent = 'يرجى ملء جميع الحقول المطلوبة';
                errorElement.classList.remove('d-none');
                return;
            }

            console.log('Updating student:', studentId, { name, student_id, department_id, registration_number, semester, group_name });

            // Disable button while submitting
            const originalButtonText = saveChangesButton.textContent;
            saveChangesButton.disabled = true;
            saveChangesButton.textContent = 'جاري الحفظ...';

            fetch(`/api/admin/students/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, student_id, department_id, registration_number, semester, group_name })
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

                    // Refresh the group filter dropdown
                    refreshGroupFilterDropdown();

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
            const semester = document.getElementById('course-semester').value;
            // الحد الأقصى للطلبة يتم حسابه تلقائيًا من مجموع المجموعات
            const max_students = 0;

            // Validate inputs
            if (!course_code || !name || !department_id) {
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
                    // عرض الحد الأقصى للطلبة (للقراءة فقط)
                    document.getElementById('edit-max-students-display').textContent = course.max_students;
                    document.getElementById('edit-max-students').value = 0; // سيتم حسابه تلقائيًا

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
            // الحد الأقصى للطلبة يتم حسابه تلقائيًا من مجموع المجموعات
            const max_students = 0;
            const semester = document.getElementById('edit-course-semester').value;

            // Validate inputs
            if (!course_code || !name || !department_id) {
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

    console.log(`Loading courses for student ID: ${studentId}`);

    // Load student courses
    fetch(`/api/admin/students/${studentId}/courses`)
        .then(response => {
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'فشل في الحصول على بيانات المواد');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Student courses data received:', data);

            // Hide loading
            document.getElementById('student-courses-loading').classList.add('d-none');
            document.getElementById('student-courses-content').classList.remove('d-none');

            if (!data.student) {
                throw new Error('بيانات الطالب غير متوفرة');
            }

            // Set student info
            document.getElementById('student-courses-name').textContent = data.student.name;
            document.getElementById('student-courses-details').textContent =
                `رقم القيد: ${data.student.student_id} | التخصص: ${data.student.department_name || 'غير محدد'} | الفصل الدراسي: ${data.student.semester || 'الأول'} | المجموعة: ${data.student.group_name || '-'} | رقم المنظومة: ${data.student.registration_number}`;

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
                            <th>الفصل الدراسي</th>
                            <th>تاريخ الإنجاز</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');

                data.completedCourses.forEach(course => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${course.course_code || ''}</td>
                        <td>${course.name || ''}</td>
                        <td>${course.department_name || 'غير محدد'}</td>
                        <td>${course.semester || 'غير محدد'}</td>
                        <td>${course.completed_at ? new Date(course.completed_at).toLocaleDateString('ar-LY') : '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-danger delete-completed-course" data-id="${course.id}">
                                <i class="fas fa-trash"></i> <span class="d-none d-md-inline">حذف</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                completedCoursesContainer.appendChild(table);

                // Setup delete completed course buttons
                document.querySelectorAll('.delete-completed-course').forEach(button => {
                    button.addEventListener('click', function() {
                        const completedCourseId = this.getAttribute('data-id');
                        const courseName = this.closest('tr').querySelector('td:nth-child(2)').textContent;
                        if (confirm(`هل أنت متأكد من حذف المادة المنجزة "${courseName}"؟`)) {
                            deleteCompletedCourse(completedCourseId, studentId);
                        }
                    });
                });
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
                            <th>الفصل الدراسي</th>
                            <th>تاريخ التسجيل</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');

                data.enrolledCourses.forEach(course => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${course.course_code || ''}</td>
                        <td>${course.name || ''}</td>
                        <td>${course.department_name || 'غير محدد'}</td>
                        <td>${course.semester || 'غير محدد'}</td>
                        <td>${course.created_at ? new Date(course.created_at).toLocaleDateString('ar-LY') : '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-danger delete-enrollment" data-id="${course.enrollment_id}">
                                <i class="fas fa-trash"></i> <span class="d-none d-md-inline">حذف</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                enrolledCoursesContainer.appendChild(table);

                // Setup delete enrollment buttons
                document.querySelectorAll('.delete-enrollment').forEach(button => {
                    button.addEventListener('click', function() {
                        const enrollmentId = this.getAttribute('data-id');
                        const courseName = this.closest('tr').querySelector('td:nth-child(2)').textContent;
                        if (confirm(`هل أنت متأكد من إلغاء تسجيل المادة "${courseName}"؟`)) {
                            deleteEnrollment(enrollmentId, studentId);
                        }
                    });
                });
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

// Función para cargar materias filtradas por departamento del estudiante (para el modal)
function loadCoursesForStudent(studentId) {
    const courseSelect = document.getElementById('mark-course-select');
    loadCoursesFilteredByStudentDepartment(studentId, courseSelect);
}

// Función para cargar materias filtradas por departamento del estudiante (para el formulario principal)
function loadCoursesForStudentMainForm(studentId) {
    const courseSelect = document.getElementById('course-select');
    loadCoursesFilteredByStudentDepartment(studentId, courseSelect);
}

// Función común para cargar materias filtradas por departamento del estudiante
function loadCoursesFilteredByStudentDepartment(studentId, courseSelect) {
    if (!courseSelect) {
        console.error('Error: No se encontró el elemento select para las materias');
        return;
    }

    // Mostrar mensaje de carga
    courseSelect.innerHTML = '<option value="">جاري تحميل المواد...</option>';
    courseSelect.disabled = true;

    // Primero, obtener la información del estudiante para conocer su departamento
    fetch(`/api/admin/students/${studentId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات الطالب');
            }
            return response.json();
        })
        .then(studentData => {
            const studentDepartmentId = studentData.student.department_id;
            const studentDepartmentName = studentData.student.department_name || 'غير محدد';

            console.log(`Cargando materias para estudiante ID: ${studentId}, Departamento: ${studentDepartmentName} (ID: ${studentDepartmentId})`);

            // Luego, cargar las materias
            return fetch('/api/admin/courses')
                .then(response => response.json())
                .then(data => {
                    courseSelect.innerHTML = '<option value="">اختر المادة</option>';

                    if (data.courses && data.courses.length > 0) {
                        // Filtrar las materias por el departamento del estudiante
                        const filteredCourses = data.courses.filter(course => {
                            // Si el departamento del estudiante es null o undefined, mostrar todas las materias
                            if (!studentDepartmentId) return true;

                            // Convertir ambos IDs a string para comparación
                            return String(course.department_id) === String(studentDepartmentId);
                        });

                        console.log(`Se encontraron ${filteredCourses.length} materias para el departamento del estudiante`);

                        // Si no hay materias en el departamento del estudiante, mostrar un mensaje
                        if (filteredCourses.length === 0) {
                            const option = document.createElement('option');
                            option.value = "";
                            option.textContent = "لا توجد مواد في تخصص الطالب";
                            option.disabled = true;
                            courseSelect.appendChild(option);
                        } else {
                            // Agregar las materias filtradas al select
                            filteredCourses.forEach(course => {
                                const option = document.createElement('option');
                                option.value = course.id;
                                option.textContent = `${course.course_code} - ${course.name}`;
                                courseSelect.appendChild(option);
                            });
                        }
                    }

                    // Habilitar el select
                    courseSelect.disabled = false;
                });
        })
        .catch(error => {
            console.error('Error loading courses for student:', error);
            courseSelect.innerHTML = '<option value="">خطأ في تحميل المواد</option>';
            courseSelect.disabled = false;
        });
}

// Delete completed course for student
function deleteCompletedCourse(completedCourseId, studentId) {
    fetch(`/api/admin/completed-courses/${completedCourseId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء حذف المادة المنجزة');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('تم حذف المادة المنجزة بنجاح');

            // Reload student courses
            openStudentCoursesModal(studentId);
        } else {
            alert(data.error || 'حدث خطأ أثناء حذف المادة المنجزة');
        }
    })
    .catch(error => {
        console.error('Error deleting completed course:', error);
        alert(error.message || 'حدث خطأ أثناء حذف المادة المنجزة');
    });
}

// Delete enrollment for student
function deleteEnrollment(enrollmentId, studentId) {
    fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'حدث خطأ أثناء إلغاء تسجيل المادة');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('تم إلغاء تسجيل المادة بنجاح');

            // Reload student courses
            openStudentCoursesModal(studentId);
        } else {
            alert(data.error || 'حدث خطأ أثناء إلغاء تسجيل المادة');
        }
    })
    .catch(error => {
        console.error('Error deleting enrollment:', error);
        alert(error.message || 'حدث خطأ أثناء إلغاء تسجيل المادة');
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

            console.log(`Marking course as completed - Student ID: ${student_id}, Course ID: ${course_id}`);

            fetch('/api/admin/completed-courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id, course_id })
            })
            .then(response => {
                console.log(`Response status: ${response.status}`);
                if (!response.ok) {
                    return response.json().then(data => {
                        console.error('Error response:', data);
                        throw new Error(data.error || 'حدث خطأ أثناء تحديد المادة كمنجزة');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Success response:', data);
                if (data.success) {
                    // Reset form
                    markCourseCompletedModalForm.reset();

                    // Show success message
                    let message = 'تم تحديد المادة كمنجزة بنجاح';
                    if (data.enrollment_removed) {
                        message += ' وتم إلغاء التسجيل الحالي للمادة';
                    }
                    alert(message);

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
    const studentSelect = document.getElementById('student-select');
    const courseSelect = document.getElementById('course-select');

    // Agregar evento para cargar materias cuando se selecciona un estudiante
    if (studentSelect) {
        studentSelect.addEventListener('change', function() {
            const selectedStudentId = this.value;
            if (selectedStudentId) {
                // Cargar materias del mismo departamento que el estudiante
                loadCoursesForStudentMainForm(selectedStudentId);
            } else {
                // Resetear el select de materias si no hay estudiante seleccionado
                courseSelect.innerHTML = '<option value="">اختر المادة</option>';
            }
        });
    }

    if (markCourseCompletedForm) {
        markCourseCompletedForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const student_id = document.getElementById('student-select').value;
            const course_id = document.getElementById('course-select').value;

            if (!student_id || !course_id) {
                alert('يرجى اختيار الطالب والمادة');
                return;
            }

            // Disable form while submitting
            const submitButton = markCourseCompletedForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري التحديد...';

            console.log(`Marking course as completed from main form - Student ID: ${student_id}, Course ID: ${course_id}`);

            fetch('/api/admin/completed-courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id, course_id })
            })
            .then(response => {
                console.log(`Response status: ${response.status}`);
                if (!response.ok) {
                    return response.json().then(data => {
                        console.error('Error response:', data);
                        throw new Error(data.error || 'حدث خطأ أثناء تحديد المادة كمنجزة');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Success response:', data);
                if (data.success) {
                    // Reset form
                    markCourseCompletedForm.reset();

                    // Show success message
                    let message = 'تم تحديد المادة كمنجزة بنجاح';
                    if (data.enrollment_removed) {
                        message += ' وتم إلغاء التسجيل الحالي للمادة';
                    }
                    alert(message);
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
                            <p><strong>المجموعة:</strong> ${student.group_name || '-'}</p>
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

                        // Add group info if available
                        let groupInfo = '';
                        if (course.group_info) {
                            groupInfo = `
                                <div class="mt-2 mb-3">
                                    <p class="mb-1 small">
                                        <span class="badge bg-info me-1">المجموعة: ${course.group_info.group_name}</span>
                                        ${course.group_info.professor_name ? `<span class="badge bg-secondary me-1">الأستاذ: ${course.group_info.professor_name}</span>` : ''}
                                    </p>
                                    ${course.group_info.time_slot ? `<small class="text-muted d-block">التوقيت: ${course.group_info.time_slot}</small>` : ''}
                                </div>
                            `;
                        }

                        enrollButton = `${groupInfo}<button class="btn btn-danger unenroll-button" data-id="${course.id}">إلغاء التسجيل</button>`;
                        section = 'enrolled';
                    } else if (course.max_students === 0) {
                        // New section for courses without groups
                        statusClass = 'bg-no-groups';
                        statusText = 'لم يتم إنشاء مجموعات';
                        enrollButton = `
                            <div class="alert alert-warning py-1 px-2 mb-2 small">
                                <i class="fas fa-exclamation-triangle me-1"></i> لم يتم إنشاء مجموعات بعد
                            </div>
                            <button class="btn btn-secondary" disabled>غير متاح</button>
                        `;
                        section = 'no-groups';
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
                            case 'no-groups':
                                headerText = 'مواد بانتظار إنشاء المجموعات';
                                headerClass = 'bg-warning';
                                textColorClass = 'text-dark';
                                break;
                            case 'full':
                                headerText = 'المواد المكتملة';
                                headerClass = 'bg-danger';
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
                            <div class="card course-card border-${statusClass.replace('bg-', '')}">
                                <div class="card-header ${statusClass}">
                                    <h5 class="card-title mb-0">${course.course_code}</h5>
                                </div>
                                <div class="card-body">
                                    <h6 class="card-subtitle mb-2">${course.name}</h6>
                                    <p class="card-text">
                                        <span class="badge ${statusClass}">${statusText}</span>
                                        ${course.max_students === 0 ?
                                            `<span class="badge bg-warning"><i class="fas fa-exclamation-triangle me-1"></i> بانتظار إنشاء المجموعات</span>` :
                                            `<span class="badge bg-info">${course.enrolled_students}/${course.max_students} طالب</span>`
                                        }
                                        ${course.is_enrolled && course.payment_status ?
                                            `<span class="badge ${course.payment_status === 'خالص' ? 'bg-success' : 'bg-danger'} mt-1">
                                                <i class="fas ${course.payment_status === 'خالص' ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>
                                                ${course.payment_status}
                                            </span>` : ''
                                        }
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
    // First check if the course has groups
    fetch(`/api/student/course/${courseId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المادة');
            }
            return response.json();
        })
        .then(data => {
            if (data.course.max_students === 0) {
                // Show alert if no groups
                Swal.fire({
                    title: 'لا يمكن التسجيل',
                    html: `
                        <div class="text-center mb-3">
                            <i class="fas fa-exclamation-triangle text-warning fa-3x"></i>
                        </div>
                        <p>لم يتم إنشاء مجموعات لهذه المادة بعد.</p>
                        <p>لا يمكن التسجيل في هذه المادة حالياً. يرجى التواصل مع إدارة الكلية للاستفسار عن موعد إتاحة المجموعات.</p>
                    `,
                    icon: 'warning',
                    confirmButtonText: 'حسناً',
                    confirmButtonColor: '#ffc107'
                });
            } else {
                // Open group selection modal
                openCourseGroupSelectionModal(courseId);
            }
        })
        .catch(error => {
            console.error('Error checking course groups:', error);
            // Fallback to opening the modal directly
            openCourseGroupSelectionModal(courseId);
        });
}

// Open course group selection modal for student enrollment
function openCourseGroupSelectionModal(courseId) {
    // Create modal dynamically if it doesn't exist
    let groupSelectionModal = document.getElementById('groupSelectionModal');

    if (!groupSelectionModal) {
        // Create the modal HTML
        const modalHTML = `
            <div class="modal fade" id="groupSelectionModal" tabindex="-1" aria-labelledby="groupSelectionModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="groupSelectionModalLabel">اختيار المجموعة</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="group-selection-loading" class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">جاري التحميل...</span>
                                </div>
                                <p>جاري تحميل بيانات المجموعات...</p>
                            </div>
                            <div id="group-selection-error" class="alert alert-danger d-none" role="alert">
                                حدث خطأ أثناء تحميل بيانات المجموعات
                            </div>
                            <div id="group-selection-content" class="d-none">
                                <div class="course-info mb-4">
                                    <h5 id="group-selection-course-name" class="mb-2"></h5>
                                    <p id="group-selection-course-details" class="text-muted"></p>
                                </div>
                                <div id="available-groups-container">
                                    <div class="alert alert-info">لا توجد مجموعات متاحة لهذه المادة</div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append the modal to the body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        groupSelectionModal = document.getElementById('groupSelectionModal');
    }

    // Show the modal
    const modal = new bootstrap.Modal(groupSelectionModal);
    modal.show();

    // Show loading
    document.getElementById('group-selection-loading').classList.remove('d-none');
    document.getElementById('group-selection-error').classList.add('d-none');
    document.getElementById('group-selection-content').classList.add('d-none');

    // Load course groups
    fetch(`/api/student/course/${courseId}/groups`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المجموعات');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            document.getElementById('group-selection-loading').classList.add('d-none');
            document.getElementById('group-selection-content').classList.remove('d-none');

            // Set course info
            document.getElementById('group-selection-course-name').textContent = `${data.course.course_code} - ${data.course.name}`;
            document.getElementById('group-selection-course-details').textContent = `التخصص: ${data.course.department_name || 'غير محدد'} | الحد الأقصى للطلبة: ${data.course.max_students}`;

            // Display groups
            const groupsContainer = document.getElementById('available-groups-container');

            if (!data.groups || data.groups.length === 0) {
                groupsContainer.innerHTML = '<div class="alert alert-warning">لا توجد مجموعات متاحة لهذه المادة</div>';
                return;
            }

            // Filter out full groups
            const availableGroups = data.groups.filter(group => !group.is_full);

            if (availableGroups.length === 0) {
                groupsContainer.innerHTML = '<div class="alert alert-warning">جميع المجموعات مكتملة</div>';
                return;
            }

            // Create cards for each group
            let html = '<div class="row">';

            availableGroups.forEach(group => {
                // Calculate enrollment percentage for progress bar
                const enrollmentPercentage = group.enrollment_percentage;
                let percentageClass = 'bg-success';
                if (enrollmentPercentage >= 90) {
                    percentageClass = 'bg-danger';
                } else if (enrollmentPercentage >= 70) {
                    percentageClass = 'bg-warning';
                }

                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-header bg-info text-white">
                                <h5 class="card-title mb-0">المجموعة ${group.group_name}</h5>
                            </div>
                            <div class="card-body">
                                <p><strong>الأستاذ:</strong> ${group.professor_name || 'غير محدد'}</p>
                                <p><strong>التوقيت:</strong> ${group.time_slot || 'غير محدد'}</p>
                                <p><strong>المسجلين:</strong> ${group.enrolled_students}/${group.max_students}</p>
                                <div class="progress mb-3">
                                    <div class="progress-bar ${percentageClass}" role="progressbar" style="width: ${enrollmentPercentage}%"
                                        aria-valuenow="${enrollmentPercentage}" aria-valuemin="0" aria-valuemax="100">
                                        ${enrollmentPercentage}%
                                    </div>
                                </div>
                                <div class="d-grid">
                                    <button class="btn btn-primary select-group-button"
                                        data-course-id="${courseId}"
                                        data-group-id="${group.id}">
                                        اختيار هذه المجموعة
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            groupsContainer.innerHTML = html;

            // Setup select group buttons
            document.querySelectorAll('.select-group-button').forEach(button => {
                button.addEventListener('click', function() {
                    const courseId = this.getAttribute('data-course-id');
                    const groupId = this.getAttribute('data-group-id');
                    enrollWithGroup(courseId, groupId);

                    // Close the modal
                    const modalInstance = bootstrap.Modal.getInstance(groupSelectionModal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error loading course groups:', error);
            document.getElementById('group-selection-loading').classList.add('d-none');
            document.getElementById('group-selection-error').classList.remove('d-none');
            document.getElementById('group-selection-error').textContent = 'حدث خطأ أثناء تحميل بيانات المجموعات: ' + error.message;
        });
}

// Enroll in course with group selection
function enrollWithGroup(courseId, groupId) {
    fetch('/api/student/enroll-with-group', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            course_id: courseId,
            group_id: groupId
        })
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
                                        <div class="card-body py-2">
                                            <div class="row g-0">
                                                <div class="col-md-4">
                                                    <p class="mb-1"><strong>الاسم:</strong> ${student.name}</p>
                                                    <p class="mb-1"><strong>رقم القيد:</strong> ${student.student_id}</p>
                                                </div>
                                                <div class="col-md-4">
                                                    <p class="mb-1"><strong>التخصص:</strong> ${student.department_name || 'غير محدد'}</p>
                                                    <p class="mb-1"><strong>الفصل الدراسي:</strong> ${student.semester || 'الأول'}</p>
                                                </div>
                                                <div class="col-md-4">
                                                    <p class="mb-1"><strong>المجموعة:</strong> ${student.group_name || '-'}</p>
                                                    <p class="mb-1"><strong>رقم المنظومة:</strong> ${student.registration_number}</p>
                                                    <p class="mb-1"><strong>المواد المسجلة:</strong> ${enrolledCourses.length}</p>
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
                                                    <th>الفصل الدراسي</th>
                                                    <th>المجموعة</th>
                                                    <th>التوقيت</th>
                                                    <th>حالة الدفع</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;

                                enrolledCourses.forEach((course, index) => {
                                    // Get course semester (if available)
                                    const courseSemester = course.semester || 'غير محدد';

                                    // Get group info if available
                                    const groupName = course.group_info ? course.group_info.group_name : 'غير محدد';
                                    const timeSlot = course.group_info ? (course.group_info.time_slot || 'غير محدد') : 'غير محدد';

                                    // Get payment status if available
                                    let paymentStatus = course.payment_status || 'غير خالص';
                                    let paymentStatusBadge = `<span class="badge ${paymentStatus === 'خالص' ? 'bg-success' : 'bg-danger'}">
                                        <i class="fas ${paymentStatus === 'خالص' ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>
                                        ${paymentStatus}
                                    </span>`;

                                    reportHtml += `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${course.course_code}</td>
                                            <td>${course.name}</td>
                                            <td>${courseSemester}</td>
                                            <td>${groupName}</td>
                                            <td>${timeSlot}</td>
                                            <td>${paymentStatusBadge}</td>
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
                                <div class="card-body py-2">
                                    <div class="row g-0">
                                        <div class="col-md-4">
                                            <p class="mb-1"><strong>الاسم:</strong> ${student.name}</p>
                                            <p class="mb-1"><strong>رقم القيد:</strong> ${student.student_id}</p>
                                        </div>
                                        <div class="col-md-4">
                                            <p class="mb-1"><strong>التخصص:</strong> ${student.department_name || 'غير محدد'}</p>
                                            <p class="mb-1"><strong>الفصل الدراسي:</strong> ${student.semester || 'الأول'}</p>
                                        </div>
                                        <div class="col-md-4">
                                            <p class="mb-1"><strong>المجموعة:</strong> ${student.group_name || '-'}</p>
                                            <p class="mb-1"><strong>رقم المنظومة:</strong> ${student.registration_number}</p>
                                            <p class="mb-1"><strong>المواد المسجلة:</strong> ${coursesData.enrolledCourses ? coursesData.enrolledCourses.length : 0}</p>
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
                                            <th>الفصل الدراسي</th>
                                            <th>تاريخ التسجيل</th>
                                            <th>حالة الدفع</th>
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

                            // Get payment status if available
                            let paymentStatus = course.payment_status || 'غير خالص';
                            let paymentStatusBadge = `<span class="badge ${paymentStatus === 'خالص' ? 'bg-success' : 'bg-danger'}">
                                <i class="fas ${paymentStatus === 'خالص' ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>
                                ${paymentStatus}
                            </span>`;

                            reportHtml += `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${course.course_code}</td>
                                    <td>${course.name}</td>
                                    <td>${courseSemester}</td>
                                    <td>${formattedDate}</td>
                                    <td>${paymentStatusBadge}</td>
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
function openFilteredReportModal(departmentId, semester, group) {
    console.log(`فتح نافذة التقرير مع القيم: التخصص=${departmentId}, الفصل=${semester}, المجموعة=${group}`);

    // تحديث المتغير العالمي لحفظ قيم التصفية
    if (!window.currentFilters) {
        window.currentFilters = { department: '', semester: '', group: '', search: '' };
    }

    // تحديث قيم التصفية في المتغير العالمي
    if (departmentId) window.currentFilters.department = String(departmentId);
    if (semester) window.currentFilters.semester = semester;
    if (group) window.currentFilters.group = group;

    console.log(`تم تحديث window.currentFilters: ${JSON.stringify(window.currentFilters)}`);

    // تأكد من أن قيمة التخصص المحددة محفوظة في القائمة المنسدلة الرئيسية
    const filterDepartmentSelect = document.getElementById('filter-student-department-select');
    if (filterDepartmentSelect) {
        if (departmentId) {
            filterDepartmentSelect.value = String(departmentId);
            console.log(`تم تعيين قيمة التخصص المحدد في القائمة المنسدلة للتقرير: ${departmentId}`);
        } else if (window.currentFilters.department) {
            filterDepartmentSelect.value = window.currentFilters.department;
            console.log(`تم استخدام قيمة التخصص من window.currentFilters: ${window.currentFilters.department}`);
        }
    }

    // تأكد من أن قيمة الفصل الدراسي المحددة محفوظة في القائمة المنسدلة الرئيسية
    const filterSemesterSelect = document.getElementById('filter-student-semester-select');
    if (filterSemesterSelect) {
        if (semester) {
            filterSemesterSelect.value = semester;
            console.log(`تم تعيين قيمة الفصل الدراسي المحدد في القائمة المنسدلة للتقرير: ${semester}`);
        } else if (window.currentFilters.semester) {
            filterSemesterSelect.value = window.currentFilters.semester;
            console.log(`تم استخدام قيمة الفصل الدراسي من window.currentFilters: ${window.currentFilters.semester}`);
        }
    }

    // تأكد من أن قيمة المجموعة المحددة محفوظة في القائمة المنسدلة الرئيسية
    const filterGroupSelect = document.getElementById('filter-student-group-select');
    if (filterGroupSelect) {
        if (group) {
            filterGroupSelect.value = group;
            console.log(`تم تعيين قيمة المجموعة المحددة في القائمة المنسدلة للتقرير: ${group}`);
        } else if (window.currentFilters.group) {
            filterGroupSelect.value = window.currentFilters.group;
            console.log(`تم استخدام قيمة المجموعة من window.currentFilters: ${window.currentFilters.group}`);
        }
    }

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
    const groupSelect = document.getElementById('filter-student-group-select');
    let departmentName = 'جميع التخصصات';
    let semesterName = 'جميع الفصول الدراسية';
    let groupName = 'جميع المجموعات';

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

    if (group && groupSelect) {
        const selectedOption = groupSelect.querySelector(`option[value="${group}"]`);
        if (selectedOption) {
            groupName = selectedOption.textContent;
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
                // تحويل معرفات التخصصات إلى نصوص للمقارنة
                filteredStudents = filteredStudents.filter(student => {
                    const studentDeptId = String(student.department_id);
                    const filterDeptId = String(departmentId);
                    return studentDeptId === filterDeptId;
                });
            }

            if (semester) {
                filteredStudents = filteredStudents.filter(student => student.semester === semester);
            }

            if (group) {
                filteredStudents = filteredStudents.filter(student => student.group_name === group);
            }

            // Hide loading, show content
            document.getElementById('filtered-report-loading').classList.add('d-none');
            document.getElementById('filtered-students-report').classList.remove('d-none');

            // Generate report title based on filters
            let reportTitle = 'تقرير الطلبة';

            // تحديد عنوان التقرير بناءً على التصفيات المطبقة
            if (departmentId && semester && group) {
                reportTitle = `تقرير طلبة تخصص ${departmentName} في ${semesterName} - مجموعة ${groupName}`;
            } else if (departmentId && semester) {
                reportTitle = `تقرير طلبة تخصص ${departmentName} في ${semesterName}`;
            } else if (departmentId && group) {
                reportTitle = `تقرير طلبة تخصص ${departmentName} - مجموعة ${groupName}`;
            } else if (semester && group) {
                reportTitle = `تقرير طلبة ${semesterName} - مجموعة ${groupName}`;
            } else if (departmentId) {
                reportTitle = `تقرير طلبة تخصص ${departmentName}`;
            } else if (semester) {
                reportTitle = `تقرير طلبة ${semesterName}`;
            } else if (group) {
                reportTitle = `تقرير طلبة مجموعة ${groupName}`;
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
                                    <p><strong>المجموعة:</strong> ${groupName}</p>
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
                                            <th>المجموعة</th>
                                            <th>رقم المنظومة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            if (filteredStudents.length === 0) {
                reportHtml += `
                    <tr>
                        <td colspan="7" class="text-center">لا يوجد طلبة مطابقين للتصنيف المحدد</td>
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
                                <td colspan="7" class="fw-bold">الفصل الدراسي ${sem}</td>
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
                                    <td>${student.group_name || '-'}</td>
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
                                <td colspan="7" class="fw-bold">تخصص ${dept}</td>
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
                                    <td>${student.group_name || '-'}</td>
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
                                <td colspan="7" class="fw-bold">تخصص ${dept}</td>
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
                                    <td>${student.group_name || '-'}</td>
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
                                <td>${student.group_name || '-'}</td>
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
                                        font-size: 11pt;
                                        margin: 0;
                                    }
                                    .container {
                                        max-width: 100%;
                                        width: 100%;
                                        padding: 0;
                                        margin: 0;
                                    }
                                    .card {
                                        border: none;
                                        box-shadow: none;
                                        margin-bottom: 10px;
                                    }
                                    .card-header {
                                        background-color: #f8f9fa !important;
                                        color: #000 !important;
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                        padding: 8px !important;
                                        border-bottom: 1px solid #dee2e6 !important;
                                    }
                                    .card-body {
                                        padding: 8px !important;
                                    }
                                    .card-footer {
                                        padding: 5px !important;
                                    }
                                    th, td {
                                        padding: 4px !important;
                                        font-size: 10pt !important;
                                    }
                                    th {
                                        background-color: #f2f2f2 !important;
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                    }
                                    .table-primary th, .table-secondary td {
                                        background-color: #f8f9fa !important;
                                        color: #000 !important;
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                    }
                                    .table-striped tbody tr:nth-of-type(odd) {
                                        background-color: rgba(0, 0, 0, 0.03) !important;
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                    }
                                    p {
                                        margin-bottom: 0.3rem !important;
                                    }
                                    .report-header {
                                        margin-bottom: 10px !important;
                                        padding-bottom: 10px !important;
                                    }
                                    .report-header h1 {
                                        font-size: 18pt !important;
                                        margin-bottom: 2px !important;
                                    }
                                    .report-header p {
                                        font-size: 12pt !important;
                                    }
                                    .badge {
                                        border: 1px solid #ddd !important;
                                        padding: 2px 5px !important;
                                        font-size: 9pt !important;
                                        color: #000 !important;
                                        background-color: transparent !important;
                                    }
                                    .university-logo {
                                        max-width: 60px !important;
                                        margin-bottom: 5px !important;
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
                            body {
                                padding: 0;
                                font-size: 11pt;
                                margin: 0;
                            }
                            .container {
                                max-width: 100%;
                                width: 100%;
                                padding: 0;
                                margin: 0;
                            }
                            .card {
                                border: none;
                                box-shadow: none;
                                margin-bottom: 10px;
                            }
                            .card-header {
                                background-color: #f8f9fa !important;
                                color: #000 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                                padding: 8px !important;
                            }
                            .card-body {
                                padding: 8px !important;
                            }
                            .card-footer {
                                padding: 5px !important;
                            }
                            th, td {
                                padding: 4px !important;
                                font-size: 10pt !important;
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
                            p {
                                margin-bottom: 0.3rem !important;
                            }
                            .badge {
                                border: 1px solid #ddd !important;
                                padding: 2px 5px !important;
                                font-size: 9pt !important;
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
                                font-size: 11pt;
                                margin: 0;
                            }
                            .container {
                                max-width: 100%;
                                width: 100%;
                                padding: 0;
                                margin: 0;
                            }
                            .card {
                                border: none;
                                box-shadow: none;
                                margin-bottom: 10px;
                            }
                            .card-header {
                                background-color: #f8f9fa !important;
                                color: #000 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                                padding: 8px !important;
                            }
                            .card-body {
                                padding: 8px !important;
                            }
                            .card-footer {
                                padding: 5px !important;
                            }
                            th, td {
                                padding: 4px !important;
                                font-size: 10pt !important;
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
                            p {
                                margin-bottom: 0.3rem !important;
                            }
                            .report-header {
                                margin-bottom: 10px !important;
                                padding-bottom: 10px !important;
                            }
                            .report-header h2 {
                                font-size: 18pt !important;
                                margin-bottom: 2px !important;
                            }
                            .report-header p {
                                font-size: 12pt !important;
                            }
                            .badge {
                                border: 1px solid #ddd !important;
                                padding: 2px 5px !important;
                                font-size: 9pt !important;
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
// Open course groups modal
function openCourseGroupsModal(courseId) {
    // Show loading
    document.getElementById('groups-loading').classList.remove('d-none');
    document.getElementById('groups-error').classList.add('d-none');
    document.getElementById('groups-content').classList.add('d-none');

    // Reset containers
    document.getElementById('current-groups-container').innerHTML = '<div class="alert alert-info">لا توجد مجموعات لهذه المادة</div>';

    // Set course ID for the add group form
    document.getElementById('group-course-id').value = courseId;

    // Show modal
    const groupsModal = new bootstrap.Modal(document.getElementById('courseGroupsModal'));
    groupsModal.show();

    // Load course groups
    fetch(`/api/admin/course/${courseId}/groups`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المجموعات');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            document.getElementById('groups-loading').classList.add('d-none');
            document.getElementById('groups-content').classList.remove('d-none');

            // Set course info
            document.getElementById('groups-course-name').textContent = `${data.course.course_code} - ${data.course.name}`;
            document.getElementById('groups-course-details').textContent = `التخصص: ${data.course.department_name || 'غير محدد'} | الحد الأقصى للطلبة: ${data.course.max_students}`;

            // Display groups
            if (data.groups && data.groups.length > 0) {
                const groupsContainer = document.getElementById('current-groups-container');
                groupsContainer.innerHTML = '';

                // Create a table for groups
                const table = document.createElement('table');
                table.className = 'table table-striped table-hover';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>المجموعة</th>
                            <th>الحد الأقصى</th>
                            <th>المسجلين</th>
                            <th>الأستاذ</th>
                            <th>التوقيت</th>
                            <th class="text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="groups-table-body"></tbody>
                `;
                groupsContainer.appendChild(table);

                const groupsTableBody = document.getElementById('groups-table-body');
                data.groups.forEach(group => {
                    // Calculate enrollment percentage for progress bar
                    const enrollmentPercentage = group.enrollment_percentage;
                    let percentageClass = 'bg-success';
                    if (enrollmentPercentage >= 90) {
                        percentageClass = 'bg-danger';
                    } else if (enrollmentPercentage >= 70) {
                        percentageClass = 'bg-warning';
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${group.group_name}</td>
                        <td>${group.max_students}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="me-2">${group.enrolled_students}</div>
                                <div class="progress flex-grow-1" style="height: 8px;">
                                    <div class="progress-bar ${percentageClass}" role="progressbar" style="width: ${enrollmentPercentage}%"></div>
                                </div>
                                <div class="ms-2">${enrollmentPercentage}%</div>
                            </div>
                        </td>
                        <td>${group.professor_name || '-'}</td>
                        <td>${group.time_slot || '-'}</td>
                        <td class="text-center">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-info view-group-students" data-id="${group.id}">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="btn btn-sm btn-primary edit-group" data-id="${group.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-group" data-id="${group.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    groupsTableBody.appendChild(row);
                });

                // Setup view group students buttons
                document.querySelectorAll('.view-group-students').forEach(button => {
                    button.addEventListener('click', function() {
                        const groupId = this.getAttribute('data-id');
                        openGroupStudentsModal(groupId);
                    });
                });

                // Setup edit group buttons
                document.querySelectorAll('.edit-group').forEach(button => {
                    button.addEventListener('click', function() {
                        const groupId = this.getAttribute('data-id');
                        openEditGroupModal(groupId);
                    });
                });

                // Setup delete group buttons
                document.querySelectorAll('.delete-group').forEach(button => {
                    button.addEventListener('click', function() {
                        const groupId = this.getAttribute('data-id');
                        const groupName = this.closest('tr').querySelector('td:nth-child(1)').textContent;
                        if (confirm(`هل أنت متأكد من حذف المجموعة "${groupName}"؟`)) {
                            deleteGroup(groupId);
                        }
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error loading course groups:', error);
            document.getElementById('groups-loading').classList.add('d-none');
            document.getElementById('groups-error').classList.remove('d-none');
            document.getElementById('groups-error').textContent = 'حدث خطأ أثناء تحميل بيانات المجموعات: ' + error.message;
        });
}

// Open edit group modal
function openEditGroupModal(groupId) {
    // Hide any previous messages
    document.getElementById('edit-group-form-error').classList.add('d-none');
    document.getElementById('edit-group-form-success').classList.add('d-none');

    // Get group data
    fetch(`/api/admin/course/groups/${groupId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المجموعة');
            }
            return response.json();
        })
        .then(data => {
            const group = data.group;

            // Set form values
            document.getElementById('edit-group-id').value = group.id;
            document.getElementById('edit-group-name').value = group.group_name;
            document.getElementById('edit-group-max-students').value = group.max_students;
            document.getElementById('edit-group-professor').value = group.professor_name || '';
            document.getElementById('edit-group-time').value = group.time_slot || '';

            // Show modal
            const editGroupModal = new bootstrap.Modal(document.getElementById('editGroupModal'));
            editGroupModal.show();
        })
        .catch(error => {
            console.error('Error loading group data:', error);
            alert('حدث خطأ أثناء تحميل بيانات المجموعة: ' + error.message);
        });
}

// Open group students modal
function openGroupStudentsModal(groupId) {
    // Show loading
    document.getElementById('group-students-loading').classList.remove('d-none');
    document.getElementById('group-students-error').classList.add('d-none');
    document.getElementById('group-students-content').classList.add('d-none');

    // Show modal
    const groupStudentsModal = new bootstrap.Modal(document.getElementById('groupStudentsModal'));
    groupStudentsModal.show();

    // Load group students
    fetch(`/api/admin/course/groups/${groupId}/students`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات الطلبة');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            document.getElementById('group-students-loading').classList.add('d-none');
            document.getElementById('group-students-content').classList.remove('d-none');

            // Set group info
            document.getElementById('group-students-name').textContent = `المجموعة: ${data.group.group_name}`;
            document.getElementById('group-students-details').textContent = `المادة: ${data.group.course_code} - ${data.group.course_name} | الأستاذ: ${data.group.professor_name || 'غير محدد'} | التوقيت: ${data.group.time_slot || 'غير محدد'}`;

            // Display students
            const studentsTableBody = document.getElementById('group-students-table-body');
            const noStudentsMessage = document.getElementById('no-group-students-message');

            if (data.students && data.students.length > 0) {
                studentsTableBody.innerHTML = '';
                noStudentsMessage.classList.add('d-none');

                data.students.forEach((student, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${student.student_id}</td>
                        <td>${student.name}</td>
                        <td>${student.department_name || 'غير محدد'}</td>
                        <td>${student.semester || 'الأول'}</td>
                        <td>${new Date(student.enrollment_date).toLocaleDateString('ar-SA')}</td>
                    `;
                    studentsTableBody.appendChild(row);
                });
            } else {
                studentsTableBody.innerHTML = '';
                noStudentsMessage.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Error loading group students:', error);
            document.getElementById('group-students-loading').classList.add('d-none');
            document.getElementById('group-students-error').classList.remove('d-none');
            document.getElementById('group-students-error').textContent = 'حدث خطأ أثناء تحميل بيانات الطلبة: ' + error.message;
        });
}

// Delete a group
function deleteGroup(groupId) {
    fetch(`/api/admin/course/groups/${groupId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.status === 409) {
                // Conflict - group has students
                return response.json().then(data => {
                    if (data.warning) {
                        if (confirm(`${data.message} هناك ${data.details.enrollments} طالب مسجل في هذه المجموعة.`)) {
                            // User confirmed force delete
                            return fetch(`/api/admin/course/groups/${groupId}?force=true`, {
                                method: 'DELETE'
                            })
                            .then(response => {
                                if (!response.ok) {
                                    return response.json().then(data => {
                                        throw new Error(data.error || 'حدث خطأ في الخادم');
                                    });
                                }
                                return response.json();
                            });
                        } else {
                            // User cancelled
                            return { cancelled: true };
                        }
                    }
                    return data;
                });
            } else if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'حدث خطأ في الخادم');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.cancelled) {
                return;
            }

            if (data.success) {
                // Refresh the groups list
                const courseId = document.getElementById('group-course-id').value;
                openCourseGroupsModal(courseId);

                // Actualizar la tabla de materias para mostrar el nuevo valor de max_students
                if (data.course_max_students !== null) {
                    // Recargar la tabla de materias
                    loadCourses();
                }
            } else {
                alert('حدث خطأ أثناء حذف المجموعة: ' + (data.error || 'خطأ غير معروف'));
            }
        })
        .catch(error => {
            console.error('Error deleting group:', error);
            alert('حدث خطأ أثناء حذف المجموعة: ' + error.message);
        });
}

// Setup add group form
function setupAddGroupForm() {
    const addGroupForm = document.getElementById('add-group-form');
    if (addGroupForm) {
        addGroupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const courseId = document.getElementById('group-course-id').value;
            const groupName = document.getElementById('group-name').value;
            const maxStudents = document.getElementById('group-max-students').value;
            const professorName = document.getElementById('group-professor').value;
            const timeSlot = document.getElementById('group-time').value;

            // Validate input
            if (!groupName || !maxStudents) {
                alert('يرجى إدخال اسم المجموعة وعدد الطلاب المسموح به');
                return;
            }

            // Disable form while submitting
            const submitButton = addGroupForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري الإضافة...';

            fetch(`/api/admin/course/${courseId}/groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    group_name: groupName,
                    max_students: maxStudents,
                    professor_name: professorName,
                    time_slot: timeSlot
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'حدث خطأ في الخادم');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    // Re-enable form
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;

                    if (data.success) {
                        // Clear form
                        document.getElementById('group-name').value = '';
                        document.getElementById('group-max-students').value = '30';
                        document.getElementById('group-professor').value = '';
                        document.getElementById('group-time').value = '';

                        // Refresh the groups list
                        openCourseGroupsModal(courseId);

                        // Actualizar la tabla de materias para mostrar el nuevo valor de max_students
                        if (data.course_max_students !== null) {
                            // Recargar la tabla de materias
                            loadCourses();
                        }
                    } else {
                        alert('حدث خطأ أثناء إضافة المجموعة: ' + (data.error || 'خطأ غير معروف'));
                    }
                })
                .catch(error => {
                    console.error('Error adding group:', error);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    alert('حدث خطأ أثناء إضافة المجموعة: ' + error.message);
                });
        });
    }
}

// Setup edit group form
function setupEditGroupForm() {
    const saveGroupChangesButton = document.getElementById('save-group-changes');
    if (saveGroupChangesButton) {
        saveGroupChangesButton.addEventListener('click', function() {
            // Hide any previous messages
            document.getElementById('edit-group-form-error').classList.add('d-none');
            document.getElementById('edit-group-form-success').classList.add('d-none');

            // Get form values
            const groupId = document.getElementById('edit-group-id').value;
            const groupName = document.getElementById('edit-group-name').value;
            const maxStudents = document.getElementById('edit-group-max-students').value;
            const professorName = document.getElementById('edit-group-professor').value;
            const timeSlot = document.getElementById('edit-group-time').value;

            // Validate input
            if (!groupName || !maxStudents) {
                document.getElementById('edit-group-form-error').textContent = 'يرجى إدخال اسم المجموعة وعدد الطلاب المسموح به';
                document.getElementById('edit-group-form-error').classList.remove('d-none');
                return;
            }

            // Disable button while submitting
            saveGroupChangesButton.disabled = true;
            saveGroupChangesButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري الحفظ...';

            fetch(`/api/admin/course/groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    group_name: groupName,
                    max_students: maxStudents,
                    professor_name: professorName,
                    time_slot: timeSlot
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'حدث خطأ في الخادم');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    // Re-enable button
                    saveGroupChangesButton.disabled = false;
                    saveGroupChangesButton.textContent = 'حفظ التغييرات';

                    if (data.success) {
                        // Show success message
                        document.getElementById('edit-group-form-success').classList.remove('d-none');

                        // Refresh the groups list after a short delay
                        setTimeout(() => {
                            // Close the modal
                            const editGroupModal = bootstrap.Modal.getInstance(document.getElementById('editGroupModal'));
                            if (editGroupModal) {
                                editGroupModal.hide();
                            }

                            // Refresh the groups list
                            const courseId = document.getElementById('group-course-id').value;
                            openCourseGroupsModal(courseId);

                            // Actualizar la tabla de materias para mostrar el nuevo valor de max_students
                            if (data.course_max_students !== null) {
                                // Recargar la tabla de materias
                                loadCourses();
                            }
                        }, 1000);
                    } else {
                        // Show error message
                        document.getElementById('edit-group-form-error').textContent = data.error || 'حدث خطأ أثناء تحديث المجموعة';
                        document.getElementById('edit-group-form-error').classList.remove('d-none');
                    }
                })
                .catch(error => {
                    console.error('Error updating group:', error);
                    saveGroupChangesButton.disabled = false;
                    saveGroupChangesButton.textContent = 'حفظ التغييرات';
                    document.getElementById('edit-group-form-error').textContent = 'حدث خطأ أثناء تحديث المجموعة: ' + error.message;
                    document.getElementById('edit-group-form-error').classList.remove('d-none');
                });
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');

    // Check authentication
    console.log('Checking authentication...');
    checkAuth();

    // Setup login form
    console.log('Setting up login form from DOMContentLoaded...');
    setupLoginForm();

    // Setup logout
    console.log('Setting up logout...');
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

    // Get groups elements
    const groupsLoading = document.getElementById('course-groups-loading');
    const groupsError = document.getElementById('course-groups-error');
    const groupsContent = document.getElementById('course-groups-content');
    const groupsTableBody = document.getElementById('course-groups-table-body');
    const noGroupsMessage = document.getElementById('no-groups-message');

    // Show modal
    modal.show();

    // Show loading, hide error and content
    modalLoading.classList.remove('d-none');
    modalError.classList.add('d-none');
    modalContent.classList.add('d-none');

    // Show groups loading, hide groups error and content
    if (groupsLoading) groupsLoading.classList.remove('d-none');
    if (groupsError) groupsError.classList.add('d-none');
    if (groupsContent) groupsContent.classList.add('d-none');

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

                // Make sure index is displayed with modern Arabic numerals
                const displayIndex = (index + 1).toString();

                // Ensure semester has a value
                const semester = student.semester || 'الأول';

                // Get student's group
                const studentGroup = student.group_name || 'غير محدد';

                row.innerHTML = `
                    <td>${displayIndex}</td>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.registration_number}</td>
                    <td>${student.department_name || 'غير محدد'}</td>
                    <td><strong>${studentGroup}</strong></td>
                    <td>${semester}</td>
                    <td>${formattedDate}</td>
                `;

                modalTableBody.appendChild(row);
            });

            // Setup export button
            setupExportStudentsCSV(data.course, data.students);

            // Load course groups data
            loadCourseGroups(courseId);
        })
        .catch(error => {
            console.error('Error loading course students:', error);
            modalLoading.classList.add('d-none');
            modalError.classList.remove('d-none');
            modalError.textContent = error.message || 'حدث خطأ أثناء تحميل بيانات الطلبة';
        });
}

// Load course groups data
function loadCourseGroups(courseId) {
    // Get groups elements
    const groupsLoading = document.getElementById('course-groups-loading');
    const groupsError = document.getElementById('course-groups-error');
    const groupsContent = document.getElementById('course-groups-content');
    const groupsTableBody = document.getElementById('course-groups-table-body');
    const noGroupsMessage = document.getElementById('no-groups-message');

    if (!groupsLoading || !groupsError || !groupsContent || !groupsTableBody || !noGroupsMessage) {
        console.error('Missing groups elements');
        return;
    }

    // Fetch course groups data
    fetch(`/api/admin/course/${courseId}/groups`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المجموعات');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading, show content
            groupsLoading.classList.add('d-none');
            groupsContent.classList.remove('d-none');

            // Clear table
            groupsTableBody.innerHTML = '';

            // Check if there are groups
            if (data.groups.length === 0) {
                noGroupsMessage.classList.remove('d-none');
            } else {
                // Hide no groups message
                noGroupsMessage.classList.add('d-none');
            }

            // Fill table with groups
            data.groups.forEach(group => {
                const row = document.createElement('tr');

                // Determine color class based on enrollment percentage
                let percentageClass = '';
                if (group.enrollment_percentage >= 90) {
                    percentageClass = 'bg-danger text-white';
                } else if (group.enrollment_percentage >= 70) {
                    percentageClass = 'bg-warning';
                } else if (group.enrollment_percentage >= 50) {
                    percentageClass = 'bg-info text-white';
                } else {
                    percentageClass = 'bg-success text-white';
                }

                row.innerHTML = `
                    <td><strong>${group.group_name}</strong></td>
                    <td>${group.professor_name || 'غير محدد'}</td>
                    <td>${group.time_slot || 'غير محدد'}</td>
                    <td>${group.enrolled_students}</td>
                    <td>${group.max_students}</td>
                    <td class="text-center"><span class="badge ${percentageClass} px-2 py-1">${group.enrollment_percentage.toFixed(2)}<span class="percent-sign">%</span></span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-info view-group-students" data-id="${group.id}" data-course-id="${courseId}">
                            <i class="fas fa-users"></i> <span class="d-none d-md-inline">عرض الطلبة</span>
                        </button>
                    </td>
                `;

                groupsTableBody.appendChild(row);
            });

            // Setup view group students buttons
            setupViewGroupStudentsButtons();
        })
        .catch(error => {
            console.error('Error loading course groups:', error);
            groupsLoading.classList.add('d-none');
            groupsError.classList.remove('d-none');
            groupsError.textContent = error.message || 'حدث خطأ أثناء تحميل بيانات المجموعات';
        });
}



// Setup view group students buttons
function setupViewGroupStudentsButtons() {
    document.querySelectorAll('.view-group-students').forEach(button => {
        button.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            const courseId = this.getAttribute('data-course-id');
            openGroupStudentsModal(groupId, courseId);
        });
    });
}

// Open group students modal
function openGroupStudentsModal(groupId, courseId) {
    // Get modal elements
    const modal = new bootstrap.Modal(document.getElementById('groupStudentsModal'));
    const modalLoading = document.getElementById('group-students-loading');
    const modalError = document.getElementById('group-students-error');
    const modalContent = document.getElementById('group-students-content');
    const modalTableBody = document.getElementById('group-students-table-body');
    const noStudentsMessage = document.getElementById('no-group-students-message');

    // Show modal
    modal.show();

    // Show loading, hide error and content
    modalLoading.classList.remove('d-none');
    modalError.classList.add('d-none');
    modalContent.classList.add('d-none');

    // Fetch group details
    fetch(`/api/admin/course/groups/${groupId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المجموعة');
            }
            return response.json();
        })
        .then(groupData => {
            const group = groupData.group;

            // Update group info
            document.getElementById('group-modal-course-name').textContent = group.course_name || 'غير محدد';
            document.getElementById('group-modal-course-code').textContent = group.course_code || 'غير محدد';
            document.getElementById('group-modal-group-name').textContent = group.group_name || 'غير محدد';
            document.getElementById('group-modal-professor-name').textContent = group.professor_name || 'غير محدد';
            document.getElementById('group-modal-time-slot').textContent = group.time_slot || 'غير محدد';

            // Make sure enrolled_students and max_students are numbers
            const enrolledStudents = typeof group.enrolled_students === 'number' ? group.enrolled_students : 0;
            const maxStudents = typeof group.max_students === 'number' ? group.max_students : 0;

            document.getElementById('group-modal-enrolled-students').textContent = enrolledStudents;
            document.getElementById('group-modal-max-students').textContent = maxStudents;

            // Calculate enrollment percentage if not already calculated
            if (typeof group.enrollment_percentage !== 'number') {
                group.enrollment_percentage = maxStudents > 0 ? (enrolledStudents / maxStudents) * 100 : 0;
            }

            // Determine color class based on enrollment percentage
            let percentageClass = '';
            if (group.enrollment_percentage >= 90) {
                percentageClass = 'bg-danger text-white';
            } else if (group.enrollment_percentage >= 70) {
                percentageClass = 'bg-warning';
            } else if (group.enrollment_percentage >= 50) {
                percentageClass = 'bg-info text-white';
            } else {
                percentageClass = 'bg-success text-white';
            }

            document.getElementById('group-modal-enrollment-percentage').innerHTML =
                `<span class="badge ${percentageClass} px-2 py-1">${typeof group.enrollment_percentage === 'number' ? group.enrollment_percentage.toFixed(2) : '0.00'}<span class="percent-sign">%</span></span>`;

            // Fetch students in this group
            return fetch(`/api/admin/course/groups/${groupId}/students`);
        })
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

                // Make sure index is displayed with modern Arabic numerals
                const displayIndex = (index + 1).toString();

                // Ensure semester has a value
                const semester = student.semester || 'الأول';

                row.innerHTML = `
                    <td>${displayIndex}</td>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.registration_number}</td>
                    <td>${student.department_name || 'غير محدد'}</td>
                    <td>${semester}</td>
                    <td>${formattedDate}</td>
                `;

                modalTableBody.appendChild(row);
            });

            // Store group and students data in global variables for later use
            window.currentGroupData = data.group;
            window.currentGroupStudents = data.students;

            // Setup export buttons
            setupExportGroupStudentsButtons(data.group, data.students);
        })
        .catch(error => {
            console.error('Error loading group students:', error);
            modalLoading.classList.add('d-none');
            modalError.classList.remove('d-none');
            modalError.textContent = error.message || 'حدث خطأ أثناء تحميل بيانات الطلبة';
        });
}

// Setup export group students buttons
function setupExportGroupStudentsButtons(group, students) {
    const exportExcelButton = document.getElementById('export-group-students-excel');
    const viewPdfButton = document.getElementById('view-group-students-pdf');

    // Make sure group has all required properties
    if (group) {
        // Calculate enrolled_students from the students array
        group.enrolled_students = Array.isArray(students) ? students.length : 0;

        if (typeof group.max_students !== 'number') {
            group.max_students = 0;
        }

        // Calculate enrollment percentage
        group.enrollment_percentage = group.max_students > 0 ? (group.enrolled_students / group.max_students) * 100 : 0;

        console.log('setupExportGroupStudentsButtons - group after updates:', group);
        console.log('setupExportGroupStudentsButtons - students count:', students.length);
    }

    // Setup PDF view button
    if (viewPdfButton) {
        viewPdfButton.onclick = function() {
            // Always use the current students data from the table
            const studentsTableBody = document.getElementById('group-students-table-body');
            let currentStudents = [];

            if (studentsTableBody) {
                const rows = studentsTableBody.querySelectorAll('tr');

                rows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 6) {
                        const student = {
                            id: index,
                            student_id: cells[1].textContent.trim(),
                            name: cells[2].textContent.trim(),
                            registration_number: cells[3].textContent.trim(),
                            department_name: cells[4].textContent.trim(),
                            semester: cells[5].textContent.trim(),
                            enrollment_date: new Date().toISOString()
                        };
                        currentStudents.push(student);
                    }
                });
            }

            // If no students found in the table, use the passed students
            if (currentStudents.length === 0) {
                currentStudents = window.currentGroupStudents || students || [];
            }

            // Use the stored group data if available, otherwise use the passed group
            let groupToUse = window.currentGroupData || group || {};

            // Make sure the group has the correct enrolled_students count
            groupToUse = {
                ...groupToUse,
                enrolled_students: currentStudents.length
            };

            // Log the data for debugging
            console.log('Group data for PDF:', groupToUse);
            console.log('Students data for PDF:', currentStudents);
            console.log('Students count:', currentStudents.length);

            viewGroupStudentsAsPdf(groupToUse, currentStudents);
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
                    excelData.push(['', 'لا يوجد طلبة مسجلين في هذه المجموعة', '', '', '', '', '']);
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

                        // Make sure index is displayed with modern Arabic numerals
                        const displayIndex = (index + 1).toString();

                        excelData.push([
                            displayIndex,
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
                const groupName = group.group_name || 'مجموعة';
                const courseCode = group.course_code || 'مادة';
                const fileName = `طلبة_مجموعة_${groupName}_${courseCode}_${new Date().toISOString().slice(0,10)}.xlsx`;
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

// View group students as PDF
function viewGroupStudentsAsPdf(group, students) {
    try {
        console.log('viewGroupStudentsAsPdf called with group:', group);
        console.log('viewGroupStudentsAsPdf called with students:', students);

        // Make sure group has all required properties
        if (!group) {
            group = {};
        }

        // Make sure students is an array
        if (!Array.isArray(students)) {
            students = [];
        }

        // Calculate enrolled_students from the students array
        const enrolledStudents = students.length;
        const maxStudents = typeof group.max_students === 'number' ? group.max_students : 0;

        console.log('enrolledStudents (calculated from students array):', enrolledStudents);
        console.log('maxStudents:', maxStudents);
        console.log('students array:', students);

        // Always recalculate enrollment percentage based on current students count
        group.enrollment_percentage = maxStudents > 0 ? (enrolledStudents / maxStudents) * 100 : 0;

        // Update enrolled_students in the group object
        group.enrolled_students = enrolledStudents;

        console.log('enrollment_percentage:', group.enrollment_percentage);
        console.log('Updated group object:', group);

        // Make sure group has other required properties
        if (!group.course_name) group.course_name = 'غير محدد';
        if (!group.course_code) group.course_code = 'غير محدد';
        if (!group.group_name) group.group_name = 'غير محدد';
        if (!group.professor_name) group.professor_name = 'غير محدد';
        if (!group.time_slot) group.time_slot = 'غير محدد';

        // Create HTML content for the report
        const htmlContent = `
        <div class="pdf-container" dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; color: #333;">قائمة الطلبة المسجلين في مجموعة ${group.group_name || 'غير محدد'} - ${group.course_name || 'غير محدد'}</h1>
            </div>

            <div style="margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="width: 48%;">
                        <p><strong>رمز المادة:</strong> ${group.course_code || 'غير محدد'}</p>
                        <p><strong>اسم المجموعة:</strong> ${group.group_name || 'غير محدد'}</p>
                        <p><strong>أستاذ المادة:</strong> ${group.professor_name || 'غير محدد'}</p>
                    </div>
                    <div style="width: 48%;">
                        <p><strong>الموعد:</strong> ${group.time_slot || 'غير محدد'}</p>
                        <p><strong>عدد الطلبة المسجلين:</strong> ${enrolledStudents} / ${maxStudents}</p>
                        <p><strong>نسبة التسجيل:</strong> ${group.enrollment_percentage.toFixed(2)} %</p>
                    </div>
                </div>
                <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-EG').replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(d.charCodeAt(0) - 1632))}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; text-align: right;">
                    <thead>
                        <tr style="background-color: #343a40; color: white;">
                            <th style="padding: 10px; border: 1px solid #dee2e6;">رقم</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">رقم القيد</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">اسم الطالب</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">رقم المنظومة</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">التخصص</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">الفصل الدراسي</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.length === 0 ?
                            `<tr><td colspan="7" style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">لا يوجد طلبة مسجلين في هذه المجموعة</td></tr>` :
                            students.map((student, index) => {
                                const enrollmentDate = new Date(student.enrollment_date);
                                // Get date in Arabic format then convert to modern Arabic numerals (1234567890)
                                const arabicDate = enrollmentDate.toLocaleDateString('ar-EG');
                                const formattedDate = arabicDate.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(d.charCodeAt(0) - 1632));
                                const semester = student.semester || 'الأول';
                                const bgColor = index % 2 === 0 ? '#f8f9fa' : 'white';

                                return `
                                <tr style="background-color: ${bgColor};">
                                    <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${index + 1}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${student.student_id}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${student.name}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${student.registration_number}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${student.department_name || 'غير محدد'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${semester}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formattedDate}</td>
                                </tr>
                                `;
                            }).join('')
                        }
                    </tbody>
                </table>
            </div>

            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d;">
                <p>تم إنشاء هذا التقرير في: ${new Date().toLocaleDateString('ar-EG').replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(d.charCodeAt(0) - 1632))}</p>
            </div>
        </div>
        `;

        // Open a new window
        const newWindow = window.open('', '_blank');

        // Write the HTML content to the new window
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>تقرير الطلبة المسجلين في مجموعة ${group.group_name || 'غير محدد'} - ${group.course_name || 'غير محدد'}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @media print {
                        body {
                            font-family: Arial, sans-serif;
                        }
                        .print-button {
                            display: none;
                        }
                    }
                    .print-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    .print-button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <button class="print-button" onclick="window.print()">طباعة التقرير</button>
                ${htmlContent}
            </body>
            </html>
        `);

        // Close the document
        newWindow.document.close();

    } catch (error) {
        console.error('Error opening report:', error);
        alert('حدث خطأ أثناء فتح التقرير: ' + error.message);
    }
}

// Get groups data from the table
function getGroupsDataFromTable() {
    const groupsTableBody = document.getElementById('course-groups-table-body');
    if (!groupsTableBody) return [];

    const groups = [];
    const rows = groupsTableBody.querySelectorAll('tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const group = {
                group_name: cells[0].textContent.trim(),
                professor_name: cells[1].textContent.trim(),
                time_slot: cells[2].textContent.trim(),
                enrolled_students: parseInt(cells[3].textContent.trim()),
                max_students: parseInt(cells[4].textContent.trim()),
                enrollment_percentage: parseFloat(cells[5].textContent.trim())
            };
            groups.push(group);
        }
    });

    return groups;
}

// Setup export students functions
function setupExportStudentsCSV(course, students) {
    const exportExcelButton = document.getElementById('export-students-excel');
    const viewPdfButton = document.getElementById('view-students-pdf');

    // Setup PDF view button
    if (viewPdfButton) {
        viewPdfButton.onclick = function() {
            // Get groups data from the table
            const groupsData = getGroupsDataFromTable();
            viewStudentsAsPdf(course, students, groupsData);
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

        // Update all department selects to ensure they have the latest data
        setTimeout(() => {
            updateAllDepartmentSelects();
        }, 1000);

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
        setupAddGroupForm();
        setupEditGroupForm();
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

// Function to load departments directly from the API
function loadDepartmentsFromAPI() {
    return new Promise((resolve, reject) => {
        console.log('Loading departments directly from API...');
        fetch('/api/admin/departments')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load departments');
                }
                return response.json();
            })
            .then(data => {
                console.log('Departments loaded from API:', data.departments.length);

                // تأكد من أن معرفات التخصصات هي نصوص
                const departments = data.departments.map(dept => {
                    return {
                        ...dept,
                        id: String(dept.id)
                    };
                });

                console.log('تم تحويل معرفات التخصصات إلى نصوص:');
                departments.forEach(dept => {
                    console.log(`التخصص: ${dept.name}, المعرف: ${dept.id}, نوع المعرف: ${typeof dept.id}`);
                });

                resolve(departments);
            })
            .catch(error => {
                console.error('Error loading departments from API:', error);
                reject(error);
            });
    });
}

// وظيفة مساعدة لتحميل التخصصات في قائمة التصفية
function loadDepartmentsIntoFilterSelect(selectElement, currentValue = '') {
    if (!selectElement) {
        console.error('عنصر القائمة المنسدلة غير موجود');
        return Promise.reject('عنصر القائمة المنسدلة غير موجود');
    }

    console.log(`تحميل التخصصات في قائمة التصفية: ${selectElement.id}`);

    // تحديد القيمة المحددة من المتغيرات العالمية إذا كانت موجودة
    if (!currentValue) {
        if (selectElement.id === 'filter-student-department-select' && window.currentFilters && window.currentFilters.department) {
            currentValue = window.currentFilters.department;
            console.log(`استخدام قيمة التخصص المخزنة في window.currentFilters: ${currentValue}`);
        } else if (selectElement.id === 'filter-department-select' && window.currentCourseFilters && window.currentCourseFilters.department) {
            currentValue = window.currentCourseFilters.department;
            console.log(`استخدام قيمة التخصص المخزنة في window.currentCourseFilters: ${currentValue}`);
        } else if (selectElement.id === 'stats-filter-department-select' && window.currentStatsFilters && window.currentStatsFilters.department) {
            currentValue = window.currentStatsFilters.department;
            console.log(`استخدام قيمة التخصص المخزنة في window.currentStatsFilters: ${currentValue}`);
        }
    }

    // الاحتفاظ بالخيار الأول (جميع التخصصات)
    selectElement.innerHTML = '<option value="">جميع التخصصات</option>';

    // استخدام fetch مباشرة بدلاً من loadDepartmentsFromAPI لضمان الحصول على أحدث البيانات
    return fetch('/api/admin/departments')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في تحميل التخصصات');
            }
            return response.json();
        })
        .then(data => {
            console.log(`تم تحميل ${data.departments.length} تخصص للتصفية`);

            // تأكد من أن معرفات التخصصات هي نصوص
            const departments = data.departments.map(dept => {
                return {
                    ...dept,
                    id: String(dept.id)
                };
            });

            // إضافة التخصصات إلى القائمة المنسدلة
            departments.forEach(department => {
                const option = document.createElement('option');
                option.value = String(department.id);
                option.textContent = department.name;
                selectElement.appendChild(option);
                console.log(`إضافة تخصص: ${department.name}, المعرف: ${option.value}, نوع المعرف: ${typeof option.value}`);
            });

            // استعادة القيمة المحددة سابقًا
            if (currentValue) {
                selectElement.value = String(currentValue);
                console.log(`تم استعادة التخصص المحدد: ${currentValue}`);

                // تأكد من أن القيمة موجودة في القائمة
                const selectedOption = Array.from(selectElement.options).find(option => option.value === String(currentValue));
                if (!selectedOption) {
                    console.warn(`التخصص المحدد غير موجود في القائمة: ${currentValue}`);

                    // البحث عن التخصص في قائمة التخصصات
                    const department = departments.find(dept => String(dept.id) === String(currentValue));
                    if (department) {
                        // إضافة التخصص إلى القائمة
                        const option = document.createElement('option');
                        option.value = String(department.id);
                        option.textContent = department.name;
                        selectElement.appendChild(option);
                        selectElement.value = String(currentValue);
                        console.log(`تمت إضافة التخصص المحدد إلى القائمة: ${department.name}`);
                    }
                }
            }

            // تخزين القيمة المحددة في المتغيرات العالمية
            if (selectElement.id === 'filter-student-department-select') {
                if (!window.currentFilters) {
                    window.currentFilters = { department: '', semester: '', search: '' };
                }
                window.currentFilters.department = selectElement.value;
                console.log(`تم تخزين قيمة التخصص المحدد في window.currentFilters: ${selectElement.value}`);
            } else if (selectElement.id === 'filter-department-select') {
                if (!window.currentCourseFilters) {
                    window.currentCourseFilters = { department: '', semester: '', search: '' };
                }
                window.currentCourseFilters.department = selectElement.value;
                console.log(`تم تخزين قيمة التخصص المحدد في window.currentCourseFilters: ${selectElement.value}`);
            } else if (selectElement.id === 'stats-filter-department-select') {
                if (!window.currentStatsFilters) {
                    window.currentStatsFilters = { department: '', semester: '', search: '' };
                }
                window.currentStatsFilters.department = selectElement.value;
                console.log(`تم تخزين قيمة التخصص المحدد في window.currentStatsFilters: ${selectElement.value}`);
            }

            return departments;
        })
        .catch(error => {
            console.error('Error loading departments for filter:', error);
            return [];
        });
}

// Function to update all department selects in the system
function updateAllDepartmentSelects() {
    console.log('Updating all department selects in the system');

    // Get all department selects
    const departmentSelects = [
        document.getElementById('department-select'),
        document.getElementById('course-department-select'),
        document.getElementById('edit-department-select'),
        document.getElementById('filter-student-department-select'),
        document.getElementById('filter-department-select'),
        document.getElementById('prerequisite-department-select'),
        document.getElementById('edit-course-department-select'),
        document.getElementById('prerequisite-department-select-modal'),
        document.getElementById('stats-filter-department-select')
    ];

    // تسجيل معرفات التخصصات المتاحة للتصحيح
    console.log('تحديث قوائم التخصصات للتصفية الصحيحة');

    // Load departments directly
    loadDepartmentsFromAPI()
        .then(departments => {
            // طباعة معرفات التخصصات للتصحيح
            console.log('معرفات التخصصات المتاحة:');
            departments.forEach(dept => {
                console.log(`التخصص: ${dept.name}, المعرف: ${dept.id}, نوع المعرف: ${typeof dept.id}`);
            });

            // Update each select
            departmentSelects.forEach(select => {
                if (select) {
                    console.log('Updating select:', select.id);

                    // Save current selection
                    const currentSelection = select.value;

                    // Reset select with appropriate placeholder
                    if (select.id === 'filter-student-department-select' ||
                        select.id === 'filter-department-select' ||
                        select.id === 'prerequisite-department-select' ||
                        select.id === 'prerequisite-department-select-modal' ||
                        select.id === 'stats-filter-department-select') {
                        select.innerHTML = '<option value="">جميع التخصصات</option>';
                    } else {
                        select.innerHTML = '<option value="">اختر التخصص</option>';
                    }

                    // Add departments
                    departments.forEach(department => {
                        const option = document.createElement('option');
                        option.value = department.id;
                        option.textContent = department.name;
                        select.appendChild(option);
                    });

                    // Restore previous selection if it exists
                    if (currentSelection) {
                        select.value = currentSelection;
                    }
                }
            });

            // Reset the initialization flags to force reloading of department selects
            window.departmentSelectInitialized = false;
            window.courseDepartmentSelectInitialized = false;
            window.courseFiltersInitialized = false;
            window.studentsFiltersInitialized = false;

            // Force reload of course statistics filters if on that page
            if (window.location.pathname.includes('/course-statistics.html')) {
                setupCourseStatisticsFilters();
            }

            console.log('Updated all department selects with the latest departments');
        })
        .catch(error => {
            console.error('Error updating department selects:', error);
        });
}
