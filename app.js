// Simple Lunsj App - HTMX-powered lunch place app
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

// Firebase configuration
const firebaseConfig = {
  projectId: "god-lunsj",
  // Add other config if needed
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "europe-west1");

// Connect to emulator in development
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

let currentLunchPlaceId = null;

// DOM elements
const ratingModal = document.getElementById("rating-modal");
const modalLunchPlaceInfo = document.getElementById("modal-lunchplace-info");
const closeModal = document.querySelector(".close");
const addLunchModal = document.getElementById("add-lunch-modal");

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  // HTMX will handle initial load via hx-trigger="load" on the lunchplaces-list div
});

function setupEventListeners() {
  if (closeModal) closeModal.addEventListener("click", closeRatingModal);

  window.addEventListener("click", function (event) {
    if (event.target === ratingModal) {
      closeRatingModal();
    }
    if (event.target === addLunchModal) {
      closeAddLunchModal();
    }
  });

  const addBtn = document.getElementById("add-lunchplace-btn");
  if (addBtn && addLunchModal) {
    addBtn.addEventListener("click", function () {
      openAddLunchModal();
    });
  }

  const addClose = document.querySelector('[data-close-add]');
  if (addClose) {
    addClose.addEventListener('click', closeAddLunchModal);
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

// Add lunch modal controls
function openAddLunchModal() {
  if (addLunchModal) {
    addLunchModal.style.display = 'block';
  }
}

function closeAddLunchModal() {
  if (addLunchModal) {
    addLunchModal.style.display = 'none';
  }
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
window.closeAddLunchModal = closeAddLunchModal;
