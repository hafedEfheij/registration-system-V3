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
}

/**
 * Fix for modal close buttons not working properly
 */
function fixModalCloseButtons() {
    // Get all close buttons in modals
    const closeButtons = document.querySelectorAll('.modal .btn-close, .modal .btn[data-bs-dismiss="modal"]');
    
    closeButtons.forEach(button => {
        // Remove existing event listeners by cloning and replacing
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new event listener
        newButton.addEventListener('click', function(event) {
            event.preventDefault();
            const modal = this.closest('.modal');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                } else {
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
            }
        }
    });
}
