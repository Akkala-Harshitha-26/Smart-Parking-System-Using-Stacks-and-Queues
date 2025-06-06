/* script.js */

// DOM Elements
const messageArea = document.getElementById('message-area');
const messageContainer = document.getElementById('message-container');
const carPreview = document.getElementById('car-preview');
const carIdInput = document.getElementById('car-id-input');
const colorOptions = document.querySelectorAll('.color-option');
const previewId = document.getElementById('preview-id');
const totalParkedEl = document.getElementById('total-parked');
const stackOccupiedEl = document.getElementById('stack-occupied');
const queueOccupiedEl = document.getElementById('queue-occupied');
const stackTotalEl = document.getElementById('stack-total');
const queueTotalEl = document.getElementById('queue-total');
const removeStackBtn = document.getElementById('remove-stack-btn');
const removeQueueBtn = document.getElementById('remove-queue-btn');

// State
let currentColor = '#3498db'; // Default color
let isDragging = false;
let draggedElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let parkingState = {
    stack: [],
    queue: [],
    max_spots: 10,
    max_spots_per_row: 5,
    stack_count: 0,
    queue_count: 0,
    total_count: 0
};

// Constants
const DEFAULT_MAX_SPOTS = 10;
const DEFAULT_MAX_SPOTS_PER_ROW = 5;
const ANIMATION_DURATION = 500;
const BASE_URL = 'http://127.0.0.1:5000';

// Check if GSAP is loaded
const isGsapLoaded = typeof gsap !== 'undefined';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Create empty spots first to ensure drag targets exist
    createEmptySpots();
    initApp();
    
    // Add clear all button
    addClearAllButton();
});

function initApp() {
    // Initialize UI
    setupEventListeners();
    updateCarPreview();
    
    if (colorOptions.length > 0) {
        colorOptions[0].classList.add('active');
    }
    
    // Load initial parking state
    updateParkingState();

    // Add intro animation if GSAP is available
    if (isGsapLoaded) {
        try {
            gsap.from('.app-container', { 
                duration: 0.8, 
                opacity: 0, 
                y: 20, 
                ease: 'power3.out' 
            });
            
            gsap.from('.stat-card', { 
                duration: 0.5, 
                opacity: 0, 
                y: 20, 
                stagger: 0.1,
                delay: 0.3,
                ease: 'back.out(1.7)'
            });
        } catch (error) {
            console.error('GSAP animation error:', error);
        }
    } else {
        console.warn('GSAP not loaded. Animations disabled.');
        document.querySelector('.app-container').style.opacity = 1;
    }
}

// Add Clear All Button
function addClearAllButton() {
    // Create a clear all button
    const clearAllBtn = document.createElement('button');
    clearAllBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All';
    clearAllBtn.className = 'clear-all-btn';
    clearAllBtn.addEventListener('click', clearAll);
    
    // Add it to the dashboard header
    const dashboardEl = document.querySelector('.dashboard');
    if (dashboardEl) {
        const headerEl = document.createElement('div');
        headerEl.className = 'dashboard-header';
        headerEl.appendChild(clearAllBtn);
        dashboardEl.insertBefore(headerEl, dashboardEl.firstChild);
    }
}

// Event Listeners
function setupEventListeners() {
    // Car ID Input
    if (carIdInput) {
        carIdInput.addEventListener('input', updateCarPreview);
    }
    
    // Color Options
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentColor = option.dataset.color;
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            updateCarPreview();
        });
    });
    

    // Remove Buttons
    if (removeStackBtn) {
        removeStackBtn.addEventListener('click', removeStack);
    }
    
    if (removeQueueBtn) {
        removeQueueBtn.addEventListener('click', removeQueue);
    }
    
    // Drag and Drop
    setupDragAndDrop();
}

// Create empty spots to ensure drag targets exist
function createEmptySpots() {
    const stackSpotsDiv = document.getElementById('stack-spots');
    const queueSpotsDiv = document.getElementById('queue-spots');

    if (!stackSpotsDiv || !queueSpotsDiv) return;
    
    // Clear existing spots
    stackSpotsDiv.innerHTML = '';
    queueSpotsDiv.innerHTML = '';

    // Create initial empty spots
    for (let i = 0; i < DEFAULT_MAX_SPOTS; i++) {
        const stackSpot = createEmptySpot(i);
        const queueSpot = createEmptySpot(i);
        
        stackSpotsDiv.appendChild(stackSpot);
        queueSpotsDiv.appendChild(queueSpot);
    }
}

function createEmptySpot(index) {
    const spotElement = document.createElement('div');
    spotElement.className = 'spot empty';
    spotElement.dataset.index = index;
    
    const iconElement = document.createElement('i');
    iconElement.className = 'fas fa-square';
    iconElement.style.opacity = '0.3';
    spotElement.appendChild(iconElement);
    
    // Add parking indicator
    const indicatorElement = document.createElement('div');
    indicatorElement.className = 'parking-indicator';
    spotElement.appendChild(indicatorElement);
    
    return spotElement;
}

// Drag and Drop Functionality
function setupDragAndDrop() {
    // Make car preview draggable
    if (carPreview) {
        carPreview.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        
        // Touch support
        carPreview.addEventListener('touchstart', startDragTouch, { passive: false });
        document.addEventListener('touchmove', dragTouch, { passive: false });
        document.addEventListener('touchend', endDragTouch);
    }
}

function startDrag(e) {
    try {
        e.preventDefault();
        isDragging = true;
        
        // Create a clone of the car preview for dragging
        const rect = carPreview.getBoundingClientRect();
        draggedElement = carPreview.cloneNode(true);
        draggedElement.classList.add('car-animation', 'dragging');
        draggedElement.style.width = `${rect.width}px`;
        draggedElement.style.height = `${rect.height}px`;
        
        // Calculate offset
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        // Position the clone
        draggedElement.style.position = 'fixed';
        draggedElement.style.left = `${rect.left}px`;
        draggedElement.style.top = `${rect.top}px`;
        
        // Add to DOM
        document.body.appendChild(draggedElement);
        
        // Animation with fallback
        if (isGsapLoaded) {
            try {
                gsap.to(draggedElement, { 
                    duration: 0.2, 
                    scale: 0.8,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                    ease: 'power2.out'
                });
            } catch (error) {
                console.error('GSAP animation error:', error);
                // Fallback
                draggedElement.style.transform = 'scale(0.8)';
                draggedElement.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            }
        } else {
            // CSS fallback
            draggedElement.style.transform = 'scale(0.8)';
            draggedElement.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
        }
    } catch (error) {
        console.error('Error in startDrag:', error);
        resetDragState();
    }
}

function drag(e) {
    try {
        if (!isDragging || !draggedElement) return;
        
        // Update position
        draggedElement.style.left = `${e.clientX - dragOffsetX}px`;
        draggedElement.style.top = `${e.clientY - dragOffsetY}px`;
        
        // Check for drop zones
        checkDropZones(e.clientX, e.clientY);
    } catch (error) {
        console.error('Error in drag:', error);
        resetDragState();
    }
}

function endDrag() {
    try {
        if (!isDragging) return;
        isDragging = false;
        
        // Check if we're over a drop zone
        const dropZone = document.querySelector('.spot.drop-hover');
        if (dropZone && draggedElement) {
            const isStack = dropZone.closest('.stack-section') !== null;
            const carId = carIdInput ? (carIdInput.value || 'Car') : 'Car';
            
            // Animate to drop zone
            const dropRect = dropZone.getBoundingClientRect();
            
            if (isGsapLoaded) {
                try {
                    gsap.to(draggedElement, {
                        duration: 0.3,
                        left: dropRect.left + (dropRect.width / 2) - (draggedElement.offsetWidth / 2),
                        top: dropRect.top + (dropRect.height / 2) - (draggedElement.offsetHeight / 2),
                        scale: 0.5,
                        opacity: 0,
                        onComplete: () => finalizeDrop(isStack, carId)
                    });
                } catch (error) {
                    console.error('GSAP animation error:', error);
                    // Fallback: immediately finalize
                    finalizeDrop(isStack, carId);
                }
            } else {
                // Simple CSS transition fallback
                draggedElement.style.transition = 'all 0.3s ease';
                draggedElement.style.left = `${dropRect.left + (dropRect.width / 2) - (draggedElement.offsetWidth / 2)}px`;
                draggedElement.style.top = `${dropRect.top + (dropRect.height / 2) - (draggedElement.offsetHeight / 2)}px`;
                draggedElement.style.transform = 'scale(0.5)';
                draggedElement.style.opacity = '0';
                
                setTimeout(() => {
                    finalizeDrop(isStack, carId);
                }, 300);
            }
        } else {
            returnDraggedToOrigin();
        }
    } catch (error) {
        console.error('Error in endDrag:', error);
        resetDragState();
    }
}

function finalizeDrop(isStack, carId) {
    // Remove dragged element
    if (draggedElement) {
        draggedElement.remove();
        draggedElement = null;
    }
    
    // Park the car
    if (isStack) {
        parkStack(carId);
    } else {
        parkQueue(carId);
    }
    
    // Remove drop-hover class from all spots
    document.querySelectorAll('.spot.drop-hover').forEach(spot => {
        spot.classList.remove('drop-hover');
    });
}

function returnDraggedToOrigin() {
    if (!draggedElement || !carPreview) {
        resetDragState();
        return;
    }
    
    if (isGsapLoaded) {
        try {
            gsap.to(draggedElement, {
                duration: 0.5,
                left: carPreview.getBoundingClientRect().left,
                top: carPreview.getBoundingClientRect().top,
                scale: 1,
                opacity: 0,
                ease: 'elastic.out(1, 0.5)',
                onComplete: resetDragState
            });
        } catch (error) {
            console.error('GSAP animation error:', error);
            resetDragState();
        }
    } else {
        // CSS fallback
        draggedElement.style.transition = 'all 0.5s ease';
        draggedElement.style.left = `${carPreview.getBoundingClientRect().left}px`;
        draggedElement.style.top = `${carPreview.getBoundingClientRect().top}px`;
        draggedElement.style.transform = 'scale(1)';
        draggedElement.style.opacity = '0';
        
        setTimeout(resetDragState, 500);
    }
}

function resetDragState() {
    isDragging = false;
    if (draggedElement) {
        draggedElement.remove();
        draggedElement = null;
    }
    document.querySelectorAll('.spot.drop-hover').forEach(spot => {
        spot.classList.remove('drop-hover');
    });
}

// Touch event handlers
function startDragTouch(e) {
    try {
        e.preventDefault(); // Prevent scrolling while dragging
        if (!e.touches || !e.touches[0]) return;
        
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        startDrag(mouseEvent);
    } catch (error) {
        console.error('Error in startDragTouch:', error);
        resetDragState();
    }
}

function dragTouch(e) {
    try {
        e.preventDefault(); // Prevent scrolling while dragging
        if (!isDragging || !e.touches || !e.touches[0]) return;
        
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        drag(mouseEvent);
    } catch (error) {
        console.error('Error in dragTouch:', error);
        resetDragState();
    }
}

function endDragTouch() {
    endDrag();
}

function checkDropZones(x, y) {
    // Remove drop-hover class from all spots
    document.querySelectorAll('.spot.drop-hover').forEach(spot => {
        spot.classList.remove('drop-hover');
    });
    
    // Get all empty spots
    const emptySpots = document.querySelectorAll('.spot.empty');
    
    // Check if we're over an empty spot
    for (const spot of emptySpots) {
        const rect = spot.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            spot.classList.add('drop-hover');
            break;
        }
    }
}

// UI Updates
function updateCarPreview() {
    if (!carPreview || !previewId) return;
    
    previewId.textContent = carIdInput ? (carIdInput.value || 'CAR-123') : 'CAR-123';
    carPreview.style.backgroundColor = currentColor;
    
    // Update text color based on background color brightness
    const brightness = getBrightness(currentColor);
    previewId.style.color = brightness > 128 ? '#333' : '#fff';
    
    // Update icon color
    const carIcon = carPreview.querySelector('i');
    if (carIcon) {
        carIcon.style.color = brightness > 128 ? '#333' : '#fff';
    }
}

function getBrightness(hexColor) {
    try {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate brightness
        return (r * 299 + g * 587 + b * 114) / 1000;
    } catch (e) {
        console.error('Error calculating brightness:', e);
        return 128; // Default to middle brightness
    }
}



// API Interactions
function updateParkingState() {
    fetch(`${BASE_URL}/state`, { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            parkingState = data;
            updateSpots();
            updateStats();
        })
        .catch(error => {
            console.error('Error fetching state:', error);
            displayMessage('Could not connect to the server. Please make sure the server is running.', true);
        });
}

function parkStack(carId = null) {
    try {
        if (!carId && carIdInput) {
            carId = carIdInput.value.trim() || 'Car-' + Math.floor(Math.random() * 1000);
        } else if (!carId) {
            carId = 'Car-' + Math.floor(Math.random() * 1000);
        }
        
        // Send car with current color
        handleBackendRequest('park_stack', { 
            car_id: carId,
            color: currentColor,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error in parkStack:', error);
        displayMessage(`Error parking in stack: ${error.message}`, true);
    }
}

function parkQueue(carId = null) {
    try {
        if (!carId && carIdInput) {
            carId = carIdInput.value.trim() || 'Car-' + Math.floor(Math.random() * 1000);
        } else if (!carId) {
            carId = 'Car-' + Math.floor(Math.random() * 1000);
        }
        
        // Send car with current color
        handleBackendRequest('park_queue', { 
            car_id: carId,
            color: currentColor,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error in parkQueue:', error);
        displayMessage(`Error parking in queue: ${error.message}`, true);
    }
}

function removeStack() {
    if (parkingState.stack.filter(Boolean).length === 0) {
        displayMessage('No cars in stack section', true);
        return;
    }
    
    // Animate the removal
    const stackSpots = document.querySelectorAll('#stack-spots .spot');
    const lastOccupiedIndex = [...stackSpots].findIndex(spot => spot.classList.contains('occupied'));
    
    if (lastOccupiedIndex !== -1) {
        const spot = stackSpots[lastOccupiedIndex];
        animateCarExit(spot, () => {
            handleBackendRequest('remove_stack');
        });
    } else {
        handleBackendRequest('remove_stack');
    }
}

function removeQueue() {
    if (parkingState.queue.filter(Boolean).length === 0) {
        displayMessage('No cars in queue section', true);
        return;
    }
    
    // Animate the removal
    const queueSpots = document.querySelectorAll('#queue-spots .spot');
    const firstOccupiedIndex = [...queueSpots].findIndex(spot => spot.classList.contains('occupied'));
    
    if (firstOccupiedIndex !== -1) {
        const spot = queueSpots[firstOccupiedIndex];
        animateCarExit(spot, () => {
            handleBackendRequest('remove_queue');
        });
    } else {
        handleBackendRequest('remove_queue');
    }
}

function animateCarExit(spot, callback) {
    // Create a clone for animation
    const clone = spot.cloneNode(true);
    clone.style.position = 'absolute';
    const rect = spot.getBoundingClientRect();
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.zIndex = '1000';
    document.body.appendChild(clone);
    
    // Animate exit
    gsap.to(clone, {
        duration: 0.5,
        x: window.innerWidth,
        rotation: 10,
        ease: 'power2.in',
        onComplete: () => {
            clone.remove();
            if (callback) callback();
        }
    });
}

function handleBackendRequest(endpoint, data = null) {
    try {
        // Show loading state
        displayMessage('Processing...', false);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors' // Explicitly set CORS mode
        };
        
        if (data) {
            options.body = JSON.stringify(data);
            console.log(`Sending to ${endpoint}:`, data); // Debug log
        }
        
        fetch(`${BASE_URL}/${endpoint}`, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
        .then(data => {
                console.log(`Received from ${endpoint}:`, data); // Debug log
            if (data.error) {
                    displayMessage(data.error, true);
            } else {
                    parkingState = data;
                updateSpots();
                    updateStats();
                displayMessage('Success!', false);
            }
        })
        .catch(error => {
            console.error('Error during fetch operation:', error);
                displayMessage(`Communication error: ${error.message}`, true);
            });
    } catch (error) {
        console.error('Error in handleBackendRequest:', error);
        displayMessage(`Request error: ${error.message}`, true);
    }
}

// UI Rendering
function updateSpots() {
    const stackSpotsDiv = document.getElementById('stack-spots');
    const queueSpotsDiv = document.getElementById('queue-spots');
    
    if (!stackSpotsDiv || !queueSpotsDiv || !parkingState.stack || !parkingState.queue) {
        console.error('Missing elements or parking state for updating spots');
        return;
    }
    
    // Clear existing spots
    stackSpotsDiv.innerHTML = '';
    queueSpotsDiv.innerHTML = '';
    
    // Create spots with improved styling
    createSpotRows(stackSpotsDiv, parkingState.stack, 'stack');
    createSpotRows(queueSpotsDiv, parkingState.queue, 'queue');
}

// Create rows of spots to improve visualization
function createSpotRows(container, spots, type) {
    const maxSpotsPerRow = parkingState.max_spots_per_row || DEFAULT_MAX_SPOTS_PER_ROW;
    
    // Create spot elements
    spots.forEach((car, index) => {
        const spotElement = createSpotElement(car, index, type);
        container.appendChild(spotElement);
    });
}

// Create an individual spot element with better styling
function createSpotElement(car, index, type) {
    const spotElement = document.createElement('div');
    spotElement.dataset.index = index;
    
    if (car) {
        // Occupied spot
        spotElement.className = 'spot occupied';
        spotElement.style.backgroundColor = car.color || '#3498db';
        
        // Car icon
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-car';
        spotElement.appendChild(iconElement);
        
        // Car ID
        const idElement = document.createElement('span');
        idElement.textContent = car.id;
        spotElement.appendChild(idElement);
    } else {
        // Empty spot
        spotElement.className = 'spot empty';
        
        // Cross icon
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-square';
        iconElement.style.opacity = '0.3';
        spotElement.appendChild(iconElement);
        
        // Add parking indicator
        const indicatorElement = document.createElement('div');
        indicatorElement.className = 'parking-indicator';
        spotElement.appendChild(indicatorElement);
        
        // Add drop event handling for empty spots
        spotElement.addEventListener('mouseenter', () => {
            if (isDragging && draggedElement) {
                spotElement.classList.add('drop-hover');
            }
        });
        
        spotElement.addEventListener('mouseleave', () => {
            spotElement.classList.remove('drop-hover');
        });
    }
    
    return spotElement;
}

function updateStats() {
    const stackOccupied = parkingState.stack.filter(Boolean).length;
    const queueOccupied = parkingState.queue.filter(Boolean).length;
    const totalParked = stackOccupied + queueOccupied;
    
    // Update stats
    totalParkedEl.textContent = totalParked;
    stackOccupiedEl.textContent = stackOccupied;
    queueOccupiedEl.textContent = queueOccupied;
    stackTotalEl.textContent = DEFAULT_MAX_SPOTS;
    queueTotalEl.textContent = DEFAULT_MAX_SPOTS;
    
    // Animate stats if they changed
    if (totalParked > 0) {
        gsap.from([totalParkedEl, stackOccupiedEl, queueOccupiedEl], {
            duration: 0.5,
            scale: 1.2,
            ease: 'elastic.out(1, 0.5)'
        });
    }
}

function displayMessage(message, isError = true) {
    if (!messageArea) return;
    
    messageArea.textContent = message;
    messageArea.className = isError ? 'error' : 'success';
    messageArea.classList.remove('hidden');
    
    // Animation
    if (isGsapLoaded) {
        try {
            gsap.fromTo(messageArea, 
                { y: 20, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                gsap.to(messageArea, { 
                    y: 20, 
                    opacity: 0, 
                    duration: 0.3, 
                    ease: 'power2.in',
                    onComplete: () => {
                        messageArea.classList.add('hidden');
                    }
                });
            }, 3000);
        } catch (error) {
            console.error('GSAP animation error:', error);
            // CSS fallback
            messageArea.style.transform = 'translateY(0)';
            messageArea.style.opacity = '1';
            
            setTimeout(() => {
                messageArea.style.transform = 'translateY(20px)';
                messageArea.style.opacity = '0';
                setTimeout(() => {
                    messageArea.classList.add('hidden');
                }, 300);
            }, 3000);
        }
    } else {
        // CSS fallback
        messageArea.style.transition = 'all 0.3s ease';
        messageArea.style.transform = 'translateY(0)';
        messageArea.style.opacity = '1';
        
        setTimeout(() => {
            messageArea.style.transform = 'translateY(20px)';
            messageArea.style.opacity = '0';
            setTimeout(() => {
                messageArea.classList.add('hidden');
            }, 300);
        }, 3000);
    }
}

function clearAll() {
    try {
        if (confirm('Are you sure you want to clear all parked cars?')) {
            handleBackendRequest('clear_all');
        }
    } catch (error) {
        console.error('Error in clearAll:', error);
        displayMessage(`Error clearing parking: ${error.message}`, true);
    }
}