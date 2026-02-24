/**
 * Normalize an address into a stable key for Firestore document IDs.
 * "Forusbeen 50", "4035", "STAVANGER" -> "forusbeen-50_4035_stavanger"
 */
function normalizeAddress(street, postalCode, city) {
  if (!street || !postalCode || !city) {
    throw new Error("Missing address components");
  }

  const cleanStreet = street
    .replace(/^c\/o\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zæøå0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  const cleanPostal = postalCode.trim();
  const cleanCity = city
    .trim()
    .toLowerCase()
    .replace(/[^a-zæøå0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return `${cleanStreet}_${cleanPostal}_${cleanCity}`;
}

module.exports = { normalizeAddress };
