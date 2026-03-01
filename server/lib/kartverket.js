const GEONORGE_BASE = "https://ws.geonorge.no/adresser/v1/sok";
const FETCH_TIMEOUT_MS = 5000;

// Simple in-memory cache (1 hour TTL — addresses don't move)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

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
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

/**
 * Geocode a Norwegian address via Kartverket/Geonorge.
 * Returns { lat, lon } or null on any error.
 */
async function geocodeAddress(street, postalCode, city) {
  if (!street) return null;

  const query = [street, postalCode, city].filter(Boolean).join(" ");
  const cacheKey = `geo:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const url = `${GEONORGE_BASE}?sok=${encodeURIComponent(query)}&fuzzy=true&treffPerSide=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const adresser = data.adresser || [];
    if (adresser.length === 0) return null;

    const punkt = adresser[0].representasjonspunkt;
    if (!punkt || punkt.lat == null || punkt.lon == null) return null;

    const result = { lat: punkt.lat, lon: punkt.lon };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { geocodeAddress };
