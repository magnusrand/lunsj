# 🍽️ Lunsj - Arbeidsplassantiner i Norge

En enkel web-applikasjon for å finne, vurdere og dele informasjon om arbeidsplassantiner rundt i Norge.

## Funksjoner

- 📋 **Se oversikt** over kantiner med vurderinger og informasjon
- ➕ **Legg til nye kantiner** med navn, bedrift, sted og beskrivelse
- ⭐ **Vurder kantiner** med stjerner (1-5) og kommentarer
- 🔍 **Søk og filtrer** kantiner etter navn, sted eller bedrift
- 📱 **Responsiv design** som fungerer på mobil og desktop

## Teknologi

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: Firebase Firestore
- **Styling**: CSS Grid og Flexbox
- **Hosting**: Kan hostes hvor som helst (GitHub Pages, Netlify, etc.)

## Kom i gang

### 1. Last ned prosjektet
```bash
git clone https://github.com/magnusrand/lunsj.git
cd lunsj
```

### 2. Sett opp Firebase
Følg instruksjonene i [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for å konfigurere Firebase Firestore.

### 3. Åpne applikasjonen
Åpne `index.html` i en nettleser. Applikasjonen fungerer med demo-data selv uten Firebase-konfigurasjon.

## Bruk

### Legge til ny kantine
1. Fyll ut skjemaet øverst på siden
2. Klikk "Legg til kantine"
3. Kantinen vises umiddelbart i listen

### Vurdere en kantine
1. Klikk "Vurder denne kantinen" på et kantinkort
2. Velg antall stjerner (1-5)
3. Skriv en valgfri kommentar
4. Klikk "Send vurdering"

### Søke og filtrere
- Bruk søkefeltet for å finne kantiner
- Velg sortering etter navn, vurdering eller sted

## Struktur

```
lunsj/
├── index.html          # Hovedside med HTML-struktur
├── styles.css          # Alle CSS-stiler
├── app.js             # JavaScript-logikk og Firebase-integrasjon
├── FIREBASE_SETUP.md  # Veiledning for Firebase-oppsett
└── README.md          # Denne filen
```

## Demo-data

Applikasjonen inneholder demo-data som vises hvis Firebase ikke er konfigurert, slik at du kan teste funksjonaliteten umiddelbart.

## Bidra

Applikasjonen er åpen for forbedringer! Send gjerne pull requests eller åpne issues.

## Lisens

MIT License - se LICENSE-filen for detaljer.