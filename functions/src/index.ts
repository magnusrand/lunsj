import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Types
interface CanteenData {
  name: string;
  company: string;
  location: string;
  description?: string;
  ratings?: Rating[];
  averageRating?: number;
  totalRatings?: number;
  createdAt: admin.firestore.Timestamp;
}

interface Rating {
  rating: number;
  comment?: string;
  timestamp: admin.firestore.Timestamp;
}

interface AddCanteenRequest {
  name: string;
  company: string;
  location: string;
  description?: string;
}

interface AddRatingRequest {
  canteenId: string;
  rating: number;
  comment?: string;
}

// Add new canteen
export const addCanteen = functions.https.onCall(
  async (data: AddCanteenRequest, context) => {
    try {
      // Validate input
      if (!data.name || !data.company || !data.location) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Name, company, and location are required fields"
        );
      }

      // Sanitize input
      const canteenData: Omit<CanteenData, "createdAt"> = {
        name: data.name.trim(),
        company: data.company.trim(),
        location: data.location.trim(),
        description: data.description?.trim() || "",
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
      };

      // Add to Firestore
      const docRef = await db.collection("canteens").add({
        ...canteenData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        canteenId: docRef.id,
        message: "Canteen added successfully",
      };
    } catch (error) {
      console.error("Error adding canteen:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", "Failed to add canteen");
    }
  }
);

// Add rating to canteen
export const addRating = functions.https.onCall(
  async (data: AddRatingRequest, context) => {
    try {
      // Validate input
      if (
        !data.canteenId ||
        !data.rating ||
        data.rating < 1 ||
        data.rating > 5
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Valid canteenId and rating (1-5) are required"
        );
      }

      const canteenRef = db.collection("canteens").doc(data.canteenId);

      // Check if canteen exists
      const canteenDoc = await canteenRef.get();
      if (!canteenDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Canteen not found");
      }

      const newRating: Rating = {
        rating: data.rating,
        comment: data.comment?.trim() || "",
        timestamp:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      // Use transaction to ensure atomic update
      await db.runTransaction(async (transaction) => {
        const canteenDoc = await transaction.get(canteenRef);
        const canteenData = canteenDoc.data() as CanteenData;

        const currentRatings = canteenData.ratings || [];
        const updatedRatings = [...currentRatings, newRating];

        const totalRatings = updatedRatings.length;
        const averageRating =
          updatedRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

        transaction.update(canteenRef, {
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

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", "Failed to add rating");
    }
  }
);

// Get all canteens
export const getCanteens = functions.https.onCall(async (data, context) => {
  try {
    const canteensSnapshot = await db
      .collection("canteens")
      .orderBy("createdAt", "desc")
      .get();

    const canteens = canteensSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      canteens,
    };
  } catch (error) {
    console.error("Error getting canteens:", error);

    throw new functions.https.HttpsError("internal", "Failed to get canteens");
  }
});

