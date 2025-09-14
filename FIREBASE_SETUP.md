# Firebase Setup Guide

This application uses Firebase Functions for server-side operations and Firestore for data storage. Follow these steps to set up Firebase for your project:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "lunsj-canteens")
4. Follow the setup wizard

## 2. Enable Firestore Database

1. In your Firebase project console, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (remember to secure it later for production)
4. Select a location close to your users (e.g., europe-west3 for Norway)

## 3. Enable Firebase Functions

1. In your Firebase project console, click on "Functions" in the left sidebar
2. Click "Get started" if you haven't used Functions before
3. Follow the setup wizard to enable Functions

## 4. Install Firebase CLI

1. Install the Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project directory:
   ```bash
   firebase init
   ```
   - Select "Functions" and "Firestore"
   - Choose your existing Firebase project
   - Use TypeScript for Functions (recommended)
   - Install dependencies when prompted

## 5. Deploy Firebase Functions

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

## 6. Get Your Firebase Configuration

1. In your Firebase project console, click on the gear icon (Project Settings)
2. Scroll down to "Your apps" section
3. Click on the web icon (</>) to add a web app
4. Give your app a nickname (e.g., "lunsj-web")
5. Don't check "Set up Firebase Hosting" unless you plan to use it
6. Copy the Firebase configuration object

## 7. Update the Configuration in index.html

Replace the placeholder configuration in `index.html` with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## 8. Test the Application

1. Open `index.html` in a web browser
2. The application should work with demo data even without Firebase
3. Once Firebase is configured, data will be stored persistently through Firebase Functions

## 9. Security Rules (Important for Production)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to canteens for all users
    match /canteens/{document} {
      allow read: if true;
      // Only allow writes through Cloud Functions
      allow write: if false;
    }
  }
}
```

**Note:** With Firebase Functions handling all write operations, the Firestore rules are set to deny direct client writes for security. All data modifications go through the server-side functions.

## Database Structure

The application creates a collection called `canteens` with documents containing:

```javascript
{
  name: "Canteen Name",
  company: "Company Name",
  location: "City, Norway",
  description: "Optional description",
  ratings: [
    {
      rating: 5,
      comment: "Great food!",
      timestamp: Timestamp
    }
  ],
  averageRating: 4.5,
  totalRatings: 2,
  createdAt: Timestamp
}
```

## Available Firebase Functions

The application uses the following Firebase Functions:

- `addCanteen(data)` - Adds a new canteen to the database
- `addRating(data)` - Adds a rating to an existing canteen
- `getCanteens()` - Retrieves all canteens from the database

## Troubleshooting

- If you see "Firebase is not properly configured", check that you've replaced the placeholder config
- The application includes demo data that works without Firebase for testing
- Check the browser console for any error messages
- Ensure your Firebase project has Firestore and Functions enabled
- If Functions are not working, check that they are deployed: `firebase deploy --only functions`
- Check Firebase Functions logs: `firebase functions:log`