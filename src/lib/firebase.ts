
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth'; // Added GoogleAuthProvider
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider(); // Create a GoogleAuthProvider instance

export { app, auth, db, googleProvider }; // Export googleProvider

// It's highly recommended to set up Firestore security rules.
// For example, to ensure users can only access their own invoices:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/invoices/{invoiceId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    // Rules for the public 'invoices' collection
    match /invoices/{publicInvoiceId} {
      // Allow read by anyone for public preview
      allow read: if true; 
      // Allow write only if the user is authenticated and the invoice's userId matches,
      // OR if there's no userId (e.g., anonymous invoice creation, adjust as needed)
      allow write: if request.auth != null && 
                      (request.resource.data.userId == request.auth.uid || request.resource.data.userId == null);
    }
  }
}
*/

