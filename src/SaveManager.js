import { useState, useEffect, useCallback } from 'react';
import { firestore, auth } from "./firebase"; // Import the Firebase config
import { doc, collection, setDoc, getDocs, updateDoc, query, orderBy, deleteDoc, getDoc } from "firebase/firestore";

const defaultSaveData = {
  money: 0,
  darkMode: false,
  player_characters: {
    knight: { level: 1, experience: 0, isUnlocked: true},
    rogue: { level: 1, experience: 0, isUnlocked: true},
    mage: { level: 1, experience: 0, isUnlocked: true},
    archer: { level: 1, experience: 0, isUnlocked: false},
    vampire: { level: 1, experience: 0, isUnlocked: false},
  },
  player_activeSkills: {
    skillHeal: {equipped: false, isUnlocked: false},
    skillFireball: {equipped: false, isUnlocked: false},
    skillPoison: {equipped: false, isUnlocked: false},
    skillDamageUp: {equipped: false, isUnlocked: false},
  },
  player_ownedPassives: {
    passiveSoulAbsorption: {name: "Soul Absorption", equipped: false, isUnlocked: false, isObtained: false},
    passiveBulwark: {name: "Bulwark", equipped: false, isUnlocked: false, isObtained: false},
    passiveDualWield: {name: "Dual Wield", equipped: false, isUnlocked: false, isObtained: false},
    passiveArcaneInfused: {name: "Arcane Infused", equipped: false, isUnlocked: false, isObtained: false},
    passiveLifeSteal: {name: "Life Steal", equipped: false, isUnlocked: false, isObtained: false},
    passivePoisonTip: {name: "Poison Tip", equipped: false, isUnlocked: false, isObtained: false},
  },
  player_personalHighScores: {
    player_theLichRaid: {id: 'theLichRaid', name: 'The Lich', score: 0, used_character: [], used_activeSkills: [], used_passives: []},
  }
  // Remember to add the new field to the useEffect in App.js
};
//Personal note: when adding a new field run the code "updateAllDocuments();" to update all existing data and add the new field to the useState in App.js
const SaveManager = () => {
  const [money, setMoney] = useState(defaultSaveData.money);
  const [player_characters, setCharacters] = useState(defaultSaveData.player_characters);
  const [player_activeSkills, setPlayerActiveSkills] = useState(defaultSaveData.player_activeSkills);
  const [player_ownedPassives, setPlayerOwnedPassives] = useState(defaultSaveData.player_ownedPassives);
  const [player_personalHighScores, setPlayerPersonalHighScores] = useState(defaultSaveData.player_personalHighScores);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedPassives, setSelectedPassives] = useState([]);
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(defaultSaveData.darkMode);

const mergeWithDefaults = (defaults, existing) => {
  // If existing data is completely missing, return defaults
  if (!existing) return defaults;

  const merged = { ...defaults };

  Object.keys(merged).forEach((key) => {
    if (typeof merged[key] === "object" && !Array.isArray(merged[key])) {
      // Recur for nested objects
      merged[key] = mergeWithDefaults(defaults[key], existing[key] || {});
    } else if (existing[key] !== undefined) {
      // Use the existing value if it exists
      merged[key] = existing[key];
    }
    // Otherwise, keep the default value
  });

  return merged;
};

// Function to update all documents in the "gameSaves" collection
// eslint-disable-next-line no-unused-vars
const updateAllDocuments = async () => {
  const collectionRef = collection(firestore, "gameSaves");

  try {
    const snapshot = await getDocs(collectionRef);

    // Loop through each document and update it
    for (const docSnap of snapshot.docs) {
      const docRef = doc(firestore, "gameSaves", docSnap.id);
      const existingData = docSnap.data();

      // Merge existing data with defaults
      const updatedData = mergeWithDefaults(defaultSaveData, existingData);

      // Update the Firestore document
      await updateDoc(docRef, updatedData);
      console.log(`Document ${docSnap.id} updated successfully!`);
    }
  } catch (error) {
    console.error("Error updating documents:", error);
  }
};

// Call the function to update all documents on component mount
// useEffect(() => {
//   updateAllDocuments();
// }, []);
  
  // Listen for authentication state changes (same logic as in Authentication.js)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Save data to localStorage
  const saveGame = async (moneyToSave, darkModeToSave, charactersToSave, skillsToSave, passivesToSave, highscoresToSave) => {
    // console.log("Saving game with the following data:");
    // console.log("Money:", moneyToSave);
    // console.log("Dark Mode:", darkModeToSave);
    // console.log("Characters:", charactersToSave);
    // console.log("Skills:", skillsToSave);
    // console.log("Passives:", passivesToSave);
    // console.log("Highscores:", highscoresToSave);
    try {
      const userSaveRef = doc(firestore, "gameSaves", user.uid);
      const currentSave = await getDoc(userSaveRef);
      const currentData = currentSave.exists() ? currentSave.data() : {};
  
      if (JSON.stringify(currentData) === JSON.stringify({ money: moneyToSave, darkMode: darkModeToSave, player_characters: charactersToSave, player_activeSkills: skillsToSave, player_ownedPassives: passivesToSave, player_personalHighScores: highscoresToSave })) {
        // console.log("No changes detected. Skipping save.");
        return;
      }
      await setDoc(userSaveRef, { money: moneyToSave, darkMode: darkModeToSave, player_characters: charactersToSave, player_activeSkills: skillsToSave, player_ownedPassives: passivesToSave, player_personalHighScores: highscoresToSave });
      console.log("Game saved successfully!");
    } catch (error) {
      console.error("Error saving game:", error);
    }
  };

  // Load save data from localStorage with useCallback
  const loadSaveData = useCallback(async (user) => {
    if (!user) {
      // No user logged in, load default save data
      console.log("No user logged in. Loading default save...");
      setMoney(defaultSaveData.money);
      setDarkMode(defaultSaveData.darkMode);
      setCharacters(defaultSaveData.player_characters);
      setPlayerActiveSkills(defaultSaveData.player_activeSkills);
      setPlayerOwnedPassives(defaultSaveData.player_ownedPassives);
      setPlayerPersonalHighScores(defaultSaveData.player_personalHighScores);
  
      // Set selected skills and passives to defaults
      setSelectedSkills([]);
      setSelectedPassives([]);
  
      return; // Return early to avoid further processing
    }

    try {
      const userSaveRef = doc(firestore, 'gameSaves', user.uid); // Use the Firebase user ID as document ID
      const savedData = await getDoc(userSaveRef);
      if (savedData.exists()) {
        const parsedData = savedData.data();
        // Check for missing or undefined data and fall back to default values
        setMoney(parsedData.money ?? defaultSaveData.money);
        setDarkMode(parsedData.darkMode ?? defaultSaveData.darkMode);
        setCharacters(parsedData.player_characters ?? defaultSaveData.player_characters);
        setPlayerActiveSkills(parsedData.player_activeSkills ?? defaultSaveData.player_activeSkills);
        setPlayerOwnedPassives(parsedData.player_ownedPassives ?? defaultSaveData.player_ownedPassives);
        setPlayerPersonalHighScores(parsedData.player_personalHighScores ?? defaultSaveData.player_personalHighScores);

        // Set selected skills and passives based on their 'equipped' status
        const equippedSkills = Object.keys(parsedData.player_activeSkills).filter(skillId => parsedData.player_activeSkills[skillId].equipped);
        setSelectedSkills(equippedSkills);

        const equippedPassives = Object.keys(parsedData.player_ownedPassives)
        .filter(passiveId => parsedData.player_ownedPassives[passiveId].equipped)
        .map(passiveId => ({
          id: passiveId,
          name: parsedData.player_ownedPassives[passiveId].name,
        }));
        setSelectedPassives(equippedPassives);
      } else {
        console.log("No save data found. Initializing default save...");
        saveGame(defaultSaveData.money, defaultSaveData.darkMode, defaultSaveData.player_characters, defaultSaveData.player_activeSkills, defaultSaveData.player_ownedPassives, defaultSaveData.player_personalHighScores); // Create a new save if none exists
      }
    } catch (error) {
      console.error("Error loading save data:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically load the save file when the component mounts and when the user logs in
  useEffect(() => {
    loadSaveData(user);
  }, [user, loadSaveData]); // loadSaveData in the dependency array

  // Function to modify money and save the game
  const updateMoney = (amount) => {
    setMoney((prevMoney) => {
      const newMoney = prevMoney + amount;
      saveGame(newMoney, darkMode, player_characters, player_activeSkills, player_ownedPassives, player_personalHighScores);
      return newMoney;
    });
  };

  const updateDarkMode = (newDarkMode) => {
    setDarkMode(newDarkMode);
    saveGame(money, newDarkMode, player_characters, player_activeSkills, player_ownedPassives, player_personalHighScores);
  }

  // Function to modify character progressions and save the game
  const updateCharacterLevel = (characterId, newLevel, newExperience, newIsUnlocked) => {
    setCharacters((prevCharacters) => {
      const updatedCharacters = { ...prevCharacters };
      if (updatedCharacters[characterId]) {
        if (newLevel !== undefined) updatedCharacters[characterId].level = newLevel;
        if (newExperience !== undefined) updatedCharacters[characterId].experience = newExperience;
        if (newIsUnlocked !== undefined) updatedCharacters[characterId].isUnlocked = newIsUnlocked;

        saveGame(money, darkMode, updatedCharacters, player_activeSkills, player_ownedPassives, player_personalHighScores);
      }
      return updatedCharacters;
    });
  };

  // Function to modify player skills progressions and save the game
  const updatePlayerActiveSkills = (activeSkillId, newIsUnlocked, newEquipped) => {
    setPlayerActiveSkills((prevSkills) => {
      const updatedPlayerActiveSkills = { ...prevSkills };
      if (updatedPlayerActiveSkills[activeSkillId]) {
        if (newIsUnlocked !== undefined) updatedPlayerActiveSkills[activeSkillId].isUnlocked = newIsUnlocked;
        if (newEquipped !== undefined) updatedPlayerActiveSkills[activeSkillId].equipped = newEquipped;
        saveGame(money, darkMode, player_characters, updatedPlayerActiveSkills, player_ownedPassives, player_personalHighScores);
      }
      return updatedPlayerActiveSkills;
    });
  };

  // Function to modify player skills progressions and save the game
  const updatePlayerOwnedPassives = (passiveId, newIsUnlocked, newEquipped, newIsObtained) => {
    setPlayerOwnedPassives((prevPassives) => {
      const updatedPlayerOwnedPassives = { ...prevPassives };
      if (updatedPlayerOwnedPassives[passiveId]) {
        if (newIsUnlocked !== undefined) updatedPlayerOwnedPassives[passiveId].isUnlocked = newIsUnlocked;
        if (newEquipped !== undefined) updatedPlayerOwnedPassives[passiveId].equipped = newEquipped;
        if (newIsObtained !== undefined) updatedPlayerOwnedPassives[passiveId].isObtained = newIsObtained;
        saveGame(money, darkMode, player_characters, player_activeSkills, updatedPlayerOwnedPassives, player_personalHighScores);
      }
      return updatedPlayerOwnedPassives;
    });
  };

  const updateLeaderboard = async (raidId, playerData) => {
    const leaderboardRef = collection(firestore, `leaderboards/${raidId}/entries`);
    try {
      // Fetch current leaderboard entries, sorted by score in descending order
      const leaderboardQuery = query(leaderboardRef, orderBy("score", "desc"));
      const snapshot = await getDocs(leaderboardQuery);
  
      let entries = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
      });
  
      // Check if the player already has an entry in the leaderboard
      const existingEntryIndex = entries.findIndex((entry) => entry.player_id === playerData.player_id);
  
      if (existingEntryIndex !== -1) {
        // Update the existing player's score if the new score is higher
        if (playerData.score > entries[existingEntryIndex].score) {
          const existingEntryRef = doc(leaderboardRef, entries[existingEntryIndex].id);
          await updateDoc(existingEntryRef, playerData);
          // console.log("Player's score updated on the leaderboard!");
        } else {
          console.log("Player's score did not beat their existing leaderboard entry."); //Shouldn't happen cuz i've already checked for a new highscore
        }
      } else {
        // Add the new score if it qualifies for the top 3
        if (entries.length < 3 || playerData.score > entries[entries.length - 1].score) {
          const newEntryRef = doc(leaderboardRef);
          await setDoc(newEntryRef, playerData);
  
          // Sort the leaderboard after adding the new score
          entries.push({ id: newEntryRef.id, ...playerData });
          entries.sort((a, b) => b.score - a.score);
  
          // Remove the lowest score if the leaderboard exceeds the limit
          if (entries.length > 3) {
            const lowestEntry = entries.pop();
            await deleteDoc(doc(leaderboardRef, lowestEntry.id));
          }
  
          // console.log("Leaderboard updated successfully!");
        } else {
          // console.log("Score did not qualify for the leaderboard.");
        }
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  };

  const updateRaidScore = (raidId, raidName, score, playerChar) => {
    setPlayerPersonalHighScores((prevHighScores) => {
      const updatedHighScores = { ...prevHighScores };
  
      if (!updatedHighScores[`player_${raidId}`]) {
        console.log("Couldn't find the raid data. Please notify the developer.");
        return prevHighScores;
      }
  
      if (score > updatedHighScores[`player_${raidId}`].score) {
        console.log("You achieved a new highscore of ", score, " on ", raidName);
        updatedHighScores[`player_${raidId}`].score = score;
        updatedHighScores[`player_${raidId}`].used_character = [playerChar];
        updatedHighScores[`player_${raidId}`].used_activeSkills = selectedSkills;
        updatedHighScores[`player_${raidId}`].used_passives = selectedPassives;
  
        saveGame(money, darkMode, player_characters, player_activeSkills, player_ownedPassives, updatedHighScores);
        
        // Check leaderboard after updating personal high score
        if (user && user.displayName) {
          updateLeaderboard(raidId, {
            player_id: user.uid,
            player_name: user.displayName,
            score,
            character: playerChar,
            used_activeSkills: selectedSkills,
            used_passives: selectedPassives,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.log("Anonymous players are not eligible for leaderboard placement.");
        }
      }
  
      return updatedHighScores;
    });
  };
  
  const fetchLeaderboard = async (raidId) => {
    const leaderboardRef = collection(firestore, `leaderboards/${raidId}/entries`);
  
    try {
      // Create a query to fetch leaderboard entries, ordered by score (descending)
      const leaderboardQuery = query(leaderboardRef, orderBy("score", "desc"));
      const snapshot = await getDocs(leaderboardQuery);
  
      // Create an array to store leaderboard entries
      let leaderboardEntries = [];
      snapshot.forEach((doc) => {
        leaderboardEntries.push({ id: doc.id, ...doc.data() });
      });
  
      // Return the leaderboard entries
      return leaderboardEntries;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  return {
    money,
    darkMode,
    player_characters,
    player_activeSkills,
    player_ownedPassives,
    player_personalHighScores,
    selectedPassives,
    selectedSkills,
    saveGame,
    updateMoney,
    updateDarkMode,
    updateCharacterLevel,
    updatePlayerActiveSkills,
    updatePlayerOwnedPassives,
    updateRaidScore,
    setSelectedPassives,
    setSelectedSkills,
    fetchLeaderboard,
  };
};

export default SaveManager;
