// Simple Lunsj App - HTMX-powered lunch place app
let currentLunchPlaceId = null;

// DOM elements
const ratingModal = document.getElementById("rating-modal");
const modalLunchPlaceInfo = document.getElementById("modal-lunchplace-info");
const closeModal = document.querySelector(".close");

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  loadInitialLunchPlaces();
});

function setupEventListeners() {
  closeModal.addEventListener("click", closeRatingModal);

  window.addEventListener("click", function (event) {
    if (event.target === ratingModal) {
      closeRatingModal();
    }
  });
}

// Load initial lunch places using HTMX
function loadInitialLunchPlaces() {
  // Make sure HTMX is loaded before using it
  if (typeof htmx !== "undefined") {
    htmx.trigger("#search-input", "input");
  } else {
    console.warn("HTMX not loaded yet, retrying...");
    setTimeout(loadInitialLunchPlaces, 100);
  }
}

// Open rating modal
function openRatingModal(lunchPlaceId) {
  currentLunchPlaceId = lunchPlaceId;

  // Get lunch place info (you could fetch this via HTMX if needed)
  const lunchPlace = getLunchPlaceById(lunchPlaceId);

  if (!lunchPlace) {
    showError("Lunsjsted ikke funnet");
    return;
  }

  modalLunchPlaceInfo.innerHTML = `
    <h4>${escapeHtml(lunchPlace.company)}</h4>
    <p><strong>${escapeHtml(lunchPlace.location)}</strong></p>
  `;

  // Add hidden input for lunch place ID
  const form = document.getElementById("rating-form");
  let hiddenInput = form.querySelector('input[name="lunchPlaceId"]');
  if (!hiddenInput) {
    hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "lunchPlaceId";
    form.appendChild(hiddenInput);
  }
  hiddenInput.value = lunchPlaceId;

  ratingModal.style.display = "block";
}

// Close rating modal
function closeRatingModal() {
  ratingModal.style.display = "none";
  currentLunchPlaceId = null;
}

// Helper function to get lunch place by ID (simplified)
function getLunchPlaceById(id) {
  // This is a simplified version - in a real app you might fetch from server
  // For now, we'll just return basic info
  return {
    company: "Sample Company",
    location: "Sample Location",
  };
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to show error
function showError(message) {
  // Simple error display - you could enhance this
  alert(message);
}

// Make openRatingModal globally accessible
window.openRatingModal = openRatingModal;
