/**
 * Modal fixes to ensure proper closing of modals
 * This script addresses issues with modals not closing properly
 */

document.addEventListener('DOMContentLoaded', function() {
    // Fix for modal backdrop not being removed
    fixModalBackdropIssue();

    // Fix for modals not closing properly with close buttons
    fixModalCloseButtons();

    // Fix for modals not closing properly with ESC key
    fixModalEscapeKey();

    // Fix for modals not closing properly when clicking outside
    fixModalOutsideClick();

    // Fix for modals not being properly disposed
    fixModalDisposal();

    // Fix for specific modals that have issues
    fixSpecificModals();

    // Fix for nested modals
    fixNestedModals();

    // Add global modal cleanup function
    window.cleanupModals = cleanupAllModals;

    // Add event listener for page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // When page becomes visible again, check for lingering backdrops
            cleanupAllModals();
        }
    });
});

/**
 * Fix for modal backdrop not being removed when modal is closed
 */
function fixModalBackdropIssue() {
    // Listen for all modal hidden events
    document.addEventListener('hidden.bs.modal', function(event) {
        // Check if there are any open modals
        const openModals = document.querySelectorAll('.modal.show');
        if (openModals.length === 0) {
            // Remove any lingering backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.remove();
            });

            // Re-enable scrolling on body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    }, true);

    // Add a periodic check for lingering backdrops when no modals are open
    setInterval(() => {
        const openModals = document.querySelectorAll('.modal.show');
        if (openModals.length === 0) {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops.length > 0) {
                console.log('Cleaning up lingering backdrops:', backdrops.length);
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });

                // Re-enable scrolling on body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        }
    }, 1000); // Check every second

    // Add a mutation observer to detect when modals are removed from the DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                // Check if any of the removed nodes were modals
                for (let i = 0; i < mutation.removedNodes.length; i++) {
                    const node = mutation.removedNodes[i];
                    if (node.classList && node.classList.contains('modal')) {
                        // A modal was removed, clean up backdrops
                        const openModals = document.querySelectorAll('.modal.show');
                        if (openModals.length === 0) {
                            const backdrops = document.querySelectorAll('.modal-backdrop');
                            backdrops.forEach(backdrop => {
                                backdrop.remove();
                            });

                            // Re-enable scrolling on body
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                    }
                }
            }
        });
    });

    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Fix for modal close buttons not working properly
 */
function fixModalCloseButtons() {
    // Function to set up close button handlers
    function setupCloseButtonHandlers() {
        // Get all close buttons in modals
        const closeButtons = document.querySelectorAll('.modal .btn-close, .modal .btn[data-bs-dismiss="modal"]');

        closeButtons.forEach(button => {
            // Skip if already processed
            if (button.hasAttribute('data-modal-fix-applied')) {
                return;
            }

            // Mark as processed
            button.setAttribute('data-modal-fix-applied', 'true');

            // Remove existing event listeners by cloning and replacing
            const newButton = button.cloneNode(true);
            newButton.setAttribute('data-modal-fix-applied', 'true');
            button.parentNode.replaceChild(newButton, button);

            // Add new event listener
            newButton.addEventListener('click', function(event) {
                event.preventDefault();
                const modal = this.closest('.modal');
                if (modal) {
                    // Store the modal ID for debugging
                    const modalId = modal.id || 'unknown-modal';
                    console.log(`Close button clicked for modal: ${modalId}`);

                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) {
                        modalInstance.hide();

                        // Force cleanup after hiding
                        setTimeout(() => {
                            try {
                                // Try to dispose the modal instance
                                modalInstance.dispose();
                                console.log(`Modal disposed: ${modalId}`);
                            } catch (error) {
                                console.error(`Error disposing modal ${modalId}:`, error);
                            }

                            // Remove backdrop
                            const backdrops = document.querySelectorAll('.modal-backdrop');
                            if (backdrops.length > 0) {
                                console.log(`Removing ${backdrops.length} backdrops after closing ${modalId}`);
                                backdrops.forEach(backdrop => {
                                    backdrop.remove();
                                });
                            }

                            // Re-enable scrolling
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }, 300);
                    } else {
                        console.log(`No modal instance found for ${modalId}, using fallback`);
                        // Fallback if instance not found
                        modal.classList.remove('show');
                        modal.style.display = 'none';

                        // Remove backdrop
                        const backdrops = document.querySelectorAll('.modal-backdrop');
                        backdrops.forEach(backdrop => {
                            backdrop.remove();
                        });

                        // Re-enable scrolling
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';
                    }
                }
            });
        });
    }

    // Initial setup
    setupCloseButtonHandlers();

    // Set up a mutation observer to handle dynamically added buttons
    const observer = new MutationObserver((mutations) => {
        let shouldSetup = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any modals or buttons were added
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (node.classList.contains('modal') ||
                            node.querySelector('.modal, .btn-close, [data-bs-dismiss="modal"]'))) {
                            shouldSetup = true;
                            break;
                        }
                    }
                }
            }
        });

        if (shouldSetup) {
            setupCloseButtonHandlers();
        }
    });

    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Fix for modals not closing with ESC key
 */
function fixModalEscapeKey() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            if (openModals.length > 0) {
                // Get the topmost modal (last in the DOM)
                const topModal = openModals[openModals.length - 1];
                const modalInstance = bootstrap.Modal.getInstance(topModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        }
    });
}

/**
 * Fix for modals not closing when clicking outside
 */
function fixModalOutsideClick() {
    document.addEventListener('click', function(event) {
        // Check if click is directly on a modal (not on modal content)
        if (event.target.classList.contains('modal') && event.target.classList.contains('show')) {
            const modalInstance = bootstrap.Modal.getInstance(event.target);
            if (modalInstance) {
                modalInstance.hide();
            } else {
                // Fallback if instance not found
                event.target.classList.remove('show');
                event.target.style.display = 'none';

                // Remove backdrop
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });

                // Re-enable scrolling
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        }
    });
}

/**
 * Fix for modals not being properly disposed after closing
 */
function fixModalDisposal() {
    // Listen for all modal hidden events
    document.addEventListener('hidden.bs.modal', function(event) {
        // Get the modal that was just hidden
        const modal = event.target;

        // Get the modal instance
        const modalInstance = bootstrap.Modal.getInstance(modal);

        // Dispose the modal instance to free up memory and prevent issues
        if (modalInstance) {
            // Use setTimeout to ensure the modal is fully hidden before disposal
            setTimeout(() => {
                try {
                    modalInstance.dispose();
                    console.log('Modal disposed successfully:', modal.id);
                } catch (error) {
                    console.error('Error disposing modal:', error);
                }

                // Force clean up any remaining backdrops if no modals are open
                const openModals = document.querySelectorAll('.modal.show');
                if (openModals.length === 0) {
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => {
                        backdrop.remove();
                    });

                    // Re-enable scrolling
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            }, 300);
        }
    });

    // Also clean up when navigating away from the page
    window.addEventListener('beforeunload', function() {
        // Clean up all modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                try {
                    modalInstance.dispose();
                } catch (error) {
                    console.error('Error disposing modal on page unload:', error);
                }
            }
        });

        // Remove all backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });

        // Re-enable scrolling
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });
}

/**
 * Fix for specific modals that have issues
 */
function fixSpecificModals() {
    // Fix for filteredReportModal
    const filteredReportModal = document.getElementById('filteredReportModal');
    if (filteredReportModal) {
        // Add a specific event listener for the close button
        const closeButtons = filteredReportModal.querySelectorAll('.btn-close, .btn[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();

                // Get the modal instance
                const modalInstance = bootstrap.Modal.getInstance(filteredReportModal);
                if (modalInstance) {
                    modalInstance.hide();

                    // Force cleanup after hiding
                    setTimeout(() => {
                        try {
                            modalInstance.dispose();
                        } catch (error) {
                            console.error('Error disposing filteredReportModal:', error);
                        }

                        // Remove backdrop
                        const backdrops = document.querySelectorAll('.modal-backdrop');
                        backdrops.forEach(backdrop => {
                            backdrop.remove();
                        });

                        // Re-enable scrolling
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';
                    }, 300);
                } else {
                    // Fallback if instance not found
                    filteredReportModal.classList.remove('show');
                    filteredReportModal.style.display = 'none';

                    // Remove backdrop
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => {
                        backdrop.remove();
                    });

                    // Re-enable scrolling
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            });
        });

        // Also handle the hidden event specifically for this modal
        filteredReportModal.addEventListener('hidden.bs.modal', function() {
            // Force cleanup after the modal is hidden
            setTimeout(() => {
                // Remove backdrop
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });

                // Re-enable scrolling
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 300);
        });
    }

    // Add similar fixes for other problematic modals if needed
    const studentReportModal = document.getElementById('studentReportModal');
    if (studentReportModal) {
        studentReportModal.addEventListener('hidden.bs.modal', function() {
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 300);
        });
    }

    // Fix for courseGroupsModal
    const courseGroupsModal = document.getElementById('courseGroupsModal');
    if (courseGroupsModal) {
        courseGroupsModal.addEventListener('hidden.bs.modal', function() {
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';

                // Try to dispose the modal instance
                const modalInstance = bootstrap.Modal.getInstance(courseGroupsModal);
                if (modalInstance) {
                    try {
                        modalInstance.dispose();
                    } catch (error) {
                        console.error('Error disposing courseGroupsModal:', error);
                    }
                }
            }, 300);
        });
    }

    // Fix for groupStudentsModal
    const groupStudentsModal = document.getElementById('groupStudentsModal');
    if (groupStudentsModal) {
        groupStudentsModal.addEventListener('hidden.bs.modal', function() {
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';

                // Try to dispose the modal instance
                const modalInstance = bootstrap.Modal.getInstance(groupStudentsModal);
                if (modalInstance) {
                    try {
                        modalInstance.dispose();
                    } catch (error) {
                        console.error('Error disposing groupStudentsModal:', error);
                    }
                }
            }, 300);
        });
    }
}

/**
 * Fix for nested modals
 */
function fixNestedModals() {
    // Add event listener for modal show events
    document.addEventListener('show.bs.modal', function(event) {
        // Get the modal that is being shown
        const modal = event.target;

        // Check if there are other open modals
        const openModals = document.querySelectorAll('.modal.show');
        if (openModals.length > 0) {
            // There are already open modals, adjust z-index
            const highestZIndex = Array.from(openModals).reduce((highest, modalEl) => {
                const zIndex = parseInt(window.getComputedStyle(modalEl).zIndex, 10);
                return isNaN(zIndex) ? highest : Math.max(highest, zIndex);
            }, 1050); // Bootstrap default modal z-index is 1050

            // Set higher z-index for the new modal
            modal.style.zIndex = (highestZIndex + 10).toString();

            // Also adjust backdrop z-index after a short delay
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                const newBackdrop = backdrops[backdrops.length - 1];
                if (newBackdrop) {
                    newBackdrop.style.zIndex = (highestZIndex + 5).toString();
                }
            }, 10);
        }
    });

    // Fix for modals that are closed but still visible due to higher z-index modals
    document.addEventListener('hidden.bs.modal', function(event) {
        // Get the modal that was just hidden
        const modal = event.target;

        // Reset z-index
        modal.style.zIndex = '';

        // Check if there are other open modals
        const openModals = document.querySelectorAll('.modal.show');
        if (openModals.length > 0) {
            // Ensure body still has modal-open class
            document.body.classList.add('modal-open');
        }
    });
}

/**
 * Global function to clean up all modals and backdrops
 */
function cleanupAllModals() {
    console.log('Cleaning up all modals and backdrops');

    // Get all open modals
    const openModals = document.querySelectorAll('.modal.show');

    // Close all open modals
    openModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            try {
                modalInstance.hide();
                setTimeout(() => {
                    try {
                        modalInstance.dispose();
                    } catch (error) {
                        console.error('Error disposing modal:', error);
                    }
                }, 300);
            } catch (error) {
                console.error('Error hiding modal:', error);
                // Fallback
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        } else {
            // Fallback if instance not found
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    });

    // Remove all backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });

    // Re-enable scrolling if no modals are open
    if (document.querySelectorAll('.modal.show').length === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    return {
        modalsCleanedUp: openModals.length,
        backdropsRemoved: backdrops.length
    };
}
