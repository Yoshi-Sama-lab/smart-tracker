import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyCSn9seXhHRwhQ8BFyK9rk0kv555c2EV2E",
  authDomain: "student-os-arpit.firebaseapp.com",
  projectId: "student-os-arpit",
  storageBucket: "student-os-arpit.firebasestorage.app",
  messagingSenderId: "680672989484",
  appId: "1:680672989484:web:c43bfe26e38d11a17d5c89",
  measurementId: "G-6YCRL4W7Y7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
