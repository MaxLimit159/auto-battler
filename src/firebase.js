// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNeX48AmYbOmsWj8XfqxbT8uogxsJrqP4",
  authDomain: "reactsavemanager.firebaseapp.com",
  projectId: "reactsavemanager",
  storageBucket: "reactsavemanager.firebasestorage.app",
  messagingSenderId: "124725923506",
  appId: "1:124725923506:web:47b647072d4d59e54a83ab",
  measurementId: "G-1ZBM4W7L9T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { auth, db, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential };