import { useState, useEffect, useCallback } from 'react';
import { firestore, auth } from "./firebase"; // Import the Firebase config
import { doc, setDoc, getDoc, collection, updateDoc, getDocs } from "firebase/firestore";

const defaultSaveData = {
  money: 0,
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

// eslint-disable-next-line no-unused-vars
  const updateAllDocuments = async () => {
    const collectionRef = collection(firestore, "gameSaves");
  
    try {
      const snapshot = await getDocs(collectionRef);
  
      snapshot.forEach(async (docSnap) => {
        const docRef = doc(firestore, "gameSaves", docSnap.id);
        const existingData = docSnap.data();
  
        // Merge existing data with defaults, filling in any missing fields
        const updatedData = mergeWithDefaults(defaultSaveData, existingData);

        await updateDoc(docRef, updatedData);
        console.log(`Document ${docSnap.id} updated successfully!`);
      });
    } catch (error) {
      console.error("Error updating documents:", error);
    }
  };
  
  // Helper function to recursively merge default data with existing data
  const mergeWithDefaults = (defaults, existing) => {
    const merged = { ...defaults };
  
    Object.keys(existing).forEach((key) => {
      if (typeof existing[key] === "object" && !Array.isArray(existing[key])) {
        merged[key] = mergeWithDefaults(defaults[key] || {}, existing[key]);
      } else {
        merged[key] = existing[key];
      }
    });
  
    return merged;
  };
  
  // Call the function to update all documents
  // useEffect(() => {
  //   // updateAllDocuments();
  // }, []);
  
  // Listen for authentication state changes (same logic as in Authentication.js)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user); // Set user state when auth state changes
    });
    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  // Save data to localStorage
  const saveGame = async (moneyToSave, charactersToSave, skillsToSave, passivesToSave, highscoresToSave) => {
    try {
      const userSaveRef = doc(firestore, "gameSaves", user.uid);
      const currentSave = await getDoc(userSaveRef);
      const currentData = currentSave.exists() ? currentSave.data() : {};
  
      if (JSON.stringify(currentData) === JSON.stringify({ money: moneyToSave, player_characters: charactersToSave, player_activeSkills: skillsToSave, player_ownedPassives: passivesToSave, player_personalHighScores: highscoresToSave })) {
        // console.log("No changes detected. Skipping save.");
        return;
      }
      await setDoc(userSaveRef, { money: moneyToSave, player_characters: charactersToSave, player_activeSkills: skillsToSave, player_ownedPassives: passivesToSave, player_personalHighScores: highscoresToSave });
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
        setCharacters(parsedData.player_characters ?? defaultSaveData.player_characters);
        setPlayerActiveSkills(parsedData.player_activeSkills ?? defaultSaveData.player_activeSkills);
        setPlayerOwnedPassives(parsedData.player_ownedPassives ?? defaultSaveData.player_ownedPassives);
        setPlayerPersonalHighScores(parsedData.player_personalHighScores ?? defaultSaveData.player_personalHighScores);

        // Set selected skills and passives based on their 'equipped' status
        const equippedSkills = Object.keys(parsedData.player_activeSkills).filter(skillId => parsedData.player_activeSkills[skillId].equipped);
        setSelectedSkills(equippedSkills); // Set the selected skills

        const equippedPassives = Object.keys(parsedData.player_ownedPassives).filter(passiveId => parsedData.player_ownedPassives[passiveId].equipped);
        setSelectedPassives(equippedPassives); // Set the selected passives
      } else {
        console.log("No save data found. Initializing default save...");
        saveGame(defaultSaveData.money, defaultSaveData.player_characters, defaultSaveData.player_activeSkills, defaultSaveData.player_ownedPassives, defaultSaveData.player_personalHighScores); // Create a new save if none exists
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
      saveGame(newMoney, player_characters, player_activeSkills, player_ownedPassives, player_personalHighScores);
      return newMoney;
    });
  };

  // Function to modify character progressions and save the game
  const updateCharacterLevel = (characterId, newLevel, newExperience, newIsUnlocked) => {
    setCharacters((prevCharacters) => {
      const updatedCharacters = { ...prevCharacters };
      if (updatedCharacters[characterId]) {
        if (newLevel !== undefined) updatedCharacters[characterId].level = newLevel;
        if (newExperience !== undefined) updatedCharacters[characterId].experience = newExperience;
        if (newIsUnlocked !== undefined) updatedCharacters[characterId].isUnlocked = newIsUnlocked;

        saveGame(money, updatedCharacters, player_activeSkills, player_ownedPassives, player_personalHighScores);
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
        saveGame(money, player_characters, updatedPlayerActiveSkills, player_ownedPassives, player_personalHighScores);
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
        saveGame(money, player_characters, player_activeSkills, updatedPlayerOwnedPassives, player_personalHighScores);
      }
      return updatedPlayerOwnedPassives;
    });
  };

  const updateRaidScore = (raidId, raidName, score, playerChar) => {
    setPlayerPersonalHighScores((prevHighScores) => {
      const updatedHighScores = { ...prevHighScores };
  
      if (!updatedHighScores[`player_${raidId}`]) {
        console.log("Couldn't find the raid data. Please notify the developer.");
      }
  
      if (score > updatedHighScores[`player_${raidId}`].score) {
        console.log("You achieved a new highscore of ", score, " on ", raidName);
        updatedHighScores[`player_${raidId}`].score = score;
        updatedHighScores[`player_${raidId}`].used_character = [playerChar];
        updatedHighScores[`player_${raidId}`].used_activeSkills = selectedSkills;
        updatedHighScores[`player_${raidId}`].used_passives = selectedPassives;
  
        saveGame(money, player_characters, player_activeSkills, player_ownedPassives, updatedHighScores);
      }
  
      return updatedHighScores;
    });
  };
  

  return {
    money,
    player_characters,
    player_activeSkills,
    player_ownedPassives,
    player_personalHighScores,
    selectedPassives,
    selectedSkills,
    saveGame,
    updateMoney,
    updateCharacterLevel,
    updatePlayerActiveSkills,
    updatePlayerOwnedPassives,
    updateRaidScore,
    setSelectedPassives,
    setSelectedSkills
  };
};

export default SaveManager;
