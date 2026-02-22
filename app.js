// Simple Lunsj App - HTMX-powered lunch place app
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  projectId: "god-lunsj",
  // Add other config if needed
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "europe-west1");
const db = getFirestore(app);

// Connect to emulator in development
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
}

let currentLunchPlaceId = null;

// DOM elements
const ratingModal = document.getElementById("rating-modal");
const modalLunchPlaceInfo = document.getElementById("modal-lunchplace-info");
const closeModal = document.querySelector(".close");

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  // HTMX will handle initial load via hx-trigger="load" on the lunchplaces-list div
});

function setupEventListeners() {
  closeModal.addEventListener("click", closeRatingModal);

  window.addEventListener("click", function (event) {
    if (event.target === ratingModal) {
      closeRatingModal();
    }
  });

  // Quick add button functionality
  const quickAddBtn = document.getElementById("quick-add-btn");
  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", showAddForm);
  }

  // Close add form buttons
  const closeAddFormBtn = document.getElementById("close-add-form");
  const cancelAddFormBtn = document.getElementById("cancel-add-form");

  if (closeAddFormBtn) {
    closeAddFormBtn.addEventListener("click", closeAddForm);
  }

  if (cancelAddFormBtn) {
    cancelAddFormBtn.addEventListener("click", closeAddForm);
  }

  // Hero search is now handled directly by HTMX

  // Handle HTMX events for search results
  document.body.addEventListener("htmx:afterRequest", function (event) {
    if (event.detail.target.id === "lunchplaces-list") {
      handleSearchResults();
    }
  });
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

// Show add form
function showAddForm() {
  const addSection = document.getElementById("add-lunchplace-section");
  if (addSection) {
    addSection.classList.remove("hidden");
    addSection.scrollIntoView({ behavior: "smooth", block: "start" });

    // Focus on first input
    const firstInput = addSection.querySelector("input");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

// Close add form
function closeAddForm() {
  const addSection = document.getElementById("add-lunchplace-section");
  if (addSection) {
    addSection.classList.add("hidden");

    // Reset form
    const form = document.getElementById("add-lunchplace-form");
    if (form) {
      form.reset();
    }
  }
}

// Handle search results and show/hide no-results state
function handleSearchResults() {
  const lunchPlacesList = document.getElementById("lunchplaces-list");
  const noResultsState = document.getElementById("no-results-state");

  if (!lunchPlacesList || !noResultsState) return;

  // Check if there are any lunch place cards
  const lunchPlaceCards = lunchPlacesList.querySelectorAll(
    ".canteen-card, .lunchplace-card",
  );
  const hasResults = lunchPlaceCards.length > 0;

  if (hasResults) {
    noResultsState.classList.add("hidden");
  } else {
    noResultsState.classList.remove("hidden");
  }
}

// Make functions globally accessible
window.openRatingModal = openRatingModal;
window.showAddForm = showAddForm;
window.closeAddForm = closeAddForm;
