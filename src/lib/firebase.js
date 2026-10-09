// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"
import { getAuth, setPersistence, browserSessionPersistence, GoogleAuthProvider, FacebookAuthProvider} from "firebase/auth";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDekV7p2Nqn--NW4gYj9UsGcASPCyVr8mw",
  authDomain: "music-araasoftwares.firebaseapp.com",
  databaseURL: "https://music-araasoftwares-default-rtdb.firebaseio.com",
  projectId: "music-araasoftwares",
  storageBucket: "music-araasoftwares.firebasestorage.app",
  messagingSenderId: "191691446325",
  appId: "1:191691446325:web:0f3b11919254ef20a4397c",
  measurementId: "G-9VRFS6NNC2"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const facebookProvider = new FacebookAuthProvider()
export default auth;

setPersistence(auth, browserSessionPersistence)
  .catch((error) => {
    console.error("Persistence error:", error.code, error.message);
  });

