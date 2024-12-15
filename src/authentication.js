import React, { useState, useEffect } from "react";
import { auth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "./firebase";

const Authentication = ({ user, setUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Initially, show Sign In modal
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // State to store error messages

  useEffect(() => {
    // Check if the user is already signed in
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false); // Stop loading once auth state is resolved
    });

    return () => unsubscribe(); // Cleanup on component unmount
  }, [setUser]);

  // Anonymous Sign-In
  const loginAsGuest = async () => {
    try {
      setIsLoading(true); // Show loading state
      const userCredential = await signInAnonymously(auth);
      setUser(userCredential.user);
      console.log("Signed in as anonymous user:", userCredential.user);
      setIsModalOpen(false); // Close modal after successful sign-up
      setErrorMessage(""); // Clear error message on successful sign-up
    } catch (error) {
      setErrorMessage("Error during anonymous sign-in: " + error.message);
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in successfully:", userCredential.user);
      setUser(userCredential.user);
      setIsModalOpen(false); // Close modal after successful sign-in
      setErrorMessage(""); // Clear error message on successful sign-in
    } catch (error) {
      setErrorMessage("Invalid email or password. Please try again.");
      console.error("Error during sign-in:", error.message);
    }
  };

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("New user signed up successfully:", userCredential.user);

      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: displayName });
      }

      setUser(userCredential.user);
      setIsModalOpen(false); // Close modal after successful sign-up
      setErrorMessage(""); // Clear error message on successful sign-up
    } catch (error) {
      switch (error.code) {
        case "auth/email-already-in-use":
          setErrorMessage("The email address is already in use. Please try logging in.");
          break;
        case "auth/invalid-email":
          setErrorMessage("The email address is invalid. Please check the format.");
          break;
        case "auth/weak-password":
          setErrorMessage("Your password is too weak. Please use at least 6 characters.");
          break;
        case "auth/missing-email":
          setErrorMessage("Please enter a valid email address.");
          break;
        case "auth/network-request-failed":
          setErrorMessage("Network error occurred. Please check your connection.");
          break;
        default:
          setErrorMessage("Error during sign-up: " + error.message);
          break;
      }
      console.error("Error during sign-up:", error.message);
    }
  };

  return (
    <div>
      {isLoading ? (
        <h3>Loading...</h3>
      ) : user ? (
        <div>
          <h4>Welcome, {user.isAnonymous ? "Anonymous User" : user.displayName}</h4>
        </div>
      ) : (
        <div>
          <h4>Sign in to save your progress</h4>
          <button onClick={() => setIsModalOpen(true)}>Sign In</button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="sign-in-modal-overlay">
          <div className="sign-in-modal">
            <h3>{isSignUp ? "Sign Up" : "Sign In"}</h3>
            {isSignUp && (
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>} {/* Display error message */}
            <p onClick={() => setIsSignUp(!isSignUp)} style={{ cursor: "pointer", color: "blue" }}>
              {isSignUp ? "Already have an account? Sign in here!" : "Don't have an account? Sign up here!"}
            </p>
            <button onClick={isSignUp ? handleSignUp : handleSignIn}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>
            <button onClick={loginAsGuest}>Sign In as Guest</button>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authentication;