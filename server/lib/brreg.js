const BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api";

// Simple in-memory cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
  // Evict old entries if cache grows too large
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

/**
 * Search for companies by name.
 * Returns simplified list with name, orgnr, and address string.
 */
async function searchCompanies(query) {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${BRREG_BASE}/enheter?navn=${encodeURIComponent(query)}&fraAntallAnsatte=5&size=8`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Brreg API returned ${res.status}`);
  }

  const data = await res.json();
  const enheter = (data._embedded && data._embedded.enheter) || [];

  const results = enheter
    .filter((e) => e.forretningsadresse || e.beliggenhetsadresse)
    .map((e) => {
      const addr = e.forretningsadresse || e.beliggenhetsadresse;
      const streetParts = addr.adresse || [];
      const street = streetParts.join(", ");
      const addressStr = street
        ? `${street}, ${addr.postnummer || ""} ${addr.poststed || ""}`
        : `${addr.postnummer || ""} ${addr.poststed || ""}`;

      return {
        organisasjonsnummer: e.organisasjonsnummer,
        navn: e.navn,
        address: addressStr.trim(),
      };
    });

  setCache(cacheKey, results);
  return results;
}

/**
 * Get full company details by organization number.
 * Returns structured address data for canteen creation.
 */
async function getCompany(orgnr) {
  const cacheKey = `company:${orgnr}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${BRREG_BASE}/enheter/${encodeURIComponent(orgnr)}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Brreg API returned ${res.status}`);
  }

  const e = await res.json();
  const addr = e.forretningsadresse || e.beliggenhetsadresse;

  if (!addr) {
    return { name: e.navn, organisasjonsnummer: e.organisasjonsnummer, address: null };
  }

  const streetParts = addr.adresse || [];
  // Take first line, skip c/o lines
  let street = streetParts.find((s) => !/^c\/o\s/i.test(s)) || streetParts[0] || "";

  const result = {
    name: e.navn,
    organisasjonsnummer: e.organisasjonsnummer,
    address: {
      street,
      postalCode: addr.postnummer || "",
      city: addr.poststed || "",
      municipality: addr.kommune || "",
      municipalityNumber: addr.kommunenummer || "",
    },
  };

  setCache(cacheKey, result);
  return result;
}

module.exports = { searchCompanies, getCompany };
