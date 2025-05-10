// Responsive functionality for courses and students tables

document.addEventListener('DOMContentLoaded', function() {
    // Setup responsive tables
    setupResponsiveTables();

    // Add responsive classes to dynamically created elements
    setupResponsiveObserver();

    // Handle window resize events
    window.addEventListener('resize', adjustTableResponsiveness);

    // Initial adjustment
    adjustTableResponsiveness();
});

/**
 * Setup responsive tables functionality
 */
function setupResponsiveTables() {
    // Convert regular table-responsive to table-responsive-stack
    const regularTables = document.querySelectorAll('.table-responsive');
    regularTables.forEach(tableContainer => {
        tableContainer.classList.remove('table-responsive');
        tableContainer.classList.add('table-responsive-stack');
    });
}

// Setup mutation observer to watch for dynamically added content
function setupResponsiveObserver() {
    // Create a new observer
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Check if courses table was populated
                if (mutation.target.id === 'courses-table-body') {
                    makeCoursesTableResponsive();
                }

                // Check if students table was populated
                if (mutation.target.id === 'students-table-body') {
                    makeStudentsTableResponsive();
                }
            }
        });
    });

    // Start observing the tables
    const coursesTableBody = document.getElementById('courses-table-body');
    const studentsTableBody = document.getElementById('students-table-body');

    if (coursesTableBody) {
        observer.observe(coursesTableBody, { childList: true });
    }

    if (studentsTableBody) {
        observer.observe(studentsTableBody, { childList: true });
    }
}

// Make the courses table responsive
function makeCoursesTableResponsive() {
    // First, update the table headers
    const coursesTable = document.querySelector('#courses-table-body').closest('table');
    if (coursesTable) {
        const headers = coursesTable.querySelectorAll('thead th');
        if (headers.length >= 6) {
            // Department column (index 2)
            headers[2].classList.add('d-none', 'd-md-table-cell');
            
            // Semester column (index 3)
            headers[3].classList.add('d-none', 'd-md-table-cell');
            
            // Max students column (index 4)
            headers[4].classList.add('d-none', 'd-sm-table-cell');
        }
    }

    // Then update the table rows
    const rows = document.querySelectorAll('#courses-table-body tr');
    rows.forEach(row => {
        // Add responsive classes to cells
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            // Department column (index 2)
            cells[2].classList.add('d-none', 'd-md-table-cell');
            
            // Semester column (index 3)
            cells[3].classList.add('d-none', 'd-md-table-cell');
            
            // Max students column (index 4)
            cells[4].classList.add('d-none', 'd-sm-table-cell');

            // Make action buttons responsive
            if (cells[5]) {
                const actionButtons = cells[5].querySelectorAll('.btn');
                if (actionButtons.length > 0) {
                    // Add responsive classes to buttons
                    actionButtons.forEach(btn => {
                        // Hide text on small screens, show only icons
                        const buttonText = btn.querySelector('.d-none');
                        if (!buttonText) {
                            const buttonIcon = btn.querySelector('i');
                            const textContent = btn.textContent.trim();
                            if (buttonIcon && textContent) {
                                btn.innerHTML = buttonIcon.outerHTML + ` <span class="d-none d-md-inline">${textContent}</span>`;
                            }
                        }
                    });
                }
            }
        }
    });
}

// Make the students table responsive
function makeStudentsTableResponsive() {
    // First, update the table headers
    const studentsTable = document.querySelector('#students-table-body').closest('table');
    if (studentsTable) {
        const headers = studentsTable.querySelectorAll('thead th');
        if (headers.length >= 6) {
            // Department column (index 2)
            headers[2].classList.add('d-none', 'd-md-table-cell');
            
            // Semester column (index 3)
            headers[3].classList.add('d-none', 'd-md-table-cell');
            
            // Registration number column (index 4)
            headers[4].classList.add('d-none', 'd-sm-table-cell');
        }
    }

    // Then update the table rows
    const rows = document.querySelectorAll('#students-table-body tr');
    rows.forEach(row => {
        // Add responsive classes to cells
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            // Department column (index 2)
            cells[2].classList.add('d-none', 'd-md-table-cell');
            
            // Semester column (index 3)
            cells[3].classList.add('d-none', 'd-md-table-cell');
            
            // Registration number column (index 4)
            cells[4].classList.add('d-none', 'd-sm-table-cell');

            // Make action buttons responsive
            if (cells[5]) {
                const actionButtons = cells[5].querySelectorAll('.btn');
                if (actionButtons.length > 0) {
                    // Add responsive classes to buttons
                    actionButtons.forEach(btn => {
                        // Hide text on small screens, show only icons
                        const buttonText = btn.querySelector('.d-none');
                        if (!buttonText) {
                            const buttonIcon = btn.querySelector('i');
                            const textContent = btn.textContent.trim();
                            if (buttonIcon && textContent) {
                                btn.innerHTML = buttonIcon.outerHTML + ` <span class="d-none d-md-inline">${textContent}</span>`;
                            }
                        }
                    });
                }
            }
        }
    });
}

// Adjust table responsiveness based on screen size
function adjustTableResponsiveness() {
    // Apply responsive classes to existing tables
    makeCoursesTableResponsive();
    makeStudentsTableResponsive();
}
