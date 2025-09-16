import { onCall, onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Add new lunch place
export const addLunchPlace = onCall(
  {
    region: "europe-west1",
    cors: true,
  },
  async (request) => {
    try {
      const data = request.data;

      // Validate input
      if (!data.company || !data.location || !data.servingType) {
        throw new HttpsError(
          "invalid-argument",
          "Company, location, and serving type are required fields"
        );
      }

      // Create unique identifier: company-location
      const lunchPlaceId = `${data.company
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")}-${data.location
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      // Check if lunch place already exists
      const existingDoc = await db
        .collection("lunchPlaces")
        .doc(lunchPlaceId)
        .get();
      if (existingDoc.exists) {
        throw new HttpsError(
          "already-exists",
          "A lunch place for this company at this location already exists"
        );
      }

      // Sanitize and prepare data
      const lunchPlaceData = {
        company: data.company.trim(),
        location: data.location.trim(),
        servingType: data.servingType.trim(),
        pricePerServing: data.pricePerServing
          ? parseFloat(data.pricePerServing)
          : null,
        pricePerMonth: data.pricePerMonth
          ? parseFloat(data.pricePerMonth)
          : null,
        description: data.description?.trim() || "",
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
        createdAt: new Date(),
      };

      // Add to Firestore with custom ID
      await db.collection("lunchPlaces").doc(lunchPlaceId).set(lunchPlaceData);

      return {
        success: true,
        lunchPlaceId: lunchPlaceId,
        message: "Lunch place added successfully",
      };
    } catch (error) {
      console.error("Error adding lunch place:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to add lunch place");
    }
  }
);

// Add rating to lunch place
export const addRating = onCall(
  {
    region: "europe-west1",
    cors: true,
  },
  async (request) => {
    try {
      const data = request.data;

      // Validate input
      if (
        !data.lunchPlaceId ||
        !data.rating ||
        data.rating < 1 ||
        data.rating > 5
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Valid lunchPlaceId and rating (1-5) are required"
        );
      }

      const lunchPlaceRef = db.collection("lunchPlaces").doc(data.lunchPlaceId);

      // Check if lunch place exists
      const lunchPlaceDoc = await lunchPlaceRef.get();
      if (!lunchPlaceDoc.exists) {
        throw new HttpsError("not-found", "Lunch place not found");
      }

      const newRating = {
        rating: data.rating,
        comment: data.comment?.trim() || "",
        timestamp: new Date(),
      };

      // Use transaction to ensure atomic update
      await db.runTransaction(async (transaction) => {
        const lunchPlaceDoc = await transaction.get(lunchPlaceRef);
        const lunchPlaceData = lunchPlaceDoc.data();

        const currentRatings = lunchPlaceData.ratings || [];
        const updatedRatings = [...currentRatings, newRating];

        const totalRatings = updatedRatings.length;
        const averageRating =
          updatedRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

        transaction.update(lunchPlaceRef, {
          ratings: updatedRatings,
          totalRatings,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        });
      });

      return {
        success: true,
        message: "Rating added successfully",
      };
    } catch (error) {
      console.error("Error adding rating:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to add rating");
    }
  }
);

// Get all lunch places
export const getLunchPlaces = onCall(
  {
    region: "europe-west1",
    cors: true,
  },
  async (request) => {
    try {
      const lunchPlacesSnapshot = await db
        .collection("lunchPlaces")
        .orderBy("createdAt", "desc")
        .get();

      const lunchPlaces = lunchPlacesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        lunchPlaces,
      };
    } catch (error) {
      console.error("Error getting lunch places:", error);

      throw new HttpsError("internal", "Failed to get lunch places");
    }
  }
);

// Get specific lunch place
export const getLunchPlace = onCall(
  {
    region: "europe-west1",
    cors: true,
  },
  async (request) => {
    try {
      const { lunchPlaceId } = request.data;

      if (!lunchPlaceId) {
        throw new HttpsError("invalid-argument", "lunchPlaceId is required");
      }

      const lunchPlaceDoc = await db
        .collection("lunchPlaces")
        .doc(lunchPlaceId)
        .get();

      if (!lunchPlaceDoc.exists) {
        throw new HttpsError("not-found", "Lunch place not found");
      }

      return {
        success: true,
        lunchPlace: {
          id: lunchPlaceDoc.id,
          ...lunchPlaceDoc.data(),
        },
      };
    } catch (error) {
      console.error("Error getting lunch place:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to get lunch place");
    }
  }
);

// HTMX API Endpoints

// Get lunch places list (HTML fragment)
export const getLunchPlacesList = onRequest(
  {
    region: "europe-west1",
    cors: true,
  },
  async (req, res) => {
    try {
      const { search, sort } = req.query;

      let query = db.collection("lunchPlaces");

      // Apply sorting
      if (sort) {
        switch (sort) {
          case "rating":
            query = query.orderBy("averageRating", "desc");
            break;
          case "location":
            query = query.orderBy("location", "asc");
            break;
          case "servingType":
            query = query.orderBy("servingType", "asc");
            break;
          default:
            query = query.orderBy("company", "asc");
        }
      } else {
        query = query.orderBy("createdAt", "desc");
      }

      const snapshot = await query.get();
      let lunchPlaces = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        lunchPlaces = lunchPlaces.filter(
          (lp) =>
            lp.company.toLowerCase().includes(searchTerm) ||
            lp.location.toLowerCase().includes(searchTerm) ||
            lp.servingType.toLowerCase().includes(searchTerm) ||
            (lp.description &&
              lp.description.toLowerCase().includes(searchTerm))
        );
      }

      // Generate HTML
      const html = lunchPlaces
        .map((lp) => generateLunchPlaceCardHTML(lp))
        .join("");

      res.set("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("Error getting lunch places list:", error);
      res.status(500).send("<p>Error loading lunch places</p>");
    }
  }
);

// Add new lunch place (HTML fragment)
export const addLunchPlaceAPI = onRequest(
  {
    region: "europe-west1",
    cors: true,
  },
  async (req, res) => {
    try {
      const {
        company,
        location,
        servingType,
        pricePerServing,
        pricePerMonth,
        description,
      } = req.body;

      if (!company || !location || !servingType) {
        res
          .status(400)
          .send("<p>Company, location, and serving type are required</p>");
        return;
      }

      const lunchPlaceId = `${company
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")}-${location
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      // Check if exists
      const existingDoc = await db
        .collection("lunchPlaces")
        .doc(lunchPlaceId)
        .get();
      if (existingDoc.exists) {
        res
          .status(400)
          .send(
            "<p>A lunch place for this company at this location already exists</p>"
          );
        return;
      }

      const lunchPlaceData = {
        company: company.trim(),
        location: location.trim(),
        servingType: servingType.trim(),
        pricePerServing: pricePerServing ? parseFloat(pricePerServing) : null,
        pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
        description: description?.trim() || "",
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
        createdAt: new Date(),
      };

      await db.collection("lunchPlaces").doc(lunchPlaceId).set(lunchPlaceData);

      const html = generateLunchPlaceCardHTML({
        id: lunchPlaceId,
        ...lunchPlaceData,
      });

      res.set("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("Error adding lunch place:", error);
      res.status(500).send("<p>Error adding lunch place</p>");
    }
  }
);

// Add rating (HTML fragment)
export const addRatingAPI = onRequest(
  {
    region: "europe-west1",
    cors: true,
  },
  async (req, res) => {
    try {
      const { lunchPlaceId, rating, comment } = req.body;

      if (!lunchPlaceId || !rating || rating < 1 || rating > 5) {
        res
          .status(400)
          .send("<p>Valid lunch place ID and rating (1-5) are required</p>");
        return;
      }

      const lunchPlaceRef = db.collection("lunchPlaces").doc(lunchPlaceId);
      const lunchPlaceDoc = await lunchPlaceRef.get();

      if (!lunchPlaceDoc.exists) {
        res.status(404).send("<p>Lunch place not found</p>");
        return;
      }

      const newRating = {
        rating: parseInt(rating),
        comment: comment?.trim() || "",
        timestamp: new Date(),
      };

      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(lunchPlaceRef);
        const data = doc.data();

        const currentRatings = data.ratings || [];
        const updatedRatings = [...currentRatings, newRating];

        const totalRatings = updatedRatings.length;
        const averageRating =
          updatedRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

        transaction.update(lunchPlaceRef, {
          ratings: updatedRatings,
          totalRatings,
          averageRating: Math.round(averageRating * 10) / 10,
        });
      });

      const html = generateRatingHTML(newRating);

      res.set("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("Error adding rating:", error);
      res.status(500).send("<p>Error adding rating</p>");
    }
  }
);

// Helper function to generate lunch place card HTML
function generateLunchPlaceCardHTML(lunchPlace) {
  const stars = generateStars(lunchPlace.averageRating || 0);
  const ratingText =
    lunchPlace.totalRatings > 0
      ? `${lunchPlace.averageRating.toFixed(1)} (${
          lunchPlace.totalRatings
        } vurderinger)`
      : "Ingen vurderinger ennå";

  return `
    <div class="lunchplace-card">
      <div class="lunchplace-header">
        <h3 class="lunchplace-company">${escapeHtml(lunchPlace.company)}</h3>
        <div class="lunchplace-rating">
          <span class="stars">${stars}</span>
          <span class="rating-text">${ratingText}</span>
        </div>
      </div>
      <div class="lunchplace-info">
        <div class="lunchplace-location">📍 ${escapeHtml(
          lunchPlace.location
        )}</div>
        <div class="lunchplace-serving-type">🍽️ ${escapeHtml(
          lunchPlace.servingType
        )}</div>
        ${
          lunchPlace.pricePerServing
            ? `<div class="lunchplace-price">💰 ${lunchPlace.pricePerServing} kr per porsjon</div>`
            : ""
        }
        ${
          lunchPlace.pricePerMonth
            ? `<div class="lunchplace-price">📅 ${lunchPlace.pricePerMonth} kr per måned</div>`
            : ""
        }
        ${
          lunchPlace.description
            ? `<div class="lunchplace-description">${escapeHtml(
                lunchPlace.description
              )}</div>`
            : ""
        }
      </div>
      <div class="lunchplace-actions">
        <button class="rate-button" onclick="openRatingModal('${
          lunchPlace.id
        }')">
          Vurder dette lunsjstedet
        </button>
      </div>
    </div>
  `;
}

// Helper function to generate rating HTML
function generateRatingHTML(rating) {
  const stars = generateStars(rating.rating);
  return `
    <div class="rating">
      <div class="stars">${stars}</div>
      <p>${escapeHtml(rating.comment)}</p>
      <small>${new Date(rating.timestamp).toLocaleDateString("no-NO")}</small>
    </div>
  `;
}

// Helper function to generate stars
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    "★".repeat(fullStars) + (hasHalfStar ? "☆" : "") + "☆".repeat(emptyStars)
  );
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
