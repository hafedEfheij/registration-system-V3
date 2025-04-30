// Admin Profile Management

// Load admin profile data
function loadAdminProfile() {
    fetch('/api/admin/profile')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على بيانات المشرف');
            }
            return response.json();
        })
        .then(data => {
            // Set form values
            document.getElementById('admin-username').value = data.user.username;
            document.getElementById('admin-password').value = data.user.password;
            document.getElementById('admin-password-confirm').value = data.user.password;
        })
        .catch(error => {
            console.error('Error loading admin profile:', error);
            showProfileUpdateError('حدث خطأ أثناء تحميل بيانات المشرف: ' + error.message);
        });
}

// Setup admin profile form
function setupAdminProfileForm() {
    const adminProfileForm = document.getElementById('admin-profile-form');
    if (adminProfileForm) {
        adminProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form values
            const currentPassword = document.getElementById('current-password').value;
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            const passwordConfirm = document.getElementById('admin-password-confirm').value;

            // Validate form
            if (!currentPassword || !username || !password || !passwordConfirm) {
                showProfileUpdateError('جميع الحقول مطلوبة');
                return;
            }

            if (password !== passwordConfirm) {
                showProfileUpdateError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
                return;
            }

            // Disable form while submitting
            const submitButton = adminProfileForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الحفظ...';

            // Hide any previous messages
            hideProfileMessages();

            // Update admin profile
            fetch('/api/admin/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    username,
                    password
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'فشل في تحديث بيانات المشرف');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showProfileUpdateSuccess('تم تحديث بيانات المشرف بنجاح');

                    // Update username in navbar
                    const userNameElement = document.getElementById('user-name');
                    if (userNameElement) {
                        userNameElement.textContent = username;
                    }

                    // Clear the current password field
                    document.getElementById('current-password').value = '';
                } else {
                    showProfileUpdateError('فشل في تحديث بيانات المشرف');
                }
            })
            .catch(error => {
                console.error('Error updating admin profile:', error);
                showProfileUpdateError(error.message);
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Show profile update success message
function showProfileUpdateSuccess(message) {
    const successAlert = document.getElementById('profile-update-success');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.classList.remove('d-none');
    }
}

// Show profile update error message
function showProfileUpdateError(message) {
    const errorAlert = document.getElementById('profile-update-error');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.remove('d-none');
    }
}

// Hide profile messages
function hideProfileMessages() {
    const successAlert = document.getElementById('profile-update-success');
    const errorAlert = document.getElementById('profile-update-error');

    if (successAlert) {
        successAlert.classList.add('d-none');
    }

    if (errorAlert) {
        errorAlert.classList.add('d-none');
    }
}

// Reset form function
function resetAdminProfileForm() {
    // Load the original values
    loadAdminProfile();

    // Clear current password field
    const currentPasswordField = document.getElementById('current-password');
    if (currentPasswordField) {
        currentPasswordField.value = '';
    }

    // Hide any messages
    hideProfileMessages();
}

// Initialize admin profile page
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin profile page
    if (window.location.pathname.includes('/admin/profile.html')) {
        loadAdminProfile();
        setupAdminProfileForm();

        // Setup reset button (in case it's clicked directly without the onclick attribute)
        const resetButton = document.querySelector('#admin-profile-form button[type="button"]');
        if (resetButton) {
            resetButton.addEventListener('click', resetAdminProfileForm);
        }
    }
});
