// Responsive functionality for course statistics page

document.addEventListener('DOMContentLoaded', function() {
    // Setup responsive sidebar
    setupResponsiveSidebar();

    // Add responsive classes to dynamically created elements
    setupResponsiveObserver();

    // Handle window resize events
    window.addEventListener('resize', adjustTableResponsiveness);

    // Initial adjustment
    adjustTableResponsiveness();
});

/**
 * Setup responsive sidebar functionality
 */
function setupResponsiveSidebar() {
    // Check if we're on a page with a sidebar
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Add main-content-wrapper class to the main content
    const mainContent = document.querySelector('.col-md-9, .col-lg-10');
    if (mainContent && !mainContent.closest('.main-content-wrapper')) {
        mainContent.classList.add('main-content-wrapper');
    }

    // Create sidebar toggle button if it doesn't exist
    if (!document.querySelector('.sidebar-toggle')) {
        const toggleButton = document.createElement('div');
        toggleButton.className = 'sidebar-toggle d-md-none';
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(toggleButton);

        // Add click event to toggle sidebar
        toggleButton.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            toggleOverlay();
        });
    }

    // Create overlay for mobile if it doesn't exist
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        // Add click event to close sidebar when overlay is clicked
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }

    // Function to toggle overlay
    function toggleOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar.classList.contains('show')) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    // Close sidebar when clicking outside of it
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggleButton = event.target.closest('.sidebar-toggle');

        if (!isClickInsideSidebar && !isClickOnToggleButton && sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
            document.querySelector('.sidebar-overlay').classList.remove('show');
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
            document.querySelector('.sidebar-overlay').classList.remove('show');
        }
    });
}

// Setup mutation observer to watch for dynamically added content
function setupResponsiveObserver() {
    // Create a new observer
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Check if course stats table was populated
                if (mutation.target.id === 'course-stats-table-body') {
                    makeStatsTableResponsive();
                }

                // Check if student table in modal was populated
                if (mutation.target.id === 'course-students-table-body') {
                    makeStudentTableResponsive();
                }
            }
        });
    });

    // Start observing the tables
    const statsTableBody = document.getElementById('course-stats-table-body');
    const studentsTableBody = document.getElementById('course-students-table-body');

    if (statsTableBody) {
        observer.observe(statsTableBody, { childList: true });
    }

    if (studentsTableBody) {
        observer.observe(studentsTableBody, { childList: true });
    }
}

// Make the course stats table responsive
function makeStatsTableResponsive() {
    const rows = document.querySelectorAll('#course-stats-table-body tr');

    rows.forEach(row => {
        // Add responsive classes to cells
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) { // Updated to match the new structure with 8 cells
            // Department column (index 2)
            cells[2].classList.add('d-none', 'd-md-table-cell');

            // Semester column (index 3)
            cells[3].classList.add('d-none', 'd-lg-table-cell');

            // Max students column (index 5)
            cells[5].classList.add('d-none', 'd-sm-table-cell');

            // Make percentage display RTL-friendly and ensure it's centered
            if (cells[6]) {
                cells[6].classList.add('text-center');
                const percentText = cells[6].textContent;
                if (percentText && percentText.includes('%')) {
                    // Extract the number and format it correctly
                    const numberPart = percentText.replace('%', '').trim();
                    cells[6].innerHTML = `<span class="percentage-badge">${numberPart}<span class="percent-sign">%</span></span>`;
                }
            }

            // Make action buttons responsive and ensure they're centered
            if (cells[7]) {
                cells[7].classList.add('text-center');
                const actionButtons = cells[7].querySelectorAll('.btn');
                if (actionButtons.length > 0) {
                    // Add responsive classes to buttons
                    actionButtons.forEach(btn => {
                        // Hide text on small screens, show only icons
                        const buttonText = btn.textContent.trim();
                        const buttonIcon = btn.querySelector('i');
                        if (buttonText && buttonIcon) {
                            btn.innerHTML = buttonIcon.outerHTML + ` <span class="d-none d-md-inline">${buttonText}</span>`;
                        }
                    });
                }
            }
        }
    });
}

// Make the student table in modal responsive
function makeStudentTableResponsive() {
    const rows = document.querySelectorAll('#course-students-table-body tr');

    rows.forEach(row => {
        // Add responsive classes to cells
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            // Index column (0)
            cells[0].classList.add('d-none', 'd-sm-table-cell');

            // Registration number column (3)
            cells[3].classList.add('d-none', 'd-md-table-cell');

            // Department column (4)
            cells[4].classList.add('d-none', 'd-lg-table-cell');

            // Date column (5)
            cells[5].classList.add('d-none', 'd-sm-table-cell');
        }
    });
}

// Adjust table responsiveness based on screen size
function adjustTableResponsiveness() {
    // Apply responsive classes to existing tables
    makeStatsTableResponsive();
    makeStudentTableResponsive();

    // Adjust card heights for consistent appearance
    const statCards = document.querySelectorAll('.card');
    statCards.forEach(card => {
        if (window.innerWidth < 768) {
            // On mobile, let cards take natural height
            card.style.height = 'auto';
        } else {
            // On desktop, reset to 100%
            card.style.height = '100%';
        }
    });
}
