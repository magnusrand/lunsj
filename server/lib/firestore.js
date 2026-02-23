const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function db() {
  return getFirestore();
}

/**
 * Get the consensus value (most common) from a votes object.
 * Returns null if no votes.
 */
function getConsensus(votes) {
  if (!votes || Object.keys(votes).length === 0) return null;
  let best = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(votes)) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Get the median from an array of numbers.
 */
function getMedian(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Get a canteen by addressKey.
 */
async function getCanteen(addressKey) {
  const doc = await db().collection("canteens").doc(addressKey).get();
  if (!doc.exists) return null;
  return doc.data();
}

/**
 * Create or update a canteen document.
 * Adds the company to the companies array if not already present.
 * Supports baseAddressKey and canteenName for multi-canteen addresses.
 */
async function createOrUpdateCanteen(addressKey, company, { baseAddressKey, canteenName } = {}) {
  const ref = db().collection("canteens").doc(addressKey);

  await db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);

    if (!doc.exists) {
      const data = {
        addressKey,
        baseAddressKey: baseAddressKey || addressKey,
        street: company.address.street,
        postalCode: company.address.postalCode,
        city: company.address.city,
        municipality: company.address.municipality,
        municipalityNumber: company.address.municipalityNumber,
        companies: [
          {
            organisasjonsnummer: company.organisasjonsnummer,
            name: company.name,
            addedAt: new Date(),
          },
        ],
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (canteenName) data.canteenName = canteenName;
      tx.set(ref, data);
    } else {
      const data = doc.data();
      const exists = data.companies.some(
        (c) => c.organisasjonsnummer === company.organisasjonsnummer
      );
      const updates = { updatedAt: FieldValue.serverTimestamp() };
      if (!data.baseAddressKey) {
        updates.baseAddressKey = baseAddressKey || addressKey;
      }
      if (!exists) {
        updates.companies = FieldValue.arrayUnion({
          organisasjonsnummer: company.organisasjonsnummer,
          name: company.name,
          addedAt: new Date(),
        });
      }
      if (Object.keys(updates).length > 1 || !exists) {
        tx.update(ref, updates);
      }
    }
  });
}

/**
 * Get all canteens at a given base address.
 * Also checks for legacy canteens that don't have baseAddressKey set
 * but whose addressKey matches the base.
 */
async function getCanteensAtAddress(baseAddressKey) {
  // Query by baseAddressKey field
  const snapshot = await db()
    .collection("canteens")
    .where("baseAddressKey", "==", baseAddressKey)
    .get();

  const canteens = snapshot.docs.map((doc) => doc.data());

  // Fallback: check if a legacy doc exists with addressKey = baseAddressKey but no baseAddressKey field
  if (canteens.length === 0) {
    const legacyDoc = await db().collection("canteens").doc(baseAddressKey).get();
    if (legacyDoc.exists) {
      canteens.push(legacyDoc.data());
    }
  }

  return canteens;
}

/**
 * Find the next available canteen key for a base address.
 * First canteen: baseAddressKey itself
 * Subsequent: baseAddressKey_2, _3, etc.
 */
async function getNextCanteenKey(baseAddressKey) {
  const existing = await getCanteensAtAddress(baseAddressKey);
  if (existing.length === 0) return baseAddressKey;

  // Find highest suffix
  let maxSuffix = 1;
  for (const c of existing) {
    const key = c.addressKey || "";
    if (key === baseAddressKey) continue;
    const match = key.match(/_(\d+)$/);
    if (match) {
      maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
    }
  }
  return `${baseAddressKey}_${maxSuffix + 1}`;
}

/**
 * Add a review to a canteen's subcollection.
 * Uses a transaction to update the canteen's aggregate fields.
 * Returns { duplicate: true } if the clientId already submitted a review.
 */
async function addReview(addressKey, { rating, comment, companyName, clientId, paymentType, price, servingType, employeeDiscount }) {
  const canteenRef = db().collection("canteens").doc(addressKey);
  const reviewsRef = canteenRef.collection("reviews");

  // Check for duplicate
  const existing = await reviewsRef.where("clientId", "==", clientId).limit(1).get();
  if (!existing.empty) {
    return { duplicate: true };
  }

  await db().runTransaction(async (tx) => {
    const canteenDoc = await tx.get(canteenRef);
    if (!canteenDoc.exists) {
      throw new Error("Canteen not found");
    }

    const data = canteenDoc.data();
    const newTotal = (data.totalReviews || 0) + 1;
    const dist = data.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist[rating] = (dist[rating] || 0) + 1;

    // Calculate new average from distribution
    let sum = 0;
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      sum += i * (dist[i] || 0);
      count += dist[i] || 0;
    }
    const newAverage = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    // Update canteen info consensus
    const info = data.info || {};

    if (paymentType) {
      const ptVotes = (info.paymentType && info.paymentType.votes) || {};
      ptVotes[paymentType] = (ptVotes[paymentType] || 0) + 1;
      info.paymentType = { consensus: getConsensus(ptVotes), votes: ptVotes };
    }

    if (price != null && paymentType) {
      const bucket = paymentType === 'subscription' ? 'priceSubscription' : 'pricePerVisit';
      const values = (info[bucket] && info[bucket].values) || [];
      values.push(price);
      info[bucket] = { median: getMedian(values), values };
    }

    if (servingType) {
      const stVotes = (info.servingType && info.servingType.votes) || {};
      stVotes[servingType] = (stVotes[servingType] || 0) + 1;
      info.servingType = { consensus: getConsensus(stVotes), votes: stVotes };
    }

    if (employeeDiscount != null) {
      const edKey = String(employeeDiscount);
      const edVotes = (info.employeeDiscount && info.employeeDiscount.votes) || {};
      edVotes[edKey] = (edVotes[edKey] || 0) + 1;
      info.employeeDiscount = { consensus: getConsensus(edVotes), votes: edVotes };
    }

    tx.update(canteenRef, {
      totalReviews: newTotal,
      averageRating: newAverage,
      ratingDistribution: dist,
      info,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const reviewData = {
      rating,
      comment,
      companyName,
      clientId,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (paymentType) reviewData.paymentType = paymentType;
    if (price != null) reviewData.price = price;
    if (servingType) reviewData.servingType = servingType;
    if (employeeDiscount != null) reviewData.employeeDiscount = employeeDiscount;

    const newReviewRef = reviewsRef.doc();
    tx.set(newReviewRef, reviewData);
  });

  return { duplicate: false };
}

/**
 * Get a single review by clientId.
 * Returns { id, ...data } or null.
 */
async function getReviewByClientId(addressKey, clientId) {
  const snapshot = await db()
    .collection("canteens")
    .doc(addressKey)
    .collection("reviews")
    .where("clientId", "==", clientId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Update an existing review and adjust canteen aggregates in a transaction.
 */
async function updateReview(addressKey, reviewId, oldData, newData) {
  const canteenRef = db().collection("canteens").doc(addressKey);
  const reviewRef = canteenRef.collection("reviews").doc(reviewId);

  await db().runTransaction(async (tx) => {
    const canteenDoc = await tx.get(canteenRef);
    if (!canteenDoc.exists) throw new Error("Canteen not found");

    const canteen = canteenDoc.data();
    const dist = canteen.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Adjust rating distribution
    if (oldData.rating !== newData.rating) {
      dist[oldData.rating] = Math.max((dist[oldData.rating] || 0) - 1, 0);
      dist[newData.rating] = (dist[newData.rating] || 0) + 1;

      let sum = 0;
      let count = 0;
      for (let i = 1; i <= 5; i++) {
        sum += i * (dist[i] || 0);
        count += dist[i] || 0;
      }
      canteen.averageRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    }

    // Adjust info consensus
    const info = canteen.info || {};

    // paymentType votes
    if (oldData.paymentType !== newData.paymentType) {
      const ptVotes = (info.paymentType && info.paymentType.votes) || {};
      if (oldData.paymentType) {
        ptVotes[oldData.paymentType] = Math.max((ptVotes[oldData.paymentType] || 0) - 1, 0);
      }
      if (newData.paymentType) {
        ptVotes[newData.paymentType] = (ptVotes[newData.paymentType] || 0) + 1;
      }
      info.paymentType = { consensus: getConsensus(ptVotes), votes: ptVotes };
    }

    // price values
    const oldBucket = oldData.paymentType === "subscription" ? "priceSubscription" : "pricePerVisit";
    const newBucket = newData.paymentType === "subscription" ? "priceSubscription" : "pricePerVisit";
    if (oldData.price != null || newData.price != null) {
      // Remove old price from old bucket
      if (oldData.price != null && oldData.paymentType) {
        const vals = (info[oldBucket] && info[oldBucket].values) || [];
        const idx = vals.indexOf(oldData.price);
        if (idx !== -1) vals.splice(idx, 1);
        info[oldBucket] = { median: getMedian(vals), values: vals };
      }
      // Add new price to new bucket
      if (newData.price != null && newData.paymentType) {
        const vals = (info[newBucket] && info[newBucket].values) || [];
        vals.push(newData.price);
        info[newBucket] = { median: getMedian(vals), values: vals };
      }
    }

    // servingType votes
    if (oldData.servingType !== newData.servingType) {
      const stVotes = (info.servingType && info.servingType.votes) || {};
      if (oldData.servingType) {
        stVotes[oldData.servingType] = Math.max((stVotes[oldData.servingType] || 0) - 1, 0);
      }
      if (newData.servingType) {
        stVotes[newData.servingType] = (stVotes[newData.servingType] || 0) + 1;
      }
      info.servingType = { consensus: getConsensus(stVotes), votes: stVotes };
    }

    // employeeDiscount votes
    const oldEd = oldData.employeeDiscount != null ? String(oldData.employeeDiscount) : null;
    const newEd = newData.employeeDiscount != null ? String(newData.employeeDiscount) : null;
    if (oldEd !== newEd) {
      const edVotes = (info.employeeDiscount && info.employeeDiscount.votes) || {};
      if (oldEd != null) {
        edVotes[oldEd] = Math.max((edVotes[oldEd] || 0) - 1, 0);
      }
      if (newEd != null) {
        edVotes[newEd] = (edVotes[newEd] || 0) + 1;
      }
      info.employeeDiscount = { consensus: getConsensus(edVotes), votes: edVotes };
    }

    tx.update(canteenRef, {
      averageRating: canteen.averageRating,
      ratingDistribution: dist,
      info,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const reviewUpdate = {
      rating: newData.rating,
      comment: newData.comment,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (newData.paymentType) reviewUpdate.paymentType = newData.paymentType;
    else reviewUpdate.paymentType = FieldValue.delete();
    if (newData.price != null) reviewUpdate.price = newData.price;
    else reviewUpdate.price = FieldValue.delete();
    if (newData.servingType) reviewUpdate.servingType = newData.servingType;
    else reviewUpdate.servingType = FieldValue.delete();
    if (newData.employeeDiscount != null) reviewUpdate.employeeDiscount = newData.employeeDiscount;
    else reviewUpdate.employeeDiscount = FieldValue.delete();

    tx.update(reviewRef, reviewUpdate);
  });
}

/**
 * Get reviews for a canteen, ordered by newest first.
 */
async function getReviews(addressKey, limit = 20) {
  const snapshot = await db()
    .collection("canteens")
    .doc(addressKey)
    .collection("reviews")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

/**
 * Get top canteens by total reviews.
 */
async function getTopCanteens(limit = 6) {
  const snapshot = await db()
    .collection("canteens")
    .orderBy("totalReviews", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

/**
 * Get recent reviews across all canteens (collection group query).
 */
async function getRecentReviews(limit = 8) {
  const snapshot = await db()
    .collectionGroup("reviews")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const reviews = [];
  for (const doc of snapshot.docs) {
    const review = doc.data();
    // Get parent canteen info for display
    const canteenRef = doc.ref.parent.parent;
    if (canteenRef) {
      const canteenDoc = await canteenRef.get();
      if (canteenDoc.exists) {
        const canteen = canteenDoc.data();
        review.addressKey = canteen.addressKey;
        review.street = canteen.street;
        review.city = canteen.city;
      }
    }
    reviews.push(review);
  }

  return reviews;
}

/**
 * Add general feedback to the feedback collection.
 */
async function addFeedback(message) {
  await db().collection("feedback").add({
    message,
    createdAt: FieldValue.serverTimestamp(),
  });
}

module.exports = {
  getCanteen,
  createOrUpdateCanteen,
  addReview,
  getReviews,
  getReviewByClientId,
  updateReview,
  getTopCanteens,
  getRecentReviews,
  getCanteensAtAddress,
  getNextCanteenKey,
  addFeedback,
};
