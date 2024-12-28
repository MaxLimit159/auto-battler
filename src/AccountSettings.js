import React, { useState, useEffect } from "react";
import 'font-awesome/css/font-awesome.min.css';
import { auth, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "./firebase";

const AccountSettings = ({ user, setUser, darkMode, updateDarkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState("main");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    updateDarkMode(!darkMode);
  };
  
  const clearAllFields = () => {
    setNewPassword("");
    setOldPassword("");
    setNewDisplayName("");
  }

  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
  }

  const handleUpdateDisplayName = async () => {
    try {
      const user = auth.currentUser;

      if(user.displayName === newDisplayName) {
        setErrorMessage("You are already using this name.");
        clearMessages();
        return
      }

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

    clearMessages();
  };

  const handleUpdatePassword = async () => {
    try {
      const user = auth.currentUser;
  
      // Ensure both old and new passwords are provided
      if (!oldPassword || !newPassword) {
        setErrorMessage("Please fill out both fields.");
        clearMessages();
        return;
      }

      // Ensure both old and new passwords are different
      if (oldPassword === newPassword) {
        setErrorMessage("Both passwords are the same.");
        clearMessages();
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

      setTimeout(() => {
        setErrorMessage("");
      }, 4000);
    }

    //Clear all the fields
    clearAllFields();

    clearMessages();
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
    <>
      <i className="fa fa-cog" onClick={() => {setIsModalOpen(true); setCurrentView('main');}}></i>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* Main Menu */}
            {currentView === "main" && (
              <>
                <h3>Account Settings</h3>
                {!user.isAnonymous && (
                  <>
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
                  </>
                )}
                <button onClick={toggleDarkMode}>{darkMode ? 'Switch to light mode' : 'Switch to dark mode'}</button>
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
    </>
  );
};
export default AccountSettings;