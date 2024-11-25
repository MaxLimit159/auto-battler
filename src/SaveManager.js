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
};

const SaveManager = () => {
  const [money, setMoney] = useState(defaultSaveData.money);
  const [player_characters, setCharacters] = useState(defaultSaveData.player_characters);

  // Save data to localStorage
  const saveGame = (moneyToSave, charactersToSave) => {
    const saveData = {
      money: moneyToSave,
      player_characters: charactersToSave
    };
    localStorage.setItem('gameSave', JSON.stringify(saveData));
  };

  // Load save data from localStorage with useCallback
  const loadSaveData = useCallback(() => {
    const savedData = localStorage.getItem('gameSave');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // If money is missing, set it to the default value
      if (parsedData.money === undefined) {
        setMoney(defaultSaveData.money);
      } else {
        setMoney(parsedData.money);
      }

      // If player_characters is missing, set it to the default value
      if (parsedData.player_characters === undefined) {
        setCharacters(defaultSaveData.player_characters);
      } else {
        setCharacters(parsedData.player_characters);
      }
    } else {
      saveGame(defaultSaveData.money, defaultSaveData.player_characters); // Create a new save if none exists
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
      saveGame(newMoney, player_characters);
      return newMoney;
    });
  };

  // Function to modify character progressions and save the game
  const updateCharacterLevel = (characterId, newLevel, newExperience, newIsUnlocked) => {
    setCharacters((prevCharacters) => {
      const updatedCharacters = { ...prevCharacters };
      if (updatedCharacters[characterId]) {
        if(newLevel !== undefined){
          updatedCharacters[characterId].level = newLevel;
        }
        if(newExperience !== undefined){
          updatedCharacters[characterId].experience = newExperience;
        }
        if(newIsUnlocked !== undefined){
          updatedCharacters[characterId].isUnlocked = newIsUnlocked;
        }
        saveGame(money, updatedCharacters);
      }
      return updatedCharacters;
    });
  };

  return {
    money,
    player_characters,
    saveGame,
    updateMoney,
    updateCharacterLevel,
  };
};

export default SaveManager;
