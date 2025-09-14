// Simple Lunsj App - Display and add canteen data
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

let canteens = [];
let currentCanteenId = null;
let functions = null;

// DOM elements
const addCanteenForm = document.getElementById("add-canteen-form");
const ratingForm = document.getElementById("rating-form");
const canteensList = document.getElementById("canteens-list");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const ratingModal = document.getElementById("rating-modal");
const modalCanteenInfo = document.getElementById("modal-canteen-info");
const closeModal = document.querySelector(".close");

// Initialize Firebase
async function initializeFirebase() {
  try {
    // Firebase configuration (users will need to replace with their own)
    const firebaseConfig = {
      // Replace with your Firebase config
      apiKey: "your-api-key",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "your-app-id",
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    functions = getFunctions(app);
    return true;
  } catch (error) {
    console.log("Firebase not available, running in demo mode:", error.message);
    return false;
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", async function () {
  setupEventListeners();
  await initializeFirebase();
  loadCanteens();
});

function setupEventListeners() {
  addCanteenForm.addEventListener("submit", handleAddCanteen);
  ratingForm.addEventListener("submit", handleSubmitRating);
  searchInput.addEventListener("input", filterAndSortCanteens);
  sortSelect.addEventListener("change", filterAndSortCanteens);
  closeModal.addEventListener("click", closeRatingModal);

  window.addEventListener("click", function (event) {
    if (event.target === ratingModal) {
      closeRatingModal();
    }
  });
}

// Load canteens from Firebase or use demo data
async function loadCanteens() {
  try {
    showLoading();

    if (functions) {
      try {
        const getCanteensFunction = httpsCallable(functions, "getCanteens");
        const result = await getCanteensFunction();
        canteens = result.data.canteens;
        console.log("Loaded canteens from Firebase:", canteens.length);
      } catch (error) {
        console.warn("Firebase error, using demo data:", error.message);
        canteens = getDemoData();
      }
    } else {
      console.log("Firebase not available, using demo data");
      canteens = getDemoData();
    }

    displayCanteens(canteens);
  } catch (error) {
    console.error("Error loading canteens:", error);
    showError("Feil ved lasting av kantiner: " + error.message);
    canteens = getDemoData();
    displayCanteens(canteens);
  }
}

// Demo data for testing without Firebase
function getDemoData() {
  return [
    {
      id: "demo-1",
      name: "Kantina på Grünerløkka",
      company: "TechStart AS",
      location: "Oslo",
      description:
        "Moderne kantine med fokus på økologisk mat og lokale råvarer.",
      ratings: [
        {
          rating: 5,
          comment: "Fantastisk mat og hyggelig atmosfære!",
          timestamp: new Date(),
        },
        { rating: 4, comment: "God mat, litt dyrt", timestamp: new Date() },
      ],
      averageRating: 4.5,
      totalRatings: 2,
    },
    {
      id: "demo-2",
      name: "Personalrestauranten",
      company: "Bergen Kommune",
      location: "Bergen",
      description:
        "Tradisjonell norsk mat til rimelige priser for kommuneansatte.",
      ratings: [
        {
          rating: 3,
          comment: "Greit mat, ikke noe spesielt",
          timestamp: new Date(),
        },
      ],
      averageRating: 3.0,
      totalRatings: 1,
    },
  ];
}

// Add new canteen
async function handleAddCanteen(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const canteenData = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, value.trim()])
  );

  // Modern validation using Constraint Validation API
  if (!addCanteenForm.checkValidity()) {
    addCanteenForm.reportValidity();
    return;
  }

  // Additional custom validation
  if (!canteenData.name || !canteenData.company || !canteenData.location) {
    showError("Vennligst fyll ut alle obligatoriske felt.");
    return;
  }

  try {
    let newCanteenId;

    if (functions) {
      try {
        const addCanteenFunction = httpsCallable(functions, "addCanteen");
        const result = await addCanteenFunction(canteenData);
        newCanteenId = result.data.canteenId;
        console.log("Saved to Firebase with ID:", newCanteenId);
      } catch (error) {
        console.warn("Firebase save failed, using demo mode:", error.message);
        newCanteenId = "demo-" + Date.now();
      }
    } else {
      console.log("Firebase not available, using demo mode");
      newCanteenId = "demo-" + Date.now();
    }

    // Add to local array
    const newCanteen = {
      id: newCanteenId,
      ...canteenData,
      ratings: [],
      averageRating: 0,
      totalRatings: 0,
      createdAt: new Date(),
    };

    canteens.push(newCanteen);
    event.target.reset();
    displayCanteens(canteens);
    showSuccess("Kantine lagt til!");
  } catch (error) {
    console.error("Error adding canteen:", error);
    showError("Feil ved lagring av kantine: " + error.message);
  }
}

// Add rating to canteen
async function handleSubmitRating(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const { rating, comment } = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, value.trim()])
  );
  const ratingValue = parseInt(rating);

  // Modern validation using Constraint Validation API
  if (!ratingForm.checkValidity()) {
    ratingForm.reportValidity();
    return;
  }

  if (!ratingValue) {
    showError("Vennligst velg en vurdering.");
    return;
  }

  try {
    const canteenIndex = canteens.findIndex((c) => c.id === currentCanteenId);
    if (canteenIndex === -1) {
      throw new Error("Kantine ikke funnet");
    }

    const canteen = canteens[canteenIndex];
    const newRating = {
      rating: ratingValue,
      comment: comment,
      timestamp: new Date(),
    };

    // Update local data
    canteen.ratings = canteen.ratings || [];
    canteen.ratings.push(newRating);
    canteen.totalRatings = canteen.ratings.length;
    canteen.averageRating =
      canteen.ratings.reduce((sum, r) => sum + r.rating, 0) /
      canteen.totalRatings;

    // Try to save to Firebase
    if (functions) {
      try {
        const addRatingFunction = httpsCallable(functions, "addRating");
        await addRatingFunction({
          canteenId: currentCanteenId,
          rating: ratingValue,
          comment: comment,
        });
        console.log("Rating saved to Firebase");
      } catch (error) {
        console.warn(
          "Firebase not available, rating saved locally only:",
          error.message
        );
      }
    } else {
      console.log("Firebase not available, rating saved locally only");
    }

    displayCanteens(canteens);
    closeRatingModal();
    showSuccess("Vurdering lagret!");
  } catch (error) {
    console.error("Error adding rating:", error);
    showError("Feil ved lagring av vurdering: " + error.message);
  }
}

// Display canteens
function displayCanteens(canteensToShow) {
  canteensList.replaceChildren();

  if (canteensToShow.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "loading";
    emptyMessage.textContent = "Ingen kantiner funnet. Legg til den første!";
    canteensList.appendChild(emptyMessage);
    return;
  }

  const cards = canteensToShow.map(createCanteenCard);
  canteensList.append(...cards);
}

// Create canteen card
function createCanteenCard(canteen) {
  const card = document.createElement("div");
  card.className = "canteen-card";

  const stars = generateStars(canteen.averageRating || 0);
  const ratingText =
    canteen.totalRatings > 0
      ? `${canteen.averageRating.toFixed(1)} (${
          canteen.totalRatings
        } vurderinger)`
      : "Ingen vurderinger ennå";

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
      ${
        canteen.description
          ? `<div class="canteen-description">${escapeHtml(
              canteen.description
            )}</div>`
          : ""
      }
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

  return (
    "★".repeat(fullStars) + (hasHalfStar ? "☆" : "") + "☆".repeat(emptyStars)
  );
}

// Filter and sort canteens
function filterAndSortCanteens() {
  const searchTerm = searchInput.value.toLowerCase();
  const sortBy = sortSelect.value;

  let filteredCanteens = canteens.filter(
    (canteen) =>
      canteen.name.toLowerCase().includes(searchTerm) ||
      canteen.company.toLowerCase().includes(searchTerm) ||
      canteen.location.toLowerCase().includes(searchTerm) ||
      (canteen.description &&
        canteen.description.toLowerCase().includes(searchTerm))
  );

  filteredCanteens.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "rating":
        return (b.averageRating || 0) - (a.averageRating || 0);
      case "location":
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
  const canteen = canteens.find((c) => c.id === canteenId);

  if (!canteen) {
    showError("Kantine ikke funnet");
    return;
  }

  modalCanteenInfo.innerHTML = `
    <h4>${escapeHtml(canteen.name)}</h4>
    <p><strong>${escapeHtml(canteen.company)}</strong> - ${escapeHtml(
    canteen.location
  )}</p>
  `;

  ratingForm.reset();
  ratingModal.style.display = "block";
}

// Close rating modal
function closeRatingModal() {
  ratingModal.style.display = "none";
  currentCanteenId = null;
}

// Utility functions
function showLoading() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.textContent = "Laster kantiner...";
  canteensList.replaceChildren(loadingDiv);
}

function showError(message) {
  const existingError = document.querySelector(".error");
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement("div");
  errorDiv.className = "error";
  errorDiv.textContent = message;

  const main = document.querySelector("main");
  main.insertBefore(errorDiv, main.firstChild);

  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

function showSuccess(message) {
  const existingSuccess = document.querySelector(".success");
  if (existingSuccess) {
    existingSuccess.remove();
  }

  const successDiv = document.createElement("div");
  successDiv.className = "success";
  successDiv.textContent = message;

  const main = document.querySelector("main");
  main.insertBefore(successDiv, main.firstChild);

  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.remove();
    }
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
