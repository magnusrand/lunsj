const path = require("path");
const express = require("express");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const { searchCompanies, getCompany } = require("./lib/brreg");
const { normalizeAddress } = require("./lib/address");
const {
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
} = require("./lib/firestore");

const expressApp = express();

expressApp.set("view engine", "ejs");
expressApp.set("views", path.join(__dirname, "views"));
expressApp.use(express.urlencoded({ extended: true }));
expressApp.use(express.json());

// Landing page
expressApp.get("/", async (req, res) => {
  try {
    const topCanteens = await getTopCanteens(6);
    res.render("index", { topCanteens });
  } catch (err) {
    console.error("Error loading landing page:", err);
    res.render("index", { topCanteens: [] });
  }
});

// Canteen page
expressApp.get("/kantine/:addressKey", async (req, res) => {
  try {
    const canteen = await getCanteen(req.params.addressKey);
    if (!canteen) {
      return res.status(404).render("404");
    }
    const reviews = await getReviews(req.params.addressKey, 20);
    res.render("canteen", { canteen, reviews });
  } catch (err) {
    console.error("Error loading canteen:", err);
    res.status(500).render("error", { message: "Noe gikk galt." });
  }
});

// Search companies via Brreg
expressApp.post("/api/sok-bedrift", async (req, res) => {
  const query = (req.body.query || "").trim();
  if (query.length < 2) {
    return res.send("");
  }
  try {
    const companies = await searchCompanies(query);
    res.render("search-results", { companies });
  } catch (err) {
    console.error("Brreg search error:", err);
    res.send('<p class="error-text">Søket feilet. Prøv igjen.</p>');
  }
});

// Select company -> create/find canteen -> redirect
// Two-step flow: first call checks for existing canteens, second call (with canteenChoice) creates/selects
expressApp.post("/api/velg-bedrift", async (req, res) => {
  const { orgnr, canteenChoice, selectedCanteen, canteenName } = req.body;
  if (!orgnr) {
    return res.status(400).send("Mangler organisasjonsnummer.");
  }
  try {
    const company = await getCompany(orgnr);
    if (!company || !company.address) {
      return res.send(
        '<p class="error-text">Fant ikke adresse for denne bedriften.</p>'
      );
    }
    const baseAddressKey = normalizeAddress(
      company.address.street,
      company.address.postalCode,
      company.address.city
    );

    // Second call: user has made a choice
    if (canteenChoice === "existing" && selectedCanteen) {
      await createOrUpdateCanteen(selectedCanteen, company, { baseAddressKey });
      res.set("HX-Redirect", `/kantine/${selectedCanteen}`);
      return res.send("");
    }
    if (canteenChoice === "new") {
      const newKey = await getNextCanteenKey(baseAddressKey);
      const trimmedName = (canteenName || "").trim();
      await createOrUpdateCanteen(newKey, company, {
        baseAddressKey,
        canteenName: trimmedName || undefined,
      });
      res.set("HX-Redirect", `/kantine/${newKey}`);
      return res.send("");
    }

    // First call: check if canteens exist at this address
    const existingCanteens = await getCanteensAtAddress(baseAddressKey);
    if (existingCanteens.length === 0) {
      // No existing canteens — create directly
      await createOrUpdateCanteen(baseAddressKey, company, { baseAddressKey });
      res.set("HX-Redirect", `/kantine/${baseAddressKey}`);
      return res.send("");
    }

    // Existing canteens found — show chooser
    res.render("partials/canteen-chooser", {
      canteens: existingCanteens,
      orgnr: company.organisasjonsnummer,
      companyName: company.name,
    });
  } catch (err) {
    console.error("Select company error:", err);
    res.send('<p class="error-text">Noe gikk galt. Prøv igjen.</p>');
  }
});

// Submit review
expressApp.post("/api/anmeldelse", async (req, res) => {
  const { addressKey, rating, comment, companyName, clientId, paymentType, price, servingType, employeeDiscount } = req.body;
  const ratingNum = parseInt(rating, 10);

  if (!addressKey || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.send(
      '<p class="error-text">Ugyldig anmeldelse. Velg en rating.</p>'
    );
  }
  if (!clientId) {
    return res.send(
      '<p class="error-text">Kunne ikke identifisere deg. Prøv å laste siden på nytt.</p>'
    );
  }

  // Parse optional info fields
  const priceNum = price ? parseInt(price, 10) : null;
  const empDiscount = employeeDiscount === "true" ? true : employeeDiscount === "false" ? false : null;
  const validPaymentTypes = ["subscription", "per_visit"];
  const validServingTypes = ["buffet", "specific_dish", "by_weight"];

  try {
    const result = await addReview(addressKey, {
      rating: ratingNum,
      comment: (comment || "").trim().substring(0, 500),
      companyName: companyName || "",
      clientId,
      paymentType: validPaymentTypes.includes(paymentType) ? paymentType : null,
      price: priceNum && priceNum > 0 ? priceNum : null,
      servingType: validServingTypes.includes(servingType) ? servingType : null,
      employeeDiscount: empDiscount,
    });

    if (result.duplicate) {
      return res.send(
        '<p class="notice-text">Du har allerede anmeldt denne kantinen.</p>'
      );
    }

    res.set("HX-Redirect", `/kantine/${addressKey}`);
    res.send("");
  } catch (err) {
    console.error("Review error:", err);
    res.send('<p class="error-text">Kunne ikke lagre anmeldelsen. Prøv igjen.</p>');
  }
});

// Get user's existing review (for edit mode)
expressApp.get("/api/min-anmeldelse/:addressKey", async (req, res) => {
  const clientId = (req.query.clientId || "").trim();
  if (!clientId) return res.status(204).send("");

  try {
    const review = await getReviewByClientId(req.params.addressKey, clientId);
    if (!review) return res.status(204).send("");

    const canteen = await getCanteen(req.params.addressKey);
    if (!canteen) return res.status(204).send("");

    res.render("partials/review-form", {
      addressKey: req.params.addressKey,
      companies: canteen.companies || [],
      review,
    });
  } catch (err) {
    console.error("Get my review error:", err);
    res.status(204).send("");
  }
});

// Update existing review
expressApp.post("/api/endre-anmeldelse", async (req, res) => {
  const { addressKey, reviewId, rating, comment, companyName, clientId, paymentType, price, servingType, employeeDiscount } = req.body;
  const ratingNum = parseInt(rating, 10);

  if (!addressKey || !reviewId || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.send(
      '<p class="error-text">Ugyldig anmeldelse. Velg en rating.</p>'
    );
  }
  if (!clientId) {
    return res.send(
      '<p class="error-text">Kunne ikke identifisere deg. Prøv å laste siden på nytt.</p>'
    );
  }

  const priceNum = price ? parseInt(price, 10) : null;
  const empDiscount = employeeDiscount === "true" ? true : employeeDiscount === "false" ? false : null;
  const validPaymentTypes = ["subscription", "per_visit"];
  const validServingTypes = ["buffet", "specific_dish", "by_weight"];

  try {
    // Verify the review belongs to this client
    const existing = await getReviewByClientId(addressKey, clientId);
    if (!existing || existing.id !== reviewId) {
      return res.send(
        '<p class="error-text">Kunne ikke finne anmeldelsen din.</p>'
      );
    }

    const newData = {
      rating: ratingNum,
      comment: (comment || "").trim().substring(0, 500),
      paymentType: validPaymentTypes.includes(paymentType) ? paymentType : null,
      price: priceNum && priceNum > 0 ? priceNum : null,
      servingType: validServingTypes.includes(servingType) ? servingType : null,
      employeeDiscount: empDiscount,
    };

    await updateReview(addressKey, reviewId, existing, newData);

    res.set("HX-Redirect", `/kantine/${addressKey}`);
    res.send("");
  } catch (err) {
    console.error("Update review error:", err);
    res.send('<p class="error-text">Kunne ikke oppdatere anmeldelsen. Prøv igjen.</p>');
  }
});

// Recent reviews (HTMX lazy load)
expressApp.get("/api/siste-anmeldelser", async (req, res) => {
  try {
    const reviews = await getRecentReviews(8);
    res.render("partials/recent-reviews", { reviews });
  } catch (err) {
    console.error("Recent reviews error:", err);
    res.send("");
  }
});

// 404 catch-all
expressApp.use((req, res) => {
  res.status(404).render("404");
});

exports.app = onRequest({ region: "europe-west1" }, expressApp);
