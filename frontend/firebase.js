// Import Firebase SDK functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration read from environment variables with fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY || "AIzaSyAOo7_Q7ou8yZmpWKbiSEykKo1uoKy-rn4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "reelbite-food-delivery.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "reelbite-food-delivery",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "reelbite-food-delivery.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "533665669672",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:533665669672:web:9ee8ae29c778b6bec44b1d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };