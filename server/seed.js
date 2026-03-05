const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
admin.initializeApp({ projectId: "god-lunsj" });
const db = admin.firestore();

const canteens = [
  { key: "storgata-1-0001-oslo", street: "Storgata 1", postalCode: "0001", city: "Oslo", canteenName: "Gourmet Lunsj", averageRating: 4.8, totalReviews: 12, lat: 59.9139, lon: 10.7522 },
  { key: "karl-johans-gate-10-0154-oslo", street: "Karl Johans gate 10", postalCode: "0154", city: "Oslo", canteenName: "Slottsparken Kantine", averageRating: 4.7, totalReviews: 8, lat: 59.9138, lon: 10.7387 },
  { key: "torgallmenningen-5-5014-bergen", street: "Torgallmenningen 5", postalCode: "5014", city: "Bergen", canteenName: "Bryggen Bistro", averageRating: 4.6, totalReviews: 6, lat: 60.3913, lon: 5.3221 },
  { key: "munkegata-3-7011-trondheim", street: "Munkegata 3", postalCode: "7011", city: "Trondheim", canteenName: "Nidaros Kantine", averageRating: 4.5, totalReviews: 9, lat: 63.4305, lon: 10.3951 },
  { key: "kirkegata-15-0153-oslo", street: "Kirkegata 15", postalCode: "0153", city: "Oslo", canteenName: "Sentrum Mat", averageRating: 4.4, totalReviews: 5, lat: 59.9127, lon: 10.7461 },
  { key: "olav-tryggvasons-gate-20-7011-trondheim", street: "Olav Tryggvasons gate 20", postalCode: "7011", city: "Trondheim", canteenName: "Bakklandet Lunsj", averageRating: 4.3, totalReviews: 7, lat: 63.434, lon: 10.405 },
  { key: "schweigaards-gate-15-0185-oslo", street: "Schweigaards gate 15", postalCode: "0185", city: "Oslo", canteenName: "Oslo S Kantine", averageRating: 3.8, totalReviews: 25, lat: 59.91, lon: 10.76 },
  { key: "dronningens-gate-1-0154-oslo", street: "Dronningens gate 1", postalCode: "0154", city: "Oslo", canteenName: "Aker Brygge Lunsj", averageRating: 3.5, totalReviews: 20, lat: 59.911, lon: 10.73 },
  { key: "lars-hillesgate-30-5008-bergen", street: "Lars Hillesgate 30", postalCode: "5008", city: "Bergen", canteenName: "UiB Kantinen", averageRating: 3.9, totalReviews: 18, lat: 60.387, lon: 5.324 },
  { key: "elgeseter-gate-10-7030-trondheim", street: "Elgeseter gate 10", postalCode: "7030", city: "Trondheim", canteenName: "NTNU Realfag", averageRating: 4.0, totalReviews: 22, lat: 63.417, lon: 10.403 },
  { key: "strandgata-8-9008-tromso", street: "Strandgata 8", postalCode: "9008", city: "Tromsø", canteenName: "Ishavet Kantine", averageRating: 3.2, totalReviews: 4, lat: 69.6489, lon: 18.9551 },
  { key: "kongens-gate-12-4610-kristiansand", street: "Kongens gate 12", postalCode: "4610", city: "Kristiansand", canteenName: "Sørlands Lunsj", averageRating: 3.6, totalReviews: 3, lat: 58.1462, lon: 7.9956 },
  { key: "langkaia-1-0150-oslo", street: "Langkaia 1", postalCode: "0150", city: "Oslo", canteenName: "Operaen Kantine", averageRating: 4.1, totalReviews: 11, lat: 59.9075, lon: 10.753 },
  { key: "fjordgata-30-7010-trondheim", street: "Fjordgata 30", postalCode: "7010", city: "Trondheim", canteenName: "Solsiden Mat", averageRating: 3.7, totalReviews: 6, lat: 63.435, lon: 10.41 },
  { key: "nedre-strandgate-3-3256-larvik", street: "Nedre Strandgate 3", postalCode: "3256", city: "Larvik", canteenName: "Bøkeskogen Lunsj", averageRating: 2.8, totalReviews: 5, lat: 59.053, lon: 10.026 },
];

const reviewTemplates = [
  { rating: 5, comment: "Fantastisk lunsj! Anbefales på det sterkeste.", company: "TestFirma AS" },
  { rating: 4, comment: "Veldig bra utvalg, men litt kø i rushtiden.", company: "AnnetFirma AS" },
  { rating: 3, comment: "Helt greit, men ingenting spesielt.", company: "TredjeFirma AS" },
  { rating: 5, comment: "Beste kantinen jeg har spist på!", company: "FjerdeFirma AS" },
  { rating: 2, comment: "Maten var kald og utvalget dårlig.", company: "FemteFirma AS" },
];

async function seed() {
  const batch = db.batch();

  for (const c of canteens) {
    const ref = db.collection("canteens").doc(c.key);
    batch.set(ref, {
      addressKey: c.key,
      baseAddressKey: c.key,
      street: c.street,
      postalCode: c.postalCode,
      city: c.city,
      canteenName: c.canteenName,
      averageRating: c.averageRating,
      totalReviews: c.totalReviews,
      ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
      companies: [{ organisasjonsnummer: "000000000", name: c.canteenName, addedAt: new Date() }],
      lat: c.lat,
      lon: c.lon,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`Created ${canteens.length} canteens.`);

  let reviewCount = 0;
  for (const c of canteens) {
    const reviewBatch = db.batch();
    for (let i = 0; i < reviewTemplates.length; i++) {
      const t = reviewTemplates[i];
      const ref = db.collection("canteens").doc(c.key).collection("reviews").doc();
      reviewBatch.set(ref, {
        rating: t.rating,
        comment: t.comment,
        companyName: t.company,
        clientId: `client-${i}-${c.key}`,
        createdAt: new Date(2025, 2, i + 1),
      });
      reviewCount++;
    }
    await reviewBatch.commit();
  }

  console.log(`Created ${reviewCount} reviews.`);
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
