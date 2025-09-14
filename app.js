// Application state
let canteens = [];
let currentCanteenId = null;

// DOM elements
const addCanteenForm = document.getElementById('add-canteen-form');
const ratingForm = document.getElementById('rating-form');
const canteensList = document.getElementById('canteens-list');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const ratingModal = document.getElementById('rating-modal');
const modalCanteenInfo = document.getElementById('modal-canteen-info');
const closeModal = document.querySelector('.close');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // Wait for Firebase to be ready (or fail)
    if (window.firebaseReady !== undefined) {
        initializeApp();
    } else {
        window.addEventListener('firebaseReady', initializeApp);
    }
});

function initializeApp() {
    loadCanteens();
}

// Setup event listeners
function setupEventListeners() {
    // Add canteen form
    addCanteenForm.addEventListener('submit', handleAddCanteen);
    
    // Rating form
    ratingForm.addEventListener('submit', handleSubmitRating);
    
    // Search and sort
    searchInput.addEventListener('input', filterAndSortCanteens);
    sortSelect.addEventListener('change', filterAndSortCanteens);
    
    // Modal controls
    closeModal.addEventListener('click', closeRatingModal);
    window.addEventListener('click', function(event) {
        if (event.target === ratingModal) {
            closeRatingModal();
        }
    });
}

// Load canteens from Firestore
async function loadCanteens() {
    try {
        showLoading();
        
        // Check if Firebase is available and properly configured
        if (window.firebaseReady && window.db && 
            window.firebaseConfig && 
            window.firebaseConfig.apiKey !== "your-api-key") {
            
            try {
                const querySnapshot = await window.firestore.getDocs(window.firestore.collection(window.db, 'canteens'));
                canteens = [];
                querySnapshot.forEach((doc) => {
                    canteens.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                console.log('Loaded canteens from Firebase:', canteens.length);
            } catch (firebaseError) {
                console.warn('Firebase error, using demo data:', firebaseError.message);
                canteens = getDemoData();
            }
        } else {
            console.log('Firebase not available or not configured, using demo data');
            canteens = getDemoData();
        }
        
        hideLoading();
        displayCanteens(canteens);
        
    } catch (error) {
        hideLoading();
        showError('Feil ved lasting av kantiner: ' + error.message);
        // Fallback to demo data
        canteens = getDemoData();
        displayCanteens(canteens);
    }
}

// Get demo data for testing without Firebase
function getDemoData() {
    return [
        {
            id: 'demo-1',
            name: 'Kantina på Grünerløkka',
            company: 'TechStart AS',
            location: 'Oslo',
            description: 'Moderne kantine med fokus på økologisk mat og lokale råvarer.',
            ratings: [
                { rating: 5, comment: 'Fantastisk mat og hyggelig atmosfære!', timestamp: new Date() },
                { rating: 4, comment: 'God mat, litt dyrt', timestamp: new Date() }
            ],
            averageRating: 4.5,
            totalRatings: 2
        },
        {
            id: 'demo-2',
            name: 'Personalrestauranten',
            company: 'Bergen Kommune',
            location: 'Bergen',
            description: 'Tradisjonell norsk mat til rimelige priser for kommuneansatte.',
            ratings: [
                { rating: 3, comment: 'Greit mat, ikke noe spesielt', timestamp: new Date() }
            ],
            averageRating: 3.0,
            totalRatings: 1
        }
    ];
}

// Handle adding new canteen
async function handleAddCanteen(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const canteenData = {
        name: document.getElementById('canteen-name').value.trim(),
        company: document.getElementById('company-name').value.trim(),
        location: document.getElementById('location').value.trim(),
        description: document.getElementById('description').value.trim(),
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
        createdAt: new Date()
    };

    // Validate required fields
    if (!canteenData.name || !canteenData.company || !canteenData.location) {
        showError('Vennligst fyll ut alle obligatoriske felt.');
        return;
    }

    try {
        // Try to save to Firestore if available and configured
        let newCanteenId;
        if (window.firebaseReady && window.db && 
            window.firebaseConfig && 
            window.firebaseConfig.apiKey !== "your-api-key") {
            
            try {
                const docRef = await window.firestore.addDoc(window.firestore.collection(window.db, 'canteens'), canteenData);
                newCanteenId = docRef.id;
                console.log('Saved to Firebase with ID:', newCanteenId);
            } catch (firebaseError) {
                console.warn('Firebase save failed, using demo mode:', firebaseError.message);
                newCanteenId = 'demo-' + Date.now();
            }
        } else {
            console.log('Firebase not available, using demo mode');
            newCanteenId = 'demo-' + Date.now();
        }

        // Add to local array
        canteens.push({
            id: newCanteenId,
            ...canteenData
        });

        // Reset form and update display
        event.target.reset();
        displayCanteens(canteens);
        showSuccess('Kantine lagt til!');

    } catch (error) {
        showError('Feil ved lagring av kantine: ' + error.message);
    }
}

// Handle rating submission
async function handleSubmitRating(event) {
    event.preventDefault();
    
    const rating = parseInt(document.querySelector('input[name="rating"]:checked')?.value);
    const comment = document.getElementById('rating-comment').value.trim();
    
    if (!rating) {
        showError('Vennligst velg en vurdering.');
        return;
    }

    const newRating = {
        rating: rating,
        comment: comment,
        timestamp: new Date()
    };

    try {
        // Find the canteen in local array
        const canteenIndex = canteens.findIndex(c => c.id === currentCanteenId);
        if (canteenIndex === -1) {
            throw new Error('Kantine ikke funnet');
        }

        const canteen = canteens[canteenIndex];
        
        // Update local data
        canteen.ratings = canteen.ratings || [];
        canteen.ratings.push(newRating);
        canteen.totalRatings = canteen.ratings.length;
        canteen.averageRating = canteen.ratings.reduce((sum, r) => sum + r.rating, 0) / canteen.totalRatings;

        // Try to update in Firestore if available and configured
        if (window.firebaseReady && window.db && 
            window.firebaseConfig && 
            window.firebaseConfig.apiKey !== "your-api-key") {
            
            try {
                const canteenRef = window.firestore.doc(window.db, 'canteens', currentCanteenId);
                await window.firestore.updateDoc(canteenRef, {
                    ratings: window.firestore.arrayUnion(newRating),
                    totalRatings: window.firestore.increment(1),
                    averageRating: canteen.averageRating
                });
                console.log('Rating saved to Firebase');
            } catch (firebaseError) {
                console.warn('Firebase not available, rating saved locally only:', firebaseError.message);
            }
        } else {
            console.log('Firebase not available, rating saved locally only');
        }

        // Update display and close modal
        displayCanteens(canteens);
        closeRatingModal();
        showSuccess('Vurdering lagret!');

    } catch (error) {
        showError('Feil ved lagring av vurdering: ' + error.message);
    }
}

// Display canteens
function displayCanteens(canteensToShow) {
    canteensList.innerHTML = '';
    
    if (canteensToShow.length === 0) {
        canteensList.innerHTML = '<p class="loading">Ingen kantiner funnet. Legg til den første!</p>';
        return;
    }

    canteensToShow.forEach(canteen => {
        const canteenCard = createCanteenCard(canteen);
        canteensList.appendChild(canteenCard);
    });
}

// Create canteen card element
function createCanteenCard(canteen) {
    const card = document.createElement('div');
    card.className = 'canteen-card';
    
    const stars = generateStars(canteen.averageRating || 0);
    const ratingText = canteen.totalRatings > 0 
        ? `${canteen.averageRating.toFixed(1)} (${canteen.totalRatings} vurderinger)`
        : 'Ingen vurderinger ennå';

    card.innerHTML = `
        <div class="canteen-header">
            <h3 class="canteen-name">${escapeHtml(canteen.name)}</h3>
            <div class="canteen-rating">
                <span class="stars">${stars}</span>
                <span class="rating-text">${ratingText}</span>
            </div>
        </div>
        <div class="canteen-info">
            <div class="canteen-company">${escapeHtml(canteen.company)}</div>
            <div class="canteen-location">📍 ${escapeHtml(canteen.location)}</div>
            ${canteen.description ? `<div class="canteen-description">${escapeHtml(canteen.description)}</div>` : ''}
        </div>
        <div class="canteen-actions">
            <button class="rate-button" onclick="openRatingModal('${canteen.id}')">
                Vurder denne kantinen
            </button>
        </div>
    `;

    return card;
}

// Generate star display
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
}

// Filter and sort canteens
function filterAndSortCanteens() {
    const searchTerm = searchInput.value.toLowerCase();
    const sortBy = sortSelect.value;
    
    let filteredCanteens = canteens.filter(canteen => 
        canteen.name.toLowerCase().includes(searchTerm) ||
        canteen.company.toLowerCase().includes(searchTerm) ||
        canteen.location.toLowerCase().includes(searchTerm) ||
        (canteen.description && canteen.description.toLowerCase().includes(searchTerm))
    );
    
    // Sort canteens
    filteredCanteens.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'rating':
                return (b.averageRating || 0) - (a.averageRating || 0);
            case 'location':
                return a.location.localeCompare(b.location);
            default:
                return 0;
        }
    });
    
    displayCanteens(filteredCanteens);
}

// Open rating modal
function openRatingModal(canteenId) {
    currentCanteenId = canteenId;
    const canteen = canteens.find(c => c.id === canteenId);
    
    if (!canteen) {
        showError('Kantine ikke funnet');
        return;
    }

    modalCanteenInfo.innerHTML = `
        <h4>${escapeHtml(canteen.name)}</h4>
        <p><strong>${escapeHtml(canteen.company)}</strong> - ${escapeHtml(canteen.location)}</p>
    `;
    
    // Reset form
    ratingForm.reset();
    
    ratingModal.style.display = 'block';
}

// Close rating modal
function closeRatingModal() {
    ratingModal.style.display = 'none';
    currentCanteenId = null;
}

// Utility functions
function showLoading() {
    canteensList.innerHTML = '<div class="loading">Laster kantiner...</div>';
}

function hideLoading() {
    const loading = document.querySelector('.loading');
    if (loading && loading.textContent === 'Laster kantiner...') {
        loading.remove();
    }
}

function showError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.error');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    // Insert at the top of main content
    const main = document.querySelector('main');
    main.insertBefore(errorDiv, main.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    // Remove any existing success messages
    const existingSuccess = document.querySelector('.success');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    // Insert at the top of main content
    const main = document.querySelector('main');
    main.insertBefore(successDiv, main.firstChild);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}