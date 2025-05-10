/**
 * Auto Logout System
 *
 * This script implements an automatic logout feature that will log out users
 * after a configurable period of inactivity.
 */

// Default configuration
let INACTIVITY_TIMEOUT = 30000; // 30 seconds in milliseconds by default
let AUTO_LOGOUT_ENABLED = true; // Enabled by default
let inactivityTimer;
let countdownTimer;
let countdownSeconds = 30;
let isCountingDown = false;
let lastActivityTime = Date.now();

// Helper function to format seconds as minutes:seconds
function formatTimeDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Load auto-logout settings from server
function loadAutoLogoutSettings() {
    fetch('/api/auto-logout-settings')
        .then(response => {
            if (!response.ok) {
                // If we get a 401 or 403, we're not authenticated
                if (response.status === 401 || response.status === 403) {
                    console.log('Not authenticated, redirecting to login page');
                    window.location.href = '/';
                    return null;
                }
                throw new Error('Failed to load auto-logout settings');
            }
            return response.json();
        })
        .then(data => {
            // If we got redirected to login page, don't continue
            if (data === null) return;

            // Update settings
            AUTO_LOGOUT_ENABLED = data.auto_logout_enabled;
            INACTIVITY_TIMEOUT = data.auto_logout_timeout * 1000; // Convert seconds to milliseconds
            countdownSeconds = data.auto_logout_timeout;

            console.log(`Auto-logout settings loaded: enabled=${AUTO_LOGOUT_ENABLED}, timeout=${INACTIVITY_TIMEOUT}ms`);

            // Update localStorage with the server settings
            localStorage.setItem('auto_logout_enabled', AUTO_LOGOUT_ENABLED);
            localStorage.setItem('auto_logout_timeout', INACTIVITY_TIMEOUT);

            // Update the current timeout display if it exists
            const currentTimeoutDisplay = document.getElementById('current-timeout-display');
            if (currentTimeoutDisplay) {
                currentTimeoutDisplay.textContent = formatTimeDisplay(data.auto_logout_timeout);

                // Also update the input field with the current value
                const timeoutInput = document.getElementById('auto-logout-timeout');
                if (timeoutInput) {
                    timeoutInput.value = data.auto_logout_timeout;
                }
            }

            // Check if we should initialize the auto-logout system
            if (AUTO_LOGOUT_ENABLED) {
                initializeAutoLogout();
            } else {
                // Clear any existing timers if auto-logout is disabled
                clearTimeout(inactivityTimer);
                stopCountdown();
                removeActivityTracking();
                console.log('Auto-logout system is disabled by server settings');
            }
        })
        .catch(error => {
            console.error('Error loading auto-logout settings:', error);
            // Check if the error is due to parsing JSON (which might mean we got HTML instead)
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                console.log('Received HTML instead of JSON, using default settings');
            }

            // Check localStorage first before using default settings
            const storedEnabled = localStorage.getItem('auto_logout_enabled');
            if (storedEnabled !== null) {
                AUTO_LOGOUT_ENABLED = storedEnabled === 'true';
            }

            // Only initialize if auto-logout is enabled
            if (AUTO_LOGOUT_ENABLED) {
                console.log('Auto-logout is enabled in localStorage, initializing...');
                initializeAutoLogout();
            } else {
                console.log('Auto-logout is disabled in localStorage, skipping initialization');
                // Make sure to clean up any existing timers and event listeners
                clearTimeout(inactivityTimer);
                stopCountdown();
                removeActivityTracking();
            }
        });
}

// Check localStorage for settings that might have been updated in the current session
function checkLocalStorageSettings() {
    const storedEnabled = localStorage.getItem('auto_logout_enabled');
    const storedTimeout = localStorage.getItem('auto_logout_timeout');

    let wasEnabled = AUTO_LOGOUT_ENABLED;

    if (storedEnabled !== null) {
        AUTO_LOGOUT_ENABLED = storedEnabled === 'true';
    }

    if (storedTimeout !== null) {
        INACTIVITY_TIMEOUT = parseInt(storedTimeout);
        countdownSeconds = Math.floor(INACTIVITY_TIMEOUT / 1000);
    }

    console.log(`Auto-logout settings from localStorage: enabled=${AUTO_LOGOUT_ENABLED}, timeout=${INACTIVITY_TIMEOUT}ms`);

    // If auto-logout is disabled, make sure to clean up any existing timers
    if (!AUTO_LOGOUT_ENABLED) {
        console.log('Auto-logout is disabled in localStorage, cleaning up...');
        clearTimeout(inactivityTimer);
        stopCountdown();
        // Remove event listeners if they were added
        removeActivityTracking();
        console.log('Auto-logout system is disabled by localStorage settings');
    } else if (!wasEnabled && AUTO_LOGOUT_ENABLED) {
        // If it was disabled but now enabled, initialize the system
        console.log('Auto-logout was disabled but is now enabled, initializing...');
        initializeAutoLogout();
    } else if (AUTO_LOGOUT_ENABLED) {
        // If it's still enabled, make sure it's properly initialized
        console.log('Auto-logout is enabled in localStorage, ensuring it is initialized...');
        initializeAutoLogout();
    }
}

// Create modal for countdown
function createCountdownModal() {
    // Check if modal already exists
    if (document.getElementById('auto-logout-modal')) {
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'auto-logout-modal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'autoLogoutModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.setAttribute('data-bs-keyboard', 'false');

    // Get the current timeout value in seconds
    const timeoutSeconds = Math.floor(INACTIVITY_TIMEOUT/1000);

    // Format time as minutes:seconds
    const formattedTime = formatTimeDisplay(timeoutSeconds);

    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-warning">
                    <h5 class="modal-title" id="autoLogoutModalLabel">تنبيه: تسجيل الخروج التلقائي</h5>
                </div>
                <div class="modal-body text-center">
                    <div class="mb-3">
                        <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                        <p id="inactivity-message">لم يتم تسجيل أي نشاط لمدة ${timeoutSeconds} ثانية (${formattedTime}).</p>
                        <p>سيتم تسجيل خروجك تلقائيًا خلال <span id="countdown-timer" class="fw-bold">${timeoutSeconds}</span> ثانية.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="stay-logged-in-btn">البقاء متصلاً</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listener
    document.getElementById('stay-logged-in-btn').addEventListener('click', resetInactivityTimer);
}

// Function to reset the inactivity timer
function resetInactivityTimer() {
    // Update last activity time
    lastActivityTime = Date.now();

    // Clear existing timers
    clearTimeout(inactivityTimer);

    // If countdown is active, stop it and hide modal
    if (isCountingDown) {
        stopCountdown();
    }

    // Set new inactivity timer
    inactivityTimer = setTimeout(startCountdown, INACTIVITY_TIMEOUT);
}

// Function to start the countdown to logout
function startCountdown() {
    // Create modal if it doesn't exist
    createCountdownModal();

    // Update the modal text with the current timeout value
    const timeoutSeconds = Math.floor(INACTIVITY_TIMEOUT/1000);

    // Format time as minutes:seconds
    const formattedTime = formatTimeDisplay(timeoutSeconds);

    const inactivityMessage = document.getElementById('inactivity-message');
    if (inactivityMessage) {
        inactivityMessage.textContent = `لم يتم تسجيل أي نشاط لمدة ${timeoutSeconds} ثانية (${formattedTime}).`;
    }

    // Show the modal
    const autoLogoutModal = new bootstrap.Modal(document.getElementById('auto-logout-modal'));
    autoLogoutModal.show();

    // Reset countdown seconds to the configured value
    countdownSeconds = Math.floor(INACTIVITY_TIMEOUT/1000);
    document.getElementById('countdown-timer').textContent = countdownSeconds;

    // Set flag
    isCountingDown = true;

    // Start countdown
    countdownTimer = setInterval(() => {
        countdownSeconds--;
        document.getElementById('countdown-timer').textContent = countdownSeconds;

        if (countdownSeconds <= 0) {
            stopCountdown();
            logoutUser();
        }
    }, 1000);
}

// Function to stop the countdown
function stopCountdown() {
    clearInterval(countdownTimer);
    isCountingDown = false;

    // Hide modal if it's open
    const autoLogoutModal = bootstrap.Modal.getInstance(document.getElementById('auto-logout-modal'));
    if (autoLogoutModal) {
        autoLogoutModal.hide();
    }
}

// Function to logout the user
function logoutUser() {
    // Stop any active timers
    clearTimeout(inactivityTimer);
    stopCountdown();

    // Call the logout API
    fetch('/api/logout')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Force redirect to login page even if API call fails
            window.location.href = '/';
        });
}

// List of events to track
const activityEvents = [
    'mousedown', 'mousemove', 'keypress',
    'scroll', 'touchstart', 'click', 'keydown'
];

// Track user activity
function trackActivity() {
    // Add event listeners for each activity
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });

    // Also reset on page load
    resetInactivityTimer();
}

// Remove activity tracking
function removeActivityTracking() {
    // Remove event listeners for each activity
    activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
    });

    // Clear any existing timers
    clearTimeout(inactivityTimer);
    stopCountdown();

    console.log('Activity tracking removed');
}

// Initialize auto-logout system
function initializeAutoLogout() {
    // Check if auto-logout is disabled
    if (!AUTO_LOGOUT_ENABLED) {
        console.log('Auto-logout system initialization skipped - feature is disabled');
        // Make sure to clean up any existing timers and event listeners
        clearTimeout(inactivityTimer);
        stopCountdown();
        removeActivityTracking();
        return;
    }

    // Check if already initialized
    if (document.querySelector('#auto-logout-modal')) {
        // Just reset the timer with new settings
        resetInactivityTimer();
        return;
    }

    createCountdownModal();
    trackActivity();
    console.log(`Auto-logout system initialized. Timeout set to ${INACTIVITY_TIMEOUT/1000} seconds.`);
}

// Function to update auto-logout settings in real-time
function updateAutoLogoutSettings(enabled, timeoutSeconds) {
    console.log(`Updating auto-logout settings in real-time: enabled=${enabled}, timeout=${timeoutSeconds}s`);

    // Convert enabled to boolean if it's a string
    if (typeof enabled === 'string') {
        enabled = enabled === 'true';
    }

    // Update global variables
    AUTO_LOGOUT_ENABLED = enabled;
    INACTIVITY_TIMEOUT = timeoutSeconds * 1000; // Convert to milliseconds
    countdownSeconds = timeoutSeconds;

    // Update localStorage
    localStorage.setItem('auto_logout_enabled', AUTO_LOGOUT_ENABLED);
    localStorage.setItem('auto_logout_timeout', INACTIVITY_TIMEOUT);

    console.log(`Updated auto-logout settings in localStorage: enabled=${AUTO_LOGOUT_ENABLED}, timeout=${INACTIVITY_TIMEOUT}ms`);

    // If countdown modal exists, update it
    const inactivityMessage = document.getElementById('inactivity-message');
    if (inactivityMessage) {
        const formattedTime = formatTimeDisplay(timeoutSeconds);
        inactivityMessage.textContent = `لم يتم تسجيل أي نشاط لمدة ${timeoutSeconds} ثانية (${formattedTime}).`;
    }

    // Reset the countdown timer if it's active
    if (isCountingDown) {
        stopCountdown();
    }

    // Reset the inactivity timer with new timeout
    clearTimeout(inactivityTimer);

    // If enabled, restart the timer
    if (AUTO_LOGOUT_ENABLED) {
        console.log('Auto-logout is enabled, initializing activity tracking...');
        // Make sure we have event listeners for activity tracking
        trackActivity();
        // Reset the timer
        resetInactivityTimer();
    } else {
        console.log('Auto-logout is disabled, removing all activity tracking...');
        // If disabled, remove tracking and clean up
        removeActivityTracking();
        // Make sure any modals are hidden
        stopCountdown();
        // Clear any existing timers
        clearTimeout(inactivityTimer);
    }

    console.log(`Auto-logout settings updated: enabled=${AUTO_LOGOUT_ENABLED}, timeout=${INACTIVITY_TIMEOUT}ms`);
}

// Make the function available globally
window.updateAutoLogoutSettings = updateAutoLogoutSettings;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on authenticated pages (not login page)
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        // First check localStorage for any settings updated in the current session
        checkLocalStorageSettings();

        // Then load settings from server
        loadAutoLogoutSettings();
    }
});
