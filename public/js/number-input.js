// JavaScript for custom number input controls in Firefox

document.addEventListener('DOMContentLoaded', function() {
    // Check if the browser is Firefox
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    
    if (isFirefox) {
        // Show custom controls for Firefox
        const numberControls = document.querySelectorAll('.number-controls');
        numberControls.forEach(control => {
            control.classList.remove('d-none');
        });
        
        // Add event listeners for custom controls
        setupNumberControls();
    }
});

function setupNumberControls() {
    // Get all number input containers
    const numberInputContainers = document.querySelectorAll('.number-input-container');
    
    numberInputContainers.forEach(container => {
        const input = container.querySelector('input[type="number"]');
        const upButton = container.querySelector('.number-control-up');
        const downButton = container.querySelector('.number-control-down');
        
        if (input && upButton && downButton) {
            // Add event listeners for up button
            upButton.addEventListener('click', function() {
                input.stepUp();
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            });
            
            // Add event listeners for down button
            downButton.addEventListener('click', function() {
                input.stepDown();
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            });
        }
    });
}
