/**
 * Global responsive functionality for all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Setup responsive sidebar
    setupResponsiveSidebar();

    // Setup responsive tables
    setupResponsiveTables();

    // Handle window resize events
    window.addEventListener('resize', handleWindowResize);

    // Initial adjustment
    handleWindowResize();
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

/**
 * Setup responsive tables
 */
function setupResponsiveTables() {
    // Add responsive classes to all tables
    document.querySelectorAll('table').forEach(table => {
        // Wrap table in responsive container if not already wrapped
        if (!table.closest('.table-responsive') && !table.closest('.table-responsive-stack')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

/**
 * Handle window resize events
 */
function handleWindowResize() {
    const width = window.innerWidth;

    // Adjust elements based on screen size
    if (width < 768) {
        // Mobile view adjustments
        document.querySelectorAll('.btn-group').forEach(btnGroup => {
            btnGroup.classList.add('d-flex', 'flex-column');
        });

        // Adjust card heights for consistent appearance
        document.querySelectorAll('.card').forEach(card => {
            card.style.height = 'auto';
        });
    } else {
        // Desktop view adjustments
        document.querySelectorAll('.btn-group').forEach(btnGroup => {
            btnGroup.classList.remove('d-flex', 'flex-column');
        });

        // Reset card heights
        document.querySelectorAll('.card-deck .card').forEach(card => {
            card.style.height = '100%';
        });
    }
}

/**
 * Make tables responsive by adding appropriate classes to cells
 * @param {string} tableId - The ID of the table to make responsive
 * @param {Object} options - Configuration options for responsive behavior
 */
function makeTableResponsive(tableId, options = {}) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const defaultOptions = {
        hideColumnsOnMobile: [], // Array of column indices to hide on mobile
        hideColumnsOnTablet: [], // Array of column indices to hide on tablet
        alwaysVisibleColumns: [] // Array of column indices that should always be visible
    };

    const config = { ...defaultOptions, ...options };

    // Add responsive classes to table headers
    const headers = table.querySelectorAll('thead th');
    headers.forEach((header, index) => {
        if (config.hideColumnsOnMobile.includes(index) && !config.alwaysVisibleColumns.includes(index)) {
            header.classList.add('d-none', 'd-md-table-cell');
        }

        if (config.hideColumnsOnTablet.includes(index) && !config.alwaysVisibleColumns.includes(index)) {
            header.classList.add('d-none', 'd-lg-table-cell');
        }
    });

    // Add responsive classes to table cells
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            if (config.hideColumnsOnMobile.includes(index) && !config.alwaysVisibleColumns.includes(index)) {
                cell.classList.add('d-none', 'd-md-table-cell');
            }

            if (config.hideColumnsOnTablet.includes(index) && !config.alwaysVisibleColumns.includes(index)) {
                cell.classList.add('d-none', 'd-lg-table-cell');
            }
        });
    });
}

/**
 * Format percentage display to be RTL-friendly
 * @param {string} selector - CSS selector for elements containing percentage values
 */
function formatPercentages(selector) {
    document.querySelectorAll(selector).forEach(element => {
        const text = element.textContent;
        if (text && text.includes('%')) {
            element.innerHTML = `<span class="percentage-badge">${text}</span>`;
        }
    });
}
