import React, { useState } from "react";
import 'font-awesome/css/font-awesome.min.css';
import { auth, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "./firebase";

const AccountSettings = ({ user, setUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState("main");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const clearAllFields = () => {
    setNewPassword("");
    setOldPassword("");
    setNewDisplayName("");
  }
  const handleUpdateDisplayName = async () => {
    try {
      const user = auth.currentUser;

      if (newDisplayName) {
        await updateProfile(user, { displayName: newDisplayName });
        setSuccessMessage("Display name updated successfully!");
      } else {
        setErrorMessage("Display name cannot be empty.");
      }
    } catch (error) {
      setErrorMessage("Error updating display name: " + error.message);
    }
    
    //Clear all the fields
    clearAllFields();
  };

  const handleUpdatePassword = async () => {
    try {
      const user = auth.currentUser;
  
      // Ensure both old and new passwords are provided
      if (!oldPassword || !newPassword) {
        setErrorMessage("Please fill out both fields.");
        return;
      }
  
      // Reauthenticate the user with their old password
      const credential = EmailAuthProvider.credential(
        user.email, // Email is required for reauthentication
        oldPassword
      );
      await reauthenticateWithCredential(user, credential);
  
      // Update the password after successful reauthentication
      await updatePassword(user, newPassword);
  
      setSuccessMessage("Password updated successfully!");
      setErrorMessage(""); // Clear any previous error messages

      // Remove the success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        setErrorMessage("The current password is incorrect.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("The new password is too weak. Password should be at least 6 characters.");
      } else {
        setErrorMessage("Error updating password: " + error.message);
      }

      // Remove the error message after 5 seconds
      setTimeout(() => {
        setErrorMessage("");
      }, 4000);
    }

    //Clear all the fields
    clearAllFields();
  };

  const handleLogOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error during logout:", error.message);
    }
  };

  return (
    <div>
      <i className="fa fa-cog" onClick={() => setIsModalOpen(true)}></i>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            {/* Main Menu */}
            {currentView === "main" && (
              <>
                <h3>Account Settings</h3>
                <button
                  onClick={() => setCurrentView("displayName")}
                  style={{ display: "block", marginBottom: "10px" }}
                >
                  Change Display Name
                </button>
                <button
                  onClick={() => setCurrentView("password")}
                  style={{ display: "block", marginBottom: "10px" }}
                >
                  Change Password
                </button>
                <button onClick={handleLogOut}>Log Out</button>
                <button onClick={() => setIsModalOpen(false)}>Close</button>
              </>
            )}

            {/* Change Display Name Menu */}
            {currentView === "displayName" && (
              <div>
                <h3>Change Display Name</h3>
                <input
                  type="text"
                  placeholder={user.displayName || "New Display Name"}
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  style={{ display: "block", marginBottom: "10px" }}
                />
                <button
                  onClick={handleUpdateDisplayName}
                  style={{ marginRight: "10px" }}
                >
                  Save
                </button>
                <button onClick={() => setCurrentView("main")}>Back</button>

                {/* Success/Error Messages */}
                {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
              </div>
            )}

            {/* Change Password Menu */}
            {currentView === "password" && (
              <div>
                <h3>Change Password</h3>
                {/* Old Password Input */}
                <input
                  type="password"
                  placeholder="Current Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ display: "block", marginBottom: "10px" }}
                />

                {/* New Password Input */}
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ display: "block", marginBottom: "10px" }}
                />
                <button
                  onClick={handleUpdatePassword}
                  style={{ marginRight: "10px" }}
                >
                  Save
                </button>
                <button onClick={() => setCurrentView("main")}>Back</button>

                {/* Success/Error Messages */}
                {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountSettings;