import './App.css';
import { useState, useRef, useEffect, useMemo } from 'react';
import Attack from './Attacks.js'; // Import the new Attack component
import HealthBar from './BattleModeComponents/HealthBar.js';
// import { playableCharacterList } from './charactersFiles/playable_characters.js';
import { characterList } from './charactersFiles/characters.js';
import { passiveDescriptions } from './passives';
import { animations } from './animations'
import { activeSkills } from './activeSkills.js';
import SaveManager from './SaveManager';
import { motion } from "framer-motion"
import { statusEffects } from './statusEffects.js';

const initialStageData = [
  {
    stageName: 'Graveyard',
    enemies: [
      { name: 'zombie', level: 1 },
      { name: 'ghost', level: 1 },
      { name: 'necromancer', level: 1 },
    ],
  },
  {
    stageName: 'Challenge the King!',
    enemies: [
      { name: 'mimicKing', level: 1 },
    ],
  },
  {
    stageName: 'Challenge the Archmage!',
    enemies: [
      { name: 'archmage', level: 1 },
    ],
  },
]
// Function to get the description of a passive by its name
const getPassiveDescription = (passiveName) => {
  const passive = passiveDescriptions.find(p => p.name === passiveName);
  return passive 
    ? `<b>${passive.name}</b>: ${passive.description}` 
    : `<b>${passiveName}</b>: Can not find description`;
};
// const characterKeys = Object.keys(characterList);
function App() {
  const [mode, setMode] = useState('Start');
  const [player, setPlayer] = useState(null);
  const [enemy, setEnemy] = useState('');
  const [turn, setTurn] = useState('');
  const [winner, setWinner] = useState('');
  const [playerHealthColor, setPlayerHealthColor] = useState('');
  const [enemyHealthColor, setEnemyHealthColor] = useState('');
  const [playerAnimation, setPlayerAnimation] = useState("idle");
  const [enemyAnimation, setEnemyAnimation] = useState("idle");
  const baseCharacterList = JSON.parse(JSON.stringify(characterList));
  //Manage shop UI
  const [shopTab, setShopTab] = useState('characters');
  const [isShopOpen, setIsShopOpen] = useState(false);
  //Manage stage data
  const [stageData, setStageData] = useState(initialStageData);
  //Manage and load player data
  const { money, player_characters, player_activeSkills, player_ownedPassives, updateMoney, updateCharacterLevel, updatePlayerActiveSkills, updatePlayerOwnedPassives, saveGame } = SaveManager();
  useEffect(() => {
    saveGame(money, player_characters, player_activeSkills, player_ownedPassives);
  }, [money, player_characters, player_activeSkills, player_ownedPassives, saveGame]);

  const [logs, setLogs] = useState([]); // State to store logs
  useEffect(() => {
    // Save the original console.log function
    const originalConsoleLog = console.log;

    // Override console.log
    console.log = (...args) => {
      // Create the log message
      const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');

      // Add the new log to the state
      setLogs((prevLogs) => [...prevLogs, logMessage]);

      // Call the original console.log so it still logs to the console
      originalConsoleLog(...args);
    };

    // Cleanup: Restore the original console.log on component unmount
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  useEffect(() => {
    const passivesToMakeObtained = {
      knight: 'passiveBulwark',
      rogue: 'passiveDualWield',
      mage: 'passiveArcaneInfused',
      archer: 'passivePoisonTip',
      vampire: 'passiveLifeSteal',
    };
  
    Object.entries(passivesToMakeObtained).forEach(([characterId, passiveId]) => {
      const character = player_characters[characterId];
      const passive = player_ownedPassives[passiveId];
      // Check if the character exists and meets conditions
      if (
        character &&
        character.level >= 10 &&
        passive &&
        !passive.isObtained
      ) {
        updatePlayerOwnedPassives(passiveId, undefined, undefined, true);
      }
    });
  }, [player_characters, player_ownedPassives, updatePlayerOwnedPassives]);

  const calculateExperienceForNextLevel = (level) => level * 100;
  const getLevelUppedStats = (character) => {
    const levelMultiplier = 1 + (character.level - 1) * 0.05;
    // Apply the scaling and round down each stat
    character.maxHealth = Math.floor(character.maxHealth * levelMultiplier);
    character.health = Math.floor(character.maxHealth);
    character.damage = Math.floor(character.damage * levelMultiplier);
    character.speed = Math.floor(character.speed * levelMultiplier);
    character.money_drop = Math.floor(character.money_drop * levelMultiplier);
    character.experience_drop = Math.floor(character.experience_drop * levelMultiplier);
  
    // Add new passives based on level
    if (character.passiveUnlocks) {
      for (const [level, passive] of Object.entries(character.passiveUnlocks)) {
        if (character.level >= parseInt(level)) {
          if (!character.passives.includes(passive)) {
            character.passives.push(passive);
          }
        }
      }
    }

    // Add all equipped passives to the character's passives array
    if (character.passives && character.playable === true) {
      for (const [, passiveData] of Object.entries(player_ownedPassives)) {
        if (passiveData?.equipped && passiveData?.name) {
          if (!character.passives.includes(passiveData.name)) {
            character.passives.push(passiveData.name);
          }
        }
      }
    }
    if (character.passives.includes("Dual Wield")){
      character.skills = ['doubleAttack'];
    }
    if (character.passives.includes("Magic Barrier")){
      character.shield += Math.floor(character.maxHealth / 2);
    }
    if (character.passives.includes("Archmage Codex")) {
      const Effect = { ...statusEffects.codexArcaneAssault };
      if (!character.status_effects) {
        character.status_effects = [];
      }
      if (!character.status_effects.some(effect => effect.name === "Arcmage Codex: Arcane Assault")) {
        character.status_effects.push(Effect);
      }
    }
    return character;
  };
  const createCharacter = (name, level = 1, experience = 0) => {
    // Clone the base character from the baseCharacterList
    const baseCharacter = {...baseCharacterList[name]};
  
    if (!baseCharacter) {
      throw new Error(`Character ${name} not found in characterList`);
    }

    // Set initial level
    const character = { ...baseCharacter, level, experience };
    //Return the character with the proper stats based on the given level
    return getLevelUppedStats(character);
  };

  //Varriables to pass over to Attack.js
  const gameEnded = useRef(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const animationVarriants = useMemo(() => animations, []);//Note to self: animation is memorized with no dependencies so dont try to change it with codes
  const [enemyQueue, setEnemyQueue] = useState(null);
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState();
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedPassives, setSelectedPassives] = useState([]);

  //Timer for next battle states
  const [countdown, setCountdown] = useState(5);  // Timer starting at 5 seconds
  const [timerActive, setTimerActive] = useState(false);
  const nextBattleTimer = useRef(null);

  const selectCharacter = (characterId) => {
    //Remember the id
    setCurrentPlayerId(characterId);
    setMode('StageSelection');
  };

  const selectStage = (stageId) => {
    const selectedStage = stageData[stageId];
    const newEnemyQueue = selectedStage.enemies.map(({ name, level }) => createCharacter(name, level));
    setEnemyQueue(newEnemyQueue);
  }

  useEffect(() => {
    if (enemyQueue && enemyQueue.length > 0) {
      startGame();
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [enemyQueue]);

  const startGame = () =>{
    setLogs([]);
    //Set enemy
    let enemyCharacter = enemyQueue[currentEnemyIndex];
    setEnemy(enemyQueue[currentEnemyIndex]);
    //Set player
    let playerCharacter = createCharacter(currentPlayerId, player_characters[currentPlayerId].level, player_characters[currentPlayerId].experience);
    setPlayer(playerCharacter);
    let initialTurn = playerCharacter.speed >= enemyCharacter.speed ? 'Player' : 'Enemy';
    setTurn(initialTurn);
    setMode('Battle');
    setWinner('');
    gameEnded.current = false;
    //Due to ascyn, im setting the new index here so when startGame runs again it has the updated index
    let nextIndex = currentEnemyIndex + 1;
    setCurrentEnemyIndex(nextIndex);
  }
  
  const endGame = (winner) => {
    if (winner === 'Player' && currentEnemyIndex <= enemyQueue.length - 1) {
      // Move to the next enemy

      setMode('EndBattle');
      setWinner(winner);

      setCountdown(5);
      setTimerActive(true);
      nextBattleTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(nextBattleTimer.current);  // Stop the countdown
            setTimerActive(false);
            startGame();  // Start the next battle
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // End battle sequence
      setMode('EndBattle');
      setWinner(winner);
    }
  };

  const restartGame = () => {
    clearInterval(nextBattleTimer.current);
    setMode('Start');
    setPlayer(null);
    setEnemy('');
    setTurn('');
    setWinner('');
    setPlayerHealthColor('');
    setEnemyHealthColor('');
    setPlayerAnimation("idle");
    setEnemyAnimation("idle");
    setEnemyQueue(null);
    setCurrentEnemyIndex(0);
    setCurrentPlayerId(null);
    gameEnded.current = false;
  };
  useEffect(() => {
    if (turn === 'Player') {
      setPlayerAnimation(animationVarriants.activeTurn);
      setEnemyAnimation(animationVarriants.idle);
    } else if (turn === 'Enemy') {
      setEnemyAnimation(animationVarriants.activeTurn);
      setPlayerAnimation(animationVarriants.idle);
    }
  }, [turn, animationVarriants])
  const shopItems = [
    { id: 1, name: "Recruit the Vampire", character_id: 'vampire', cost: 2000 },
    { id: 2, name: "Recruit the Archer", character_id: 'archer', cost: 3000 },
    { id: 3, name: "Unlock Heal", skill_id: 'skillHeal', cost: 0 },
    { id: 4, name: "Unlock Fireball", skill_id: 'skillFireball', cost: 0 },
    { id: 5, name: "Unlock Poison", skill_id: 'skillPoison', cost: 0 },
    { id: 6, name: "Unlock Damage Up", skill_id: 'skillDamageUp', cost: 0 },
    { id: 7, name: "Buy Soul Absorption", passive_name:'Soul Absorption', passive_id: 'passiveSoulAbsorption', requirement: 'Drops from the Necromancer.', cost: 0 },
    { id: 8, name: "Buy Bulwark", passive_name:'Bulwark', passive_id: 'passiveBulwark', requirement: 'Achieve level 10 on Knight.', cost: 0 },
    { id: 9, name: "Buy Dual Wield", passive_name:'Dual Wield', passive_id: 'passiveDualWield', requirement: 'Achieve level 10 on Rogue.', cost: 0 },
    { id: 10, name: "Buy Arcane Infused", passive_name:'Arcane Infused', passive_id: 'passiveArcaneInfused', requirement: 'Achieve level 10 on Mage.', cost: 0 },
    { id: 11, name: "Buy Life Steal", passive_name:'Life Steal', passive_id: 'passiveLifeSteal', requirement: 'Achieve level 10 on Vampire.', cost: 0 },
    { id: 12, name: "Buy Poison Tip", passive_name:'Poison Tip', passive_id: 'passivePoisonTip', requirement: 'Achieve level 10 on Archer.', cost: 0 },
];

// Handle purchase
const handlePurchase = (item) => {
  if (money >= item.cost) {
    if (item.character_id) {
      // Handle character purchase logic
      if (player_characters[item.character_id].isUnlocked === true) {
        alert(`You already have the ${item.character_id}`);
        return;
      }
      updateCharacterLevel(item.character_id, undefined, undefined, true);
      alert('Purchase successful!');
    } else if (item.skill_id) {
      // Handle active skill purchase logic
      if (player_activeSkills[item.skill_id]?.isUnlocked === true) {
        alert(`You already own the skill ${item.skill_id}`);
        return;
      }
      updatePlayerActiveSkills(item.skill_id, true);
      alert('Purchase successful!');
    } else if (item.passive_id) {
      // Handle passive purchase logic
      if (player_ownedPassives[item.passive_id]?.isUnlocked === true) {
        alert(`You already own the skill ${item.passive_id}`);
        return;
      }
      updatePlayerOwnedPassives(item.passive_id, true);
      alert('Purchase successful!');
    }
    // Update money after successful purchase
    updateMoney(-item.cost);
  } else {
    alert('Not enough money!');
  }
};

//Handle equiping skills
const handleEquipSkill = (skillId) => {
  if (activeSkills.find(s => s.id === skillId)) {
    if (selectedSkills.includes(skillId)) {
      alert("Skill is already equipped.");
      return;
    }
    if (selectedSkills.length >= 3) {
      alert("You can only equip up to 3 skills.");
      return;
    }
    setSelectedSkills([...selectedSkills, skillId]);
    updatePlayerActiveSkills(skillId, true, true);
  } else {
    alert("Couldn't find the skill to equip.")
  }
};

const handleUnequipSkill = (skillId) => {
  setSelectedSkills(selectedSkills.filter(id => id !== skillId));
  updatePlayerActiveSkills(skillId, true, false);
};

//Handle equiping passives
const handleEquipPassive = (passiveName, passiveId) => {
  // Check if the passive exists in the descriptions
  if (passiveDescriptions.find(p => p.name === passiveName)) {
    // Check if the passive is already equipped
    if (selectedPassives.some(p => p.id === passiveId)) {
      alert("Passive is already equipped.");
      return;
    }
    // Check if the maximum number of passives is reached
    if (selectedPassives.length >= 3) {
      alert("You can only equip up to 3 passives.");
      return;
    }
    // Add the passive to the selectedPassives state
    setSelectedPassives([...selectedPassives, { name: passiveName, id: passiveId }]);
    updatePlayerOwnedPassives(passiveId, undefined, true); // Pass true to indicate equipped
  } else {
    alert("Couldn't find the passive to equip.");
  }
};

const handleUnequipPassive = (passiveId) => {
  // Remove the passive from the selectedPassives state
  setSelectedPassives(selectedPassives.filter(passive => passive.id !== passiveId));
  updatePlayerOwnedPassives(passiveId, undefined, false); // Pass false to indicate unequipped
};

//Constantly update the state to show the saved data
useEffect(() => {
  const equippedSkills = Object.keys(player_activeSkills).filter(
    (skillId) => player_activeSkills[skillId]?.equipped
  );
  setSelectedSkills(equippedSkills);

  const equippedPassives = Object.keys(player_ownedPassives)
    .filter((passiveId) => player_ownedPassives[passiveId]?.equipped)
    .map((passiveId) => ({
      id: passiveId,
      name: player_ownedPassives[passiveId]?.name
    }));
  setSelectedPassives(equippedPassives);
}, [player_activeSkills, player_ownedPassives]);

//Get details of the enemy in SelectStage
const getEnemyDetails = (enemyName, level) => {
  const enemy = createCharacter(enemyName, level);
  if (!enemy) return null;

  return (
    <div className="enemy-details" key={enemyName}>
      <img
        src={enemy.image || '/CharacterImage/default.png'}
        alt={enemy.name}
        className="enemy-image"
      />
      <h2>{enemy.enemy_type? enemy.enemy_type + ': ' : ''}{enemy.name}</h2>
      <p><b>Level</b>: {enemy.level}</p>
      <p><b>Health</b>: {enemy.health}</p>
      <p><b>Damage</b>: {enemy.damage}</p>
      <p><b>SPD</b>: {enemy.speed}</p>
      <p><b>Passives</b>:</p>
      <div>
        {enemy.passives.length > 0 ? (
          <div style={{ whiteSpace: 'pre-line' }}>
            {enemy.passives.map((passive) => (
              <p
                dangerouslySetInnerHTML={{ __html: getPassiveDescription(passive) }}
                key={passive}
              ></p>
            ))}
        {enemy.passiveUnlocks &&
          Object.entries(enemy.passiveUnlocks)
            .filter(([unlockLevel]) => enemy.level < parseInt(unlockLevel))
            .map(([unlockLevel, passive]) => (
              <p key={passive}>
                <strong>{passive}</strong>: Unlocks at level <strong>{unlockLevel}</strong>
              </p>
            ))}
          </div>
        ) : (
          <p>No passive</p>
        )}
      </div>
      <p><b>Drops</b>: {enemy.money_drop} <b>money</b>, {enemy.experience_drop} <b>experience</b></p>
      <div>
        {enemy.lootTable && enemy.lootTable.length > 0 ? (
          <ul>
            {enemy.lootTable.map((lootItem, index) => (
              <li key={index}>
                <b>{lootItem.name}</b> - {lootItem.chance}% chance
              </li>
            ))}
          </ul>
        ) : (<></>
        )}
      </div>
    </div>
  );
};

const enemyDetailsClose = () => {
  setSelectedStage(null);
};
  return (
    <>
    {isShopOpen && (
      <div className="modal">
        <div className="modal-content">
          <h2>Shop</h2>
          
          {/* Tab Navigation */}
          <div className="tabs">
            <button 
              className={`tab-button ${shopTab === 'characters' ? 'active' : ''}`}
              onClick={() => setShopTab('characters')}
            >
              Characters
            </button>
            <button 
              className={`tab-button ${shopTab === 'passives' ? 'active' : ''}`}
              onClick={() => setShopTab('passives')}
            >
              Passives
            </button>
            <button 
              className={`tab-button ${shopTab === 'skills' ? 'active' : ''}`}
              onClick={() => setShopTab('skills')}
            >
              Skills
            </button>
          </div>

          {/* Tab Content */}
          {shopTab === 'characters' && (
            <>
            <span>You can recruit characters here</span>
            <ul style={{ paddingLeft: 5 }}>
              {shopItems
                .filter((item) => item.character_id) // Filter for character shop items
                .map((item) => {
                  const character = player_characters[item.character_id];
                  const isOwned = character?.isUnlocked;
                  const canAfford = money >= item.cost;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <span style={{ textAlign: 'left' }}>
                        {item.name} - {item.cost}$
                      </span>
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford || isOwned}
                        style={{
                          cursor: canAfford && !isOwned ? 'pointer' : 'not-allowed',
                          backgroundColor: isOwned ? '#ccc' : canAfford ? '#28a745' : '#ff6666',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 10px',
                        }}
                      >
                        {isOwned ? 'Owned' : canAfford ? 'Buy' : "Can't afford"}
                      </button>
                    </div>
                  );
                })}
            </ul>
            </>
          )}

          {shopTab === 'skills' && (
            <>
            <span>Purchase skills and equip up to 3 for use in battle!</span>
            <ul style={{ paddingLeft: 5 }}>
              {shopItems
                .filter((item) => item.skill_id) // Filter for skill items only
                .map((item) => {
                  const skill = activeSkills.find(s => s.id === item.skill_id);
                  if (!skill) return null;

                  // Get the cost of the skill from the shop item
                  const cost = item.cost;
                  const isUnlocked = player_activeSkills[item.skill_id]?.isUnlocked;
                  const isEquipped = selectedSkills.includes(item.skill_id);

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <span>{skill.name} - {cost}$ | Effect: {skill.description} </span>

                      {!isUnlocked ? (
                        // If skill is not unlocked, show it as a shop item
                        <button
                          onClick={() => handlePurchase(item)} // Use existing handlePurchase
                          disabled={money < cost} // Disable if not enough money
                          style={{
                            cursor: money >= cost ? 'pointer' : 'not-allowed',
                            backgroundColor: money >= cost ? '#28a745' : '#ff6666',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                          }}
                        >
                          {money >= cost ? 'Buy' : "Can't afford"}
                        </button>
                      ) : (
                        // If skill is unlocked, show it as an equip button
                        <button
                          onClick={() => {
                            isEquipped ? handleUnequipSkill(item.skill_id) : handleEquipSkill(item.skill_id);
                          }}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isEquipped ? '#007bff' : '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                          }}
                        >
                          {isEquipped ? 'Unequip' : 'Equip'}
                        </button>
                      )}
                    </div>
                  );
                })}
            </ul>
            </>
          )}

          {shopTab === 'passives' && (
            <>
            <span>Hover over to view obtainment method, equip up to 3 to apply for all your characters!</span>
            <ul style={{ paddingLeft: 5 }}>
              {shopItems
                .filter((item) => item.passive_name)
                .map((item) => {
                  const passive = passiveDescriptions.find(p => p.name === item.passive_name);
                  if (!passive) return null;

                  // Get the cost of the passive from the shop item
                  const cost = item.cost;
                  const isUnlocked = player_ownedPassives[item.passive_id]?.isUnlocked;
                  const isObtained = player_ownedPassives[item.passive_id]?.isObtained;
                  const isEquipped = selectedPassives.some(passive => passive.name === item.passive_name);

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <span 
                        style={{ cursor: 'help', textDecoration: 'underline', position: 'relative' }}
                        title={`Requirement: ${item.requirement}\nEffect: ${passive.description}`}
                      >
                        {passive.name} - {item.cost}$ 
                      </span>
                      {!isObtained ? (
                        <button
                          disabled
                          style={{
                            cursor: 'not-allowed',
                            backgroundColor: '#ccc',
                            color: '#666',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                          }}
                        >
                          Locked
                        </button>
                      ) : (
                        !isUnlocked ? (
                          <button
                            onClick={() => handlePurchase(item)}
                            disabled={money < cost}
                            style={{
                              cursor: money >= cost ? 'pointer' : 'not-allowed',
                              backgroundColor: money >= cost ? '#28a745' : '#ff6666',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                            }}
                          >
                            {money >= cost ? 'Buy' : "Can't afford"}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              isEquipped ? handleUnequipPassive(item.passive_id) : handleEquipPassive(item.passive_name, item.passive_id);
                            }}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isEquipped ? '#007bff' : '#28a745',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                            }}
                          >
                            {isEquipped ? 'Unequip' : 'Equip'}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
            </ul>
            </>
          )}
          <button onClick={() => setIsShopOpen(false)}>Close</button>
        </div>
      </div>
    )}

    <div className="container">
      {mode === "Start" && (
        <>
          <div className="user-stats-display">
            <h3>User Menu</h3>
            <p>Money: {money}$</p>
            <div style={{ marginTop: "10px" }}>
              <h3>Equipped Skills:</h3>
              <ul>
                {selectedSkills.map(skillId => {
                  const skill = activeSkills.find(s => s.id === skillId);
                  return <li key={skillId}>{skill?.name}</li>;
                })}
              </ul>
              <h3>Equipped Passives:</h3>
              <ul>
                {selectedPassives.map(p => {
                  return <li key={p.id}>{p.name}</li>;
                })}
              </ul>
            </div>
            {/* <button onClick={handleSaveGame}>Save Game</button> */}
            <button onClick={() => setIsShopOpen(true)}>Open Shop</button>
          </div>
          <h1>Select Your Character</h1>
          <div className="character-list">
            {Object.keys(characterList).map((id) => {
              if (characterList[id].playable) {
                let playerCharacterStats = createCharacter(id, player_characters[id].level, player_characters[id].experience);
                return (
                  <div key={id} className="character-item">
                    <img src={playerCharacterStats.image || '/CharacterImage/default.png'} alt={playerCharacterStats.name} />
                    <h2>{playerCharacterStats.name}</h2>
                    <p>Level: {playerCharacterStats.level}</p>
                    <p>Experience: {playerCharacterStats.experience}/{calculateExperienceForNextLevel(playerCharacterStats.level)}</p>
                    <p>HP: {playerCharacterStats.health}</p>
                    <p>DMG: {playerCharacterStats.damage}</p>
                    <p>SPD: {playerCharacterStats.speed}</p>
                    <p>Passives:</p>
                    <div>
                      {playerCharacterStats.passives.length > 0 || playerCharacterStats.passiveUnlocks ? (
                        <div style={{ whiteSpace: 'pre-line' }}>
                          {playerCharacterStats.passives.map(passive => (
                            <p dangerouslySetInnerHTML={{ __html: getPassiveDescription(passive) }} key={passive}></p>
                          ))}
                          {playerCharacterStats.passiveUnlocks && 
                            Object.entries(playerCharacterStats.passiveUnlocks)
                              .filter(([unlockLevel]) => playerCharacterStats.level < parseInt(unlockLevel))
                              .map(([unlockLevel, passive]) => (
                                <p key={passive}>
                                  <strong>{passive}</strong>: Unlocks at level <strong>{unlockLevel}</strong>
                                </p>
                              ))
                          }
                        </div>
                      ) : (
                        'No passive'
                      )}
                    </div>
                    {player_characters[id].isUnlocked ? (
                      <button onClick={() => selectCharacter(id)}>Select</button>
                    ) : (
                      <button disabled style={{ cursor: 'not-allowed' }}>Locked</button>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </>
      )}

      {mode === "StageSelection" && (
        <>
          <h1>Select a Stage</h1>
          <div className="stage-list">
            {stageData.map((stage, index) => (
              <div key={index} className="stage-item" style={{ marginBottom: '20px' }}>
                <h2>{stage.stageName}</h2>
                <p>
                  Enemies: {stage.enemies.map((enemy) => characterList[enemy.name].name).join(', ')}
                </p>
                {/* Level Adjuster */}
                <div>
                  <label>
                    Set Stage Level: 
                    <input
                      type="number"
                      min="1"
                      value={stage.level || 1}
                      onChange={(e) => {
                        const newLevel = parseInt(e.target.value, 10) || 1;
                        const updatedStageData = [...stageData];
                        updatedStageData[index].level = newLevel;
                        updatedStageData[index].enemies.forEach((enemy) => {
                          enemy.level = newLevel;
                        });
                        setStageData(updatedStageData);
                      }}
                      style={{
                        width: '60px',
                        marginLeft: '10px',
                        padding: '5px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                      }}
                    />
                  </label>
                </div>
                <button
                  onClick={() => selectStage(index)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'green',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '5px',
                  }}
                >
                  Select Stage
                </button>
                <button
                  onClick={() => setSelectedStage(stage)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'blue',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '5px',
                  }}
                >
                  View Enemies
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setMode("Start")}
            style={{
              marginTop: '20px',
              padding: '10px',
              backgroundColor: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Back
          </button>

          {selectedStage && (
            <div className="modal">
              <div className="modal-content">
                <h2>{selectedStage.stageName} - Enemy Details</h2>
                <div className="enemy-list">
                {Array.from(new Set(selectedStage.enemies.map((enemy) =>
                    getEnemyDetails(enemy.name, enemy.level)
                  )))}
                </div>
                <button
                  onClick={enemyDetailsClose}
                  style={{
                    marginTop: '20px',
                    padding: '10px',
                    backgroundColor: 'red',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === "Battle" && player && enemy && (
        <>
          <h1>Battle Menu</h1>
          <div className="battle-menu">
            <div className="battle-space">
              {/* Player Character Info */}
              <motion.div
              className='character-item'
                initial="idle"
                animate={playerAnimation}
              >
                <img src={player.image || '/CharacterImage/default.png'} alt={player.name} />
                <h2>Player: {player.name}</h2>
                <p>Level: {player.level}</p>
                <HealthBar
                  health={player.health}
                  maxHealth={player.maxHealth}
                  healthColor={playerHealthColor}
                  shield={player.shield}
                />
                <p>Damage: {player.damage}</p>
                <p>SPD: {player.speed}</p>
                <p>Passives:</p>
                <div>
                  {player.passives.length > 0 ? (
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {player.passives.map(passive => (
                        <p dangerouslySetInnerHTML={{ __html: getPassiveDescription(passive) }} key={passive}></p>
                      ))}
                    </div>
                  ) : (
                    'No passive'
                  )}
                </div>

                {/* Display Player's Status Effects */}
                <div className="status-effects">
                  {player.status_effects && player.status_effects.length > 0 ? (
                    player.status_effects.map((effect, index) => (
                      <div key={index} className="status-effect-item">
                        <div className="status-effect-wrapper">
                          <img
                            src={effect.image || '/StatusEffectImage/default.png'}
                            alt={effect.name}
                            className="status-effect-image"
                            title={effect.description}
                          />
                          {(effect.duration !== null || effect.stackCount !== null) && (
                            <span className="status-effect-duration">
                              {effect.duration ?? effect.stackCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p></p>
                  )}
                </div>
                <p>Experience: {player.experience}/{calculateExperienceForNextLevel(player.level)}</p>
                </motion.div>

              {/* Enemy Character Info */}
              <motion.div
                className='character-item'
                initial="idle"
                animate={enemyAnimation}
              >
                <img src={enemy.image || '/CharacterImage/default.png'} alt={enemy.name} /> {/* Handle empty image */}
                <h2>{enemy.enemy_type ? (enemy.enemy_type + ': ') : ('')}{enemy.name}</h2>
                <p>Level: {enemy.level}</p>
                <HealthBar
                  health={enemy.health}
                  maxHealth={enemy.maxHealth}
                  healthColor={enemyHealthColor}
                  shield={enemy.shield}
                />
                <p>Damage: {enemy.damage}</p>
                <p>SPD: {enemy.speed}</p>
                <p>Passives:</p>
                <div>
                  {enemy.passives.length > 0 ? (
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {enemy.passives.map(passive => (
                        <p dangerouslySetInnerHTML={{ __html: getPassiveDescription(passive) }} key={passive}></p>
                      ))}
                    </div>
                  ) : (
                    'No passive'
                  )}
                </div>

                {/* Display Enemy's Status Effects */}
                <div className="status-effects">
                  {enemy.status_effects && enemy.status_effects.length > 0 ? (
                    enemy.status_effects.map((effect, index) => (
                      <div key={index} className="status-effect-item">
                        <div className="status-effect-wrapper">
                          <img
                            src={effect.image || '/StatusEffectImage/default.png'}
                            alt={effect.name}
                            className="status-effect-image"
                            title={
                              effect.damage !== undefined
                                ? `${effect.description} | Damage: ${effect.damage}`
                                : effect.description
                            }
                          />
                          {(effect.duration !== null || effect.stackCount !== null) && (
                            <span className="status-effect-duration">
                              {effect.duration ?? effect.stackCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p></p>
                  )}
                </div>
              </motion.div>
            </div>
            <p>{turn === 'Player' ? 'Waiting for player...' : 'Waiting for enemy...'}</p>

            {/* Attack component that handles the combat logics */}
            <Attack
              updateMoney={updateMoney}
              updateCharacterLevel={updateCharacterLevel}
              player={player} 
              enemy={enemy} 
              turn={turn} 
              setTurn={setTurn} 
              endGame={endGame}
              mode={mode}
              setPlayer={setPlayer}
              setEnemy={setEnemy}
              setPlayerHealthColor={setPlayerHealthColor}
              setEnemyHealthColor={setEnemyHealthColor}
              setPlayerAnimation={setPlayerAnimation}
              setEnemyAnimation={setEnemyAnimation}
              playerPassives={player.passives}
              enemyPassives={enemy.passives}
              gameEnded={gameEnded}
              selectedSkills={selectedSkills}
              player_ownedPassives={player_ownedPassives}
              updatePlayerOwnedPassives={updatePlayerOwnedPassives}
              logs={logs}
            />
          </div>
        </>
      )}

      {mode === "EndBattle" && (
        <div className="end-battle">
          <h1>{winner} wins!</h1>
          {winner === "Player" && (
            <>
              {currentEnemyIndex < enemyQueue.length ? (
                <>
                  <h2>Get ready for the next enemy: {enemyQueue[currentEnemyIndex].name}</h2>
                  {timerActive && (
                    <motion.h3
                      key={countdown}  // key triggers re-render on countdown change
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {countdown}
                    </motion.h3>
                  )}
                </>
              ) : (
                <h2>All enemies defeated! The battle is over.</h2>
              )}
            </>
          )}
          <h3>Battle logs:</h3>
          <div
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            padding: '10px',
            backgroundColor: '#f9f9f9',
          }}
          >
            {logs.length === 0 ? (
              <></>
            ) : (
              logs.map((log, index) => <p key={index} style={{ margin: 0 }}>{log}</p>)
            )}
          </div>
          <button onClick={restartGame}>Return</button>
        </div>
      )}
    </div>
    </>
  );
}

export default App;
