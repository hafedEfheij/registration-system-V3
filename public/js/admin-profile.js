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

// Format time in minutes and seconds
function formatTimeDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update current timeout display
function updateCurrentTimeoutDisplay(seconds) {
    const currentTimeoutDisplay = document.getElementById('current-timeout-display');
    if (currentTimeoutDisplay) {
        currentTimeoutDisplay.textContent = formatTimeDisplay(seconds);
    }
}

// Load auto-logout settings
function loadAutoLogoutSettings() {
    console.log('Loading auto-logout settings from server...');
    fetch('/api/auto-logout-settings')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في الحصول على إعدادات تسجيل الخروج التلقائي');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received auto-logout settings from server:', data);

            // Store the settings in localStorage for persistence
            localStorage.setItem('auto_logout_enabled', data.auto_logout_enabled);
            localStorage.setItem('auto_logout_timeout', data.auto_logout_timeout * 1000); // Convert to milliseconds

            // Set form values
            const enabledCheckbox = document.getElementById('auto-logout-enabled');
            const timeoutInput = document.getElementById('auto-logout-timeout');
            const timeoutLabel = document.querySelector('label[for="auto-logout-timeout"]');
            const timeoutHelpText = timeoutInput ? timeoutInput.nextElementSibling : null;
            const currentTimeoutCard = document.querySelector('.auto-logout-current-timeout-card');

            if (enabledCheckbox) {
                console.log('Setting auto-logout enabled checkbox to:', data.auto_logout_enabled);
                enabledCheckbox.checked = data.auto_logout_enabled;

                // Force the change event to update the UI
                const changeEvent = new Event('change');
                enabledCheckbox.dispatchEvent(changeEvent);
            }

            if (timeoutInput) {
                timeoutInput.value = data.auto_logout_timeout;

                // Set disabled state based on enabled checkbox
                if (!data.auto_logout_enabled) {
                    timeoutInput.disabled = true;
                    if (timeoutLabel) timeoutLabel.classList.add('text-muted');
                    if (timeoutHelpText) timeoutHelpText.classList.add('d-none');
                    if (currentTimeoutCard) currentTimeoutCard.classList.add('opacity-50');
                } else {
                    timeoutInput.disabled = false;
                    if (timeoutLabel) timeoutLabel.classList.remove('text-muted');
                    if (timeoutHelpText) timeoutHelpText.classList.remove('d-none');
                    if (currentTimeoutCard) currentTimeoutCard.classList.remove('opacity-50');
                }
            }

            // Update the current timeout display
            updateCurrentTimeoutDisplay(data.auto_logout_timeout);
        })
        .catch(error => {
            console.error('Error loading auto-logout settings:', error);
            showAutoLogoutUpdateError('حدث خطأ أثناء تحميل إعدادات تسجيل الخروج التلقائي: ' + error.message);
        });
}

// Setup auto-logout settings form
function setupAutoLogoutSettingsForm() {
    const autoLogoutSettingsForm = document.getElementById('auto-logout-settings-form');
    if (autoLogoutSettingsForm) {
        // Add event listener for timeout input to update the display in real-time
        const timeoutInput = document.getElementById('auto-logout-timeout');
        if (timeoutInput) {
            timeoutInput.addEventListener('input', function() {
                const value = parseInt(this.value);
                if (!isNaN(value) && value >= 5) {
                    updateCurrentTimeoutDisplay(value);
                }
            });
        }

        // Add event listener for the auto-logout-enabled checkbox
        const autoLogoutEnabledCheckbox = document.getElementById('auto-logout-enabled');
        if (autoLogoutEnabledCheckbox) {
            autoLogoutEnabledCheckbox.addEventListener('change', function() {
                console.log('Auto-logout enabled changed to:', this.checked);

                // Update localStorage immediately for real-time effect
                localStorage.setItem('auto_logout_enabled', this.checked);

                // Get current timeout value
                const timeoutInput = document.getElementById('auto-logout-timeout');
                const timeoutValue = parseInt(timeoutInput.value) || 30;

                // Update localStorage with current timeout value
                localStorage.setItem('auto_logout_timeout', timeoutValue * 1000);

                // Force update of auto-logout system
                if (window.updateAutoLogoutSettings) {
                    console.log('Calling updateAutoLogoutSettings with:', this.checked, timeoutValue);
                    window.updateAutoLogoutSettings(this.checked, timeoutValue);
                }

                // Toggle the timeout input field based on the checkbox state
                const timeoutLabel = document.querySelector('label[for="auto-logout-timeout"]');
                const timeoutHelpText = timeoutInput.nextElementSibling;
                const currentTimeoutCard = document.querySelector('.auto-logout-current-timeout-card');

                if (timeoutInput && timeoutLabel && timeoutHelpText) {
                    if (this.checked) {
                        // Enable the timeout input
                        timeoutInput.disabled = false;
                        timeoutLabel.classList.remove('text-muted');
                        timeoutHelpText.classList.remove('d-none');
                        if (currentTimeoutCard) {
                            currentTimeoutCard.classList.remove('opacity-50');
                        }
                    } else {
                        // Disable the timeout input
                        timeoutInput.disabled = true;
                        timeoutLabel.classList.add('text-muted');
                        timeoutHelpText.classList.add('d-none');
                        if (currentTimeoutCard) {
                            currentTimeoutCard.classList.add('opacity-50');
                        }
                    }
                }

                // Force refresh of auto-logout system
                if (typeof checkLocalStorageSettings === 'function') {
                    checkLocalStorageSettings();
                }
            });
        }

        autoLogoutSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form values
            const autoLogoutEnabled = document.getElementById('auto-logout-enabled').checked;
            const autoLogoutTimeout = parseInt(document.getElementById('auto-logout-timeout').value);

            // Validate form
            if (isNaN(autoLogoutTimeout) || autoLogoutTimeout < 5) {
                showAutoLogoutUpdateError('يجب أن تكون مدة الخمول 5 ثوان على الأقل');
                return;
            }

            // Disable form while submitting
            const submitButton = autoLogoutSettingsForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الحفظ...';

            // Hide any previous messages
            hideAutoLogoutMessages();

            // Update auto-logout settings
            console.log('Sending auto-logout settings:', {
                auto_logout_enabled: autoLogoutEnabled,
                auto_logout_timeout: autoLogoutTimeout
            });

            fetch('/api/auto-logout-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    auto_logout_enabled: autoLogoutEnabled,
                    auto_logout_timeout: autoLogoutTimeout
                })
            })
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);

                if (!response.ok) {
                    return response.text().then(text => {
                        console.error('Error response text:', text);
                        try {
                            const data = JSON.parse(text);
                            throw new Error(data.error || 'فشل في تحديث إعدادات تسجيل الخروج التلقائي');
                        } catch (e) {
                            throw new Error('فشل في تحديث إعدادات تسجيل الخروج التلقائي: ' + text);
                        }
                    });
                }

                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showAutoLogoutUpdateSuccess('تم تحديث إعدادات تسجيل الخروج التلقائي بنجاح');

                    // Update the auto-logout settings in real-time
                    if (window.updateAutoLogoutSettings) {
                        console.log('Calling updateAutoLogoutSettings with:', autoLogoutEnabled, autoLogoutTimeout);
                        window.updateAutoLogoutSettings(autoLogoutEnabled, autoLogoutTimeout);
                    } else {
                        console.warn('updateAutoLogoutSettings function not found, falling back to localStorage update');
                        // Fallback to just updating localStorage
                        localStorage.setItem('auto_logout_enabled', autoLogoutEnabled);
                        localStorage.setItem('auto_logout_timeout', autoLogoutTimeout * 1000); // Convert to milliseconds
                    }

                    // Update the current timeout display
                    updateCurrentTimeoutDisplay(autoLogoutTimeout);
                } else {
                    showAutoLogoutUpdateError('فشل في تحديث إعدادات تسجيل الخروج التلقائي');
                }
            })
            .catch(error => {
                console.error('Error updating auto-logout settings:', error);
                showAutoLogoutUpdateError(error.message);
            })
            .finally(() => {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
}

// Show auto-logout update success message
function showAutoLogoutUpdateSuccess(message) {
    const successAlert = document.getElementById('auto-logout-update-success');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.classList.remove('d-none');
    }
}

// Show auto-logout update error message
function showAutoLogoutUpdateError(message) {
    const errorAlert = document.getElementById('auto-logout-update-error');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.remove('d-none');
    }
}

// Hide auto-logout messages
function hideAutoLogoutMessages() {
    const successAlert = document.getElementById('auto-logout-update-success');
    const errorAlert = document.getElementById('auto-logout-update-error');

    if (successAlert) {
        successAlert.classList.add('d-none');
    }

    if (errorAlert) {
        errorAlert.classList.add('d-none');
    }
}

// Reset auto-logout settings form
function resetAutoLogoutSettingsForm() {
    // Load the original values
    loadAutoLogoutSettings();

    // Hide any messages
    hideAutoLogoutMessages();

    // The loadAutoLogoutSettings function will update the current timeout display
}

// Initialize auto-logout settings from localStorage
function initializeAutoLogoutSettingsFromLocalStorage() {
    console.log('Initializing auto-logout settings from localStorage...');

    // Get settings from localStorage
    const enabledValue = localStorage.getItem('auto_logout_enabled');
    const timeoutValue = localStorage.getItem('auto_logout_timeout');

    console.log('localStorage values:', { enabledValue, timeoutValue });

    // Set form values if they exist in localStorage
    const enabledCheckbox = document.getElementById('auto-logout-enabled');
    const timeoutInput = document.getElementById('auto-logout-timeout');

    if (enabledCheckbox && enabledValue !== null) {
        const isEnabled = enabledValue === 'true';
        console.log('Setting checkbox from localStorage to:', isEnabled);
        enabledCheckbox.checked = isEnabled;

        // Force the change event to update the UI
        const changeEvent = new Event('change');
        enabledCheckbox.dispatchEvent(changeEvent);
    }

    if (timeoutInput && timeoutValue !== null) {
        const timeoutSeconds = Math.floor(parseInt(timeoutValue) / 1000);
        if (!isNaN(timeoutSeconds) && timeoutSeconds >= 5) {
            console.log('Setting timeout input from localStorage to:', timeoutSeconds);
            timeoutInput.value = timeoutSeconds;
            updateCurrentTimeoutDisplay(timeoutSeconds);
        }
    }
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

        // First initialize from localStorage for immediate UI update
        initializeAutoLogoutSettingsFromLocalStorage();

        // Then load from server and setup form
        loadAutoLogoutSettings();
        setupAutoLogoutSettingsForm();

        // Setup auto-logout reset button
        const resetAutoLogoutButton = document.getElementById('reset-auto-logout-settings');
        if (resetAutoLogoutButton) {
            resetAutoLogoutButton.addEventListener('click', resetAutoLogoutSettingsForm);
        }
    }
});
