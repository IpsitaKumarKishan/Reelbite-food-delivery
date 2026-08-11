// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY || "AIzaSyAOo7_Q7ou8yZmpWKbiSEykKo1uoKy-rn4",
  authDomain: "reelbite-food-delivery.firebaseapp.com",
  projectId: "reelbite-food-delivery",
  storageBucket: "reelbite-food-delivery.firebasestorage.app",
  messagingSenderId: "533665669672",
  appId: "1:533665669672:web:9ee8ae29c778b6bec44b1d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export { app, auth };