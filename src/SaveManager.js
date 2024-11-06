import { useState, useEffect, useCallback } from 'react';

const defaultSaveData = {
  money: 100, // Default money value if no save is found
};

const SaveManager = () => {
  const [money, setMoney] = useState(defaultSaveData.money);

  // Save data to localStorage
  const saveGame = (moneyToSave) => {
    const saveData = { money: moneyToSave };
    localStorage.setItem('gameSave', JSON.stringify(saveData));
  };

  // Load save data from localStorage with useCallback
  const loadSaveData = useCallback(() => {
    const savedData = localStorage.getItem('gameSave');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setMoney(parsedData.money);
    } else {
      saveGame(defaultSaveData.money); // Create a new save if none exists
    }
  }, []); // No dependencies

  // Automatically load the save file when the component mounts
  useEffect(() => {
    loadSaveData();
  }, [loadSaveData]); // loadSaveData in the dependency array

  // Function to modify money and save the game
  const updateMoney = (amount) => {
    setMoney((prevMoney) => {
      const newMoney = prevMoney + amount;
      saveGame(newMoney); // Pass the updated money
      return newMoney;
    });
  };

  return {
    money,
    saveGame,
    updateMoney,
  };
};

export default SaveManager;
