import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

// Firebase configuration
// Replace these values with your Firebase project config
// You can find these in your Firebase Console > Project Settings > General
const firebaseConfig = {
    apiKey: "AIzaSyACbFg7Q1xsTWB7v0c1-GpTgio5QrS7bSs",

    authDomain: "chatapp-14875.firebaseapp.com",
  
    databaseURL: "https://chatapp-14875-default-rtdb.firebaseio.com",
  
    projectId: "chatapp-14875",
  
    storageBucket: "chatapp-14875.firebasestorage.app",
  
    messagingSenderId: "127771120080",
  
    appId: "1:127771120080:web:d12cb2ca57e653395169d5",
  
    measurementId: "G-EZMGHNJ5KV"
  
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth
// Note: Firebase Auth automatically persists authentication state in React Native
const auth: Auth = getAuth(app);

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Storage
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
export default app;

