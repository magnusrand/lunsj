# Lunsjguiden

En nettapp for å vurdere og oppdage kantiner på norske arbeidsplasser. Ansatte kan søke opp arbeidsgiveren sin via Brønnøysundregistrene, gi kantinen en vurdering og se hva andre mener om lunsjtilbudet.

## Funksjoner

- **Bedriftssøk** — Søk opp arbeidsplassen din via Brreg (filtrerer på bedrifter med 5+ ansatte)
- **Vurderinger** — Gi kantinen 1–5 stjerner og legg igjen en kommentar
- **Kantineinfo** — Del detaljer om pris, betalingsmodell, serveringstype og ansattrabatt
- **Flerkantine-støtte** — Håndterer adresser med flere kantiner (f.eks. kontorbygg)
- **Topplister og siste vurderinger** — Se de best vurderte kantinene og nylige anmeldelser

## Teknologi

| Lag | Teknologi |
|-----|-----------|
| Frontend | EJS, HTMX, vanilla JS, CSS |
| Backend | Node.js 20, Express |
| Database | Firestore |
| Hosting | Firebase Hosting + Cloud Functions |
| Eksternt API | Brønnøysundregistrene (Brreg) |
| Sikkerhet | Helmet.js, rate limiting, CSP |
| Analyse | Umami |

## Prosjektstruktur

```
├── public/              # Statiske filer (JS, CSS, favicon)
├── server/
│   ├── index.js         # Express-app med ruter
│   ├── lib/
│   │   ├── brreg.js     # Brreg-integrasjon
│   │   ├── firestore.js # Databaseoperasjoner
│   │   └── address.js   # Adressenormalisering
│   └── views/           # EJS-maler og partials
├── .github/workflows/   # CI/CD med GitHub Actions
├── firebase.json        # Firebase-konfigurasjon
├── firestore.rules      # Sikkerhetsregler for Firestore
└── .firebaserc          # Firebase-prosjektreferanse
```

## Kom i gang

### Forutsetninger

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)

### Lokal utvikling

```bash
# Installer avhengigheter
cd server && npm install

# Start Firebase-emulatorer
firebase emulators:start
```

Appen kjører da på:

| Tjeneste | URL |
|----------|-----|
| Nettside | http://localhost:5002 |
| Functions | http://localhost:5001 |
| Firestore | http://localhost:8081 |
| Emulator UI | http://localhost:4000 |

## Deploy

Appen deployes automatisk til Firebase ved push til `main` via GitHub Actions.

Manuell deploy:

```bash
npx firebase-tools deploy --only hosting,functions:app --project god-lunsj --force
```
