// Financial Supervisors Management

// Load financial supervisors
function loadFinancialSupervisors() {
    console.log('Loading financial supervisors...');
    const tableBody = document.getElementById('financial-supervisors-table-body');
    const noSupervisors = document.getElementById('no-financial-supervisors');

    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">جاري تحميل البيانات...</td></tr>';

        // Directly load financial supervisors without checking user role first
        // This is a simpler approach that might work better
        const timestamp = new Date().getTime();

        fetch(`/api/admin/financial-supervisors?_=${timestamp}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            credentials: 'same-origin' // Include cookies
        })
        .then(response => {
            console.log('Response status:', response.status);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('ليس لديك صلاحية للوصول إلى هذه البيانات');
                } else {
                    return response.text().then(text => {
                        console.error('Error response text:', text);
                        try {
                            const errorData = JSON.parse(text);
                            throw new Error(errorData.error || 'فشل في تحميل بيانات المشرفين الماليين');
                        } catch (e) {
                            throw new Error('فشل في تحميل بيانات المشرفين الماليين');
                        }
                    });
                }
            }

            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);

            if (data.users && Array.isArray(data.users)) {
                if (data.users.length > 0) {
                    tableBody.innerHTML = '';

                    data.users.forEach((user, index) => {
                        const row = document.createElement('tr');

                        // Format date with fallback
                        let formattedDate = 'غير محدد';
                        if (user.created_at) {
                            try {
                                const createdDate = new Date(user.created_at);
                                if (!isNaN(createdDate.getTime())) {
                                    // Obtener el día y año con números en inglés
                                    const day = createdDate.getDate();
                                    const year = createdDate.getFullYear();

                                    // Obtener el mes en árabe
                                    const monthIndex = createdDate.getMonth();
                                    // Array de nombres de meses en árabe
                                    const arabicMonths = [
                                        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                                    ];
                                    const month = arabicMonths[monthIndex];

                                    // Combinar con números en inglés y texto en árabe
                                    formattedDate = `${day} ${month} ${year}`;
                                }
                            } catch (e) {
                                console.error('Error formatting date:', e);
                            }
                        }

                        // Ensure user.id and user.username are defined
                        const userId = user.id || 0;
                        const username = user.username || 'غير معروف';

                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${username}</td>
                            <td>${formattedDate}</td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-sm btn-primary edit-supervisor" data-id="${userId}">
                                        <i class="fas fa-edit"></i> تعديل
                                    </button>
                                    <button type="button" class="btn btn-sm btn-danger delete-supervisor" data-id="${userId}" data-username="${username}">
                                        <i class="fas fa-trash"></i> حذف
                                    </button>
                                </div>
                            </td>
                        `;

                        tableBody.appendChild(row);
                    });

                    // Add event listeners to edit and delete buttons
                    addSupervisorEventListeners();

                    // Hide no supervisors message
                    if (noSupervisors) {
                        noSupervisors.classList.add('d-none');
                    }
                } else {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">لا يوجد مشرفين ماليين</td></tr>';

                    // Show no supervisors message
                    if (noSupervisors) {
                        noSupervisors.classList.remove('d-none');
                    }
                }
            } else {
                // Handle case where data.users is not an array
                console.error('Invalid data format:', data);
                throw new Error('تنسيق البيانات غير صالح');
            }
        })
        .catch(error => {
            console.error('Error loading financial supervisors:', error);
            showFinancialSupervisorError(error.message);
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات: ${error.message}</td></tr>`;

            // Hide no supervisors message
            if (noSupervisors) {
                noSupervisors.classList.add('d-none');
            }
        });
    }
}

// Add event listeners to supervisor buttons
function addSupervisorEventListeners() {
    // Edit supervisor
    document.querySelectorAll('.edit-supervisor').forEach(button => {
        button.addEventListener('click', function() {
            const supervisorId = this.getAttribute('data-id');
            editSupervisor(supervisorId);
        });
    });

    // Delete supervisor
    document.querySelectorAll('.delete-supervisor').forEach(button => {
        button.addEventListener('click', function() {
            const supervisorId = this.getAttribute('data-id');
            const username = this.getAttribute('data-username');
            deleteSupervisor(supervisorId, username);
        });
    });
}

// Edit supervisor
function editSupervisor(supervisorId) {
    // Buscar el nombre de usuario en la tabla
    const row = document.querySelector(`.delete-supervisor[data-id="${supervisorId}"]`);
    let username = '';

    if (row) {
        username = row.getAttribute('data-username');
    }

    const form = document.getElementById('financial-supervisor-form');
    const idInput = document.getElementById('financial-supervisor-id');
    const usernameInput = document.getElementById('financial-supervisor-username');
    const passwordInput = document.getElementById('financial-supervisor-password');
    const formTitle = document.getElementById('financial-supervisor-form-title');
    const submitBtnText = document.getElementById('financial-supervisor-submit-btn-text');

    if (form && idInput && usernameInput && passwordInput) {
        idInput.value = supervisorId;
        usernameInput.value = username;
        passwordInput.value = ''; // Clear password for security

        if (formTitle) {
            formTitle.textContent = 'تعديل بيانات المشرف المالي';
        }

        if (submitBtnText) {
            submitBtnText.textContent = 'تحديث البيانات';
        }

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete supervisor
function deleteSupervisor(supervisorId, username) {
    console.log('Deleting supervisor:', supervisorId, username);

    if (confirm(`هل أنت متأكد من حذف المشرف المالي "${username}"؟`)) {
        // First, check if the user is logged in and has the right role
        fetch('/api/user')
            .then(response => {
                if (!response.ok) {
                    throw new Error('فشل في التحقق من صلاحيات المستخدم');
                }
                return response.json();
            })
            .then(userData => {
                console.log('User data:', userData);

                if (!userData.user || userData.user.role !== 'admin') {
                    console.log('User is not an admin. Role:', userData.user ? userData.user.role : 'not logged in');
                    throw new Error('ليس لديك صلاحية لحذف المشرف المالي');
                }

                // User is an admin, proceed with deletion
                // Add a timestamp to prevent caching
                const timestamp = new Date().getTime();

                return fetch(`/api/admin/financial-supervisors/${supervisorId}?_=${timestamp}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    credentials: 'same-origin' // Include cookies
                });
            })
            .then(response => {
                console.log('Delete response status:', response.status);

                if (!response.ok) {
                    if (response.status === 403) {
                        throw new Error('ليس لديك صلاحية لحذف المشرف المالي');
                    } else {
                        return response.text().then(text => {
                            console.error('Error response text:', text);
                            try {
                                const errorData = JSON.parse(text);
                                throw new Error(errorData.error || 'فشل في حذف المشرف المالي');
                            } catch (e) {
                                throw new Error('فشل في حذف المشرف المالي');
                            }
                        });
                    }
                }

                return response.json();
            })
            .then(data => {
                console.log('Delete response data:', data);

                if (data.success) {
                    showFinancialSupervisorSuccess('تم حذف المشرف المالي بنجاح');
                    loadFinancialSupervisors();
                } else {
                    showFinancialSupervisorError(data.error || 'فشل في حذف المشرف المالي');
                }
            })
            .catch(error => {
                console.error('Error deleting supervisor:', error);
                showFinancialSupervisorError(error.message);
            });
    }
}

// Setup financial supervisor form
function setupFinancialSupervisorForm() {
    console.log('Setting up financial supervisor form...');
    const form = document.getElementById('financial-supervisor-form');
    const resetBtn = document.getElementById('reset-financial-supervisor-form');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // First, check if the user is logged in and has the right role
            fetch('/api/user')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('فشل في التحقق من صلاحيات المستخدم');
                    }
                    return response.json();
                })
                .then(userData => {
                    console.log('User data:', userData);

                    if (!userData.user || userData.user.role !== 'admin') {
                        console.log('User is not an admin. Role:', userData.user ? userData.user.role : 'not logged in');
                        throw new Error('ليس لديك صلاحية لإدارة المشرفين الماليين');
                    }

                    // User is an admin, proceed with form submission
                    const supervisorId = document.getElementById('financial-supervisor-id').value;
                    const username = document.getElementById('financial-supervisor-username').value;
                    const password = document.getElementById('financial-supervisor-password').value;

                    if (!username || !password) {
                        showFinancialSupervisorError('جميع الحقول مطلوبة');
                        return;
                    }

                    // Disable form while submitting
                    const submitBtn = form.querySelector('button[type="submit"]');
                    const originalBtnText = submitBtn.innerHTML;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري الحفظ...';

                    // Determine if adding or updating
                    const isUpdate = supervisorId !== '';
                    const url = isUpdate ? `/api/admin/financial-supervisors/${supervisorId}` : '/api/admin/financial-supervisors';
                    const method = isUpdate ? 'PUT' : 'POST';

                    // Add a timestamp to prevent caching
                    const timestamp = new Date().getTime();
                    const urlWithTimestamp = `${url}?_=${timestamp}`;

                    console.log(`Submitting form: ${method} ${urlWithTimestamp}`);
                    console.log('Form data:', { username, password: password ? '******' : 'not provided' });

                    return fetch(urlWithTimestamp, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        credentials: 'same-origin', // Include cookies
                        body: JSON.stringify({ username, password })
                    })
                        .then(response => {
                            console.log('Form submission response status:', response.status);

                            if (!response.ok) {
                                if (response.status === 403) {
                                    throw new Error('ليس لديك صلاحية لإدارة المشرفين الماليين');
                                } else {
                                    return response.text().then(text => {
                                        console.error('Error response text:', text);
                                        try {
                                            const errorData = JSON.parse(text);
                                            throw new Error(errorData.error || 'فشل في حفظ بيانات المشرف المالي');
                                        } catch (e) {
                                            throw new Error('فشل في حفظ بيانات المشرف المالي');
                                        }
                                    });
                                }
                            }

                            return response.json();
                        })
                        .then(data => {
                            console.log('Form submission response data:', data);

                            if (data.success) {
                                showFinancialSupervisorSuccess(isUpdate ? 'تم تحديث بيانات المشرف المالي بنجاح' : 'تم إضافة المشرف المالي بنجاح');
                                resetFinancialSupervisorForm();
                                loadFinancialSupervisors();
                            } else {
                                showFinancialSupervisorError(data.error || 'فشل في حفظ بيانات المشرف المالي');
                            }
                        })
                        .finally(() => {
                            // Re-enable form
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalBtnText;
                        });
                })
                .catch(error => {
                    console.error('Error saving supervisor:', error);
                    showFinancialSupervisorError(error.message);
                });
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetFinancialSupervisorForm);
    }
}

// Reset financial supervisor form
function resetFinancialSupervisorForm() {
    const form = document.getElementById('financial-supervisor-form');
    const idInput = document.getElementById('financial-supervisor-id');
    const formTitle = document.getElementById('financial-supervisor-form-title');
    const submitBtnText = document.getElementById('financial-supervisor-submit-btn-text');

    if (form) {
        form.reset();
    }

    if (idInput) {
        idInput.value = '';
    }

    if (formTitle) {
        formTitle.textContent = 'إضافة مشرف مالي جديد';
    }

    if (submitBtnText) {
        submitBtnText.textContent = 'إضافة مشرف مالي';
    }

    // Hide messages
    hideFinancialSupervisorMessages();
}

// Show success message
function showFinancialSupervisorSuccess(message) {
    const successAlert = document.getElementById('financial-supervisor-success');

    if (successAlert) {
        successAlert.textContent = message;
        successAlert.classList.remove('d-none');

        // Hide after 5 seconds
        setTimeout(() => {
            successAlert.classList.add('d-none');
        }, 5000);
    }
}

// Show error message
function showFinancialSupervisorError(message) {
    const errorAlert = document.getElementById('financial-supervisor-error');

    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.remove('d-none');

        // Hide after 5 seconds
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }
}

// Hide messages
function hideFinancialSupervisorMessages() {
    const successAlert = document.getElementById('financial-supervisor-success');
    const errorAlert = document.getElementById('financial-supervisor-error');

    if (successAlert) {
        successAlert.classList.add('d-none');
    }

    if (errorAlert) {
        errorAlert.classList.add('d-none');
    }
}

// Initialize financial supervisors management
document.addEventListener('DOMContentLoaded', function() {
    loadFinancialSupervisors();
    setupFinancialSupervisorForm();
});
