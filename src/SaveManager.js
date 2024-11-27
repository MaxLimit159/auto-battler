import { useState, useEffect, useCallback } from 'react';

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
};

const SaveManager = () => {
  const [money, setMoney] = useState(defaultSaveData.money);
  const [player_characters, setCharacters] = useState(defaultSaveData.player_characters);
  const [player_activeSkills, setPlayerActiveSkills] = useState(defaultSaveData.player_activeSkills);

  // Save data to localStorage
  const saveGame = (moneyToSave, charactersToSave, skillsToSave) => {
    const saveData = {
      money: moneyToSave,
      player_characters: charactersToSave,
      player_activeSkills: skillsToSave,
    };
    localStorage.setItem('gameSave', JSON.stringify(saveData));
  };

  // Load save data from localStorage with useCallback
  const loadSaveData = useCallback(() => {
    const savedData = localStorage.getItem('gameSave');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Check for missing or undefined data and fall back to default values
      setMoney(parsedData.money ?? defaultSaveData.money);
      setCharacters(parsedData.player_characters ?? defaultSaveData.player_characters);
      setPlayerActiveSkills(parsedData.player_activeSkills ?? defaultSaveData.player_activeSkills);
    } else {
      saveGame(defaultSaveData.money, defaultSaveData.player_characters, defaultSaveData.player_activeSkills); // Create a new save if none exists
    }
  }, []);

  // Automatically load the save file when the component mounts
  useEffect(() => {
    loadSaveData();
  }, [loadSaveData]); // loadSaveData in the dependency array

  // Function to modify money and save the game
  const updateMoney = (amount) => {
    setMoney((prevMoney) => {
      const newMoney = prevMoney + amount;
      saveGame(newMoney, player_characters, player_activeSkills);
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

        saveGame(money, updatedCharacters, player_activeSkills);
      }
      return updatedCharacters;
    });
  };

  // Function to modify player skills progressions and save the game
  const updatePlayerActiveSkills = (activeSkillId, newIsUnlocked, newEquipped) => {
    setPlayerActiveSkills((prevSkills) => {
      const updatedPlayerActiveSkills = { ...prevSkills };
      if (updatedPlayerActiveSkills[activeSkillId]) {
        updatedPlayerActiveSkills[activeSkillId].isUnlocked = newIsUnlocked;
        updatedPlayerActiveSkills[activeSkillId].equipped = newEquipped;
        saveGame(money, player_characters, updatedPlayerActiveSkills);
      }
      return updatedPlayerActiveSkills;
    });
  };

  return {
    money,
    player_characters,
    player_activeSkills,
    saveGame,
    updateMoney,
    updateCharacterLevel,
    updatePlayerActiveSkills,
  };
};

export default SaveManager;
