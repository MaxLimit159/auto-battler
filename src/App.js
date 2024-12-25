import './App.css';
import 'font-awesome/css/font-awesome.min.css';
import { useState, useRef, useEffect, useMemo } from 'react';
import Attack from './Attacks.js';
import Character from './BattleModeComponents/Character.js';
import Shop from './StartModeComponents/Shop.js';
import Leaderboard from './StartModeComponents/Leaderboard.js';
import { characterList } from './charactersFiles/characters.js';
import { passiveDescriptions } from './charactersFiles/passives.js';
import { animations } from './charactersFiles/animations.js'
import { activeSkills } from './activeSkills.js';
import SaveManager from './SaveManager';
import { motion } from "framer-motion"
import { statusEffects } from './statusEffects.js';
import Authentication from './authentication';
import AccountSettings from './AccountSettings';

const initialStageData = [
  {
    stageName: 'Graveyard',
    stageId: 'graveyardStage',
    enemies: [
      { name: 'zombie', level: 1 },
      { name: 'ghost', level: 1 },
      { name: 'necromancer', level: 1 },
    ],
  },
  {
    stageName: 'Challenge the King!',
    stageId: 'mimicKingChallengeStage',
    enemies: [
      { name: 'mimicKing', level: 1 },
    ],
  },
  {
    stageName: 'Challenge the Archmage!',
    stageId: 'archmageChallengeStage',
    enemies: [
      { name: 'archmage', level: 1 },
    ],
  },
]
const initialRaidData = [
  {
    stageName: 'The Lich',
    stageId: 'theLichRaid',
    enemies: [
      { name: 'theLich', level: 5 },
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
  //User stats UI
  const [isUserStatsVisible, setIsUserStatsVisible] = useState(true);
  const toggleUserStats = () => {
    setIsUserStatsVisible(!isUserStatsVisible); // Toggle visibility of the user stats display
  };
  //Manage shop UI
  const [isShopOpen, setIsShopOpen] = useState(false);
  //Manage stage data
  const [stageData, setStageData] = useState(initialStageData);
  const [raidTotalScore, setRaidTotalScore] = useState(0);
  //Manage and load player data
  const { money, darkMode, player_characters, player_activeSkills, player_ownedPassives, player_personalHighScores, selectedPassives, selectedSkills, updateMoney, updateDarkMode, updateCharacterLevel, updatePlayerActiveSkills, updatePlayerOwnedPassives, updateRaidScore, saveGame, setSelectedPassives, setSelectedSkills, fetchLeaderboard } = SaveManager();

  const [logs, setLogs] = useState([]); // State to store logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const ignoredMessages = ["Game saved successfully!"];

    // Override console.log
    console.log = (...args) => {
      const logMessage = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ");
      if (!ignoredMessages.includes(logMessage)) {
        setLogs((prevLogs) => [...prevLogs, logMessage]);
      }

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
  const getLevelUppedStats = (character, getBaseStats) => {
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

    if (!getBaseStats) {
      // alert('getting');
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
      if (character.passives.includes("Dual Wield")) {
        character.skills = ['doubleAttack'];
      }
      if (character.passives.includes("Magic Barrier")) {
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
    }
    return character;
  };
  const createCharacter = (name, level = 1, experience = 0, enemy_type, getBaseStats = false) => {
    // Clone the base character from the baseCharacterList
    const baseCharacter = { ...baseCharacterList[name] };

    if (!baseCharacter) {
      throw new Error(`Character ${name} not found in characterList`);
    }

    // Set initial level
    const character = { ...baseCharacter, level, experience, ...(enemy_type !== undefined && { enemy_type }) };
    //Return the character with the proper stats based on the given level
    return getLevelUppedStats(character, getBaseStats);
  };

  //Varriables to pass over to Attack.js
  const gameEnded = useRef(false);
  const [selectedStageDetail, setSelectedStageDetail] = useState(null);
  const animationVarriants = useMemo(() => animations, []);//Note to self: animation is memorized with no dependencies so dont try to change it with codes
  const [enemyQueue, setEnemyQueue] = useState(null);
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState();

  const [selectedRaid, setSelectedRaid] = useState(null);

  //Timer for next battle states
  const [countdown, setCountdown] = useState(5);  // Timer starting at 5 seconds
  const [timerActive, setTimerActive] = useState(false);
  const nextBattleTimer = useRef(null);
  const [battleAgain, setBattleAgain] = useState(false);
  const toggleBattleAgain = () => {
    setBattleAgain((prev) => !prev); // Toggles the state
  };

  const selectCharacter = (characterId) => {
    //Remember the id
    setCurrentPlayerId(characterId);
    setMode('StageSelection');
  };

  const selectStage = (stageId, enemy_type) => {
    const selectStage = stageData[stageId];
    const newEnemyQueue = selectStage.enemies.map(({ name, level }) => createCharacter(name, level, undefined, enemy_type));
    setEnemyQueue(newEnemyQueue);
  }

  const selectRaid = (raidId, enemy_type) => {
    const raid = initialRaidData[raidId];
    setSelectedRaid(raid);
    const newEnemyQueue = raid.enemies.map(({ name, level }) => createCharacter(name, level, undefined, enemy_type));
    setEnemyQueue(newEnemyQueue);
  }

  useEffect(() => {
    if (enemyQueue && enemyQueue.length > 0) {
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyQueue]);

  const startGame = (enemyIndex) => {
    setLogs([]);
    //Set enemy
    let enemyCharacter
    if (enemyIndex !== undefined && enemyIndex !== null) {
      enemyCharacter = enemyQueue[enemyIndex];
    } else {
      enemyCharacter = enemyQueue[currentEnemyIndex];
    }
    setEnemy(enemyCharacter);
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
    } else if (battleAgain) {
      //Set enemy back to the first
      setCurrentEnemyIndex(0);
      gameEnded.current = false;

      //Go to EndBattle
      setMode('EndBattle');
      setWinner(winner);

      //Start COuntdown
      setCountdown(5);
      setTimerActive(true);
      nextBattleTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(nextBattleTimer.current);  // Stop the countdown
            setTimerActive(false);
            startGame(0);  // Start the next battle with the first enemy index
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // End battle sequence
      if (raidTotalScore > 0) {
        const { id, level } = player;
        updateRaidScore(selectedRaid.stageId, selectedRaid.stageName, raidTotalScore, { id, level });
      }
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
    setRaidTotalScore(0);
    setSelectedStageDetail(null);
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
        <h2>{enemy.enemy_type ? enemy.enemy_type + ': ' : ''}{enemy.name}</h2>
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
    setSelectedStageDetail(null);
  };

  const handleRootClick = (event) => {
    // Check if the clicked element is not inside a modal
    if (!event.target.closest('.modal') && !event.target.closest('.modal-open-button') && !event.target.closest('.user-stats-display')) {
      // Reset states
      setSelectedStageDetail(null);
      setIsShopOpen(false);
    }
  };

  const [user, setUser] = useState(null); // Track the current user
  useEffect(() => {
    if (user) {
      saveGame(money, darkMode, player_characters, player_activeSkills, player_ownedPassives, player_personalHighScores);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [money, darkMode, player_characters, player_activeSkills, player_ownedPassives, player_personalHighScores]);

  const [isCharacterDetailsOpen, setIsCharacterDetailsOpen] = useState(false);
  const [characterDetails, setCharacterDetails] = useState(null);
  const viewCharacterDetails = (charId, charLvl, extra_passives = []) => {
    const char = createCharacter(charId, charLvl, undefined, undefined, true);
    char.passives = [...char.passives, ...extra_passives];
    setCharacterDetails(char);
    setIsCharacterDetailsOpen(true);
  }
  return (
    <div className="app-container" onClick={handleRootClick}>
      {isCharacterDetailsOpen && characterDetails && (
        <div className="character-card-overlay" onClick={(e) => {
          e.stopPropagation();
          setIsCharacterDetailsOpen(false);
        }}>
          <div className='character-card-modal' onClick={(e) => e.stopPropagation()}>
            <div className="character-card">
              {/* Header Section */}
              <div className="character-header">
                <img
                  src={characterDetails.image}
                  alt={characterDetails.name}
                  className="character-image"
                />
                <div className="character-info">
                  <h3 className="character-name">{characterDetails.name}</h3>
                  <span className="character-level">Level: {characterDetails.level}</span>
                </div>
              </div>

              {/* Attributes Section */}
              <div className="character-card-attributes">
                <h4 className="section-title">Attributes</h4>
                <div className="attributes-grid">
                  <div className="attribute">
                    <span>HP</span>
                    <span>{characterDetails.maxHealth}</span>
                  </div>
                  <div className="attribute">
                    <span>DMG</span>
                    <span>{characterDetails.damage}</span>
                  </div>
                  <div className="attribute">
                    <span>SPD</span>
                    <span>{characterDetails.speed}</span>
                  </div>
                </div>
              </div>

              {/* Passives Section */}
              <div className="character-card-passives">
                <h4 className="section-title">Passives</h4>
                <div className="passives-list">
                  {characterDetails.passives.map((passive) => (
                    <div key={passive.id} className="passive-item">
                      <span className="passive-name">{passive}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isShopOpen && (
        <Shop
          money={money}
          player_characters={player_characters}
          handlePurchase={handlePurchase}
          player_activeSkills={player_activeSkills}
          selectedSkills={selectedSkills}
          player_ownedPassives={player_ownedPassives}
          selectedPassives={selectedPassives}
          handleEquipSkill={handleEquipSkill}
          handleUnequipSkill={handleUnequipSkill}
          handleEquipPassive={handleEquipPassive}
          handleUnequipPassive={handleUnequipPassive}
          setIsShopOpen={setIsShopOpen}
          setIsUserStatsVisible={setIsUserStatsVisible}
        />
      )}

      <div className="container">
        {mode === "Start" && (
          <>
            <div className={`user-stats-display ${isUserStatsVisible ? 'visible' : ''}`}>
              {/* Button to toggle visibility */}
              <span className="user-stats-toggle" onClick={toggleUserStats}>
                {isUserStatsVisible ? (
                  <i className="fa fa-chevron-down"></i>
                ) : (
                  <i className="fa fa-chevron-up"></i>
                )}
              </span>

              {/* Conditionally render the user stats display */}
              {isUserStatsVisible && (
                <div>
                  {/* User Stats Display */}
                  <Authentication user={user} setUser={setUser} />
                  <p>Money: {money}$</p>
                  <div style={{ marginTop: "10px" }}>
                    <h3>Equipped Skills:</h3>
                    <ul>
                      {selectedSkills.map(skillId => {
                        const skill = activeSkills.find(s => s.id === skillId);
                        return <li key={skillId}>{skill.name}</li>;
                      })}
                    </ul>
                    <h3>Equipped Passives:</h3>
                    <ul>
                      {selectedPassives.map(passive => {
                        return <li key={passive?.id}>{passive?.name}</li>;
                      })}
                    </ul>
                  </div>
                  {/* Button to open the shop */}
                  <button className="modal-open-button" onClick={() => { setIsShopOpen(true); setIsUserStatsVisible(false) }}>
                    Open Shop
                  </button>
                </div>
              )}
            </div>
            <h1>Select Your Character</h1>
            <div className="character-list">
              {Object.keys(characterList).map((id) => {
                if (characterList[id].playable) {
                  let playerCharacterStats = createCharacter(id, player_characters[id].level, player_characters[id].experience);
                  return (
                    <div key={id} className="character-item-start">
                      <img src={playerCharacterStats.image || '/CharacterImage/default.png'} alt={playerCharacterStats.name} />
                      <h2>{playerCharacterStats.name}</h2>
                      <p>Level: {playerCharacterStats.level}</p>
                      <p>Experience: {playerCharacterStats.experience}/{calculateExperienceForNextLevel(playerCharacterStats.level)}</p>
                      <p>HP: {playerCharacterStats.health}</p>
                      <p>DMG: {playerCharacterStats.damage}</p>
                      <p>SPD: {playerCharacterStats.speed}</p>
                      <div className="character-passives-start">
                        <p>Passives:</p>
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
            {user ? (
              <div className='user-settings-display'>
                <AccountSettings user={user} setUser={setUser} darkMode={darkMode} updateDarkMode={updateDarkMode} />
              </div>
            ) : (<></>)}
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
                        placeholder="1"
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue <= 0) {
                            e.target.value = "";
                          }
                          // If input is empty or a positive integer, update state
                          if (inputValue === '' || (parseInt(inputValue, 10) >= 1)) {
                            const newLevel = inputValue === '' ? 1 : parseInt(inputValue, 10);
                            const updatedStageData = [...stageData];
                            updatedStageData[index].level = newLevel;

                            // Update the enemies' levels if newLevel is not empty
                            if (newLevel !== '') {
                              updatedStageData[index].enemies.forEach((enemy) => {
                                enemy.level = newLevel;
                              });
                            }

                            setStageData(updatedStageData);
                          }
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
                    className='stage-select-button'
                    onClick={() => selectStage(index)}
                  >
                    Select Stage
                  </button>
                  <button
                    className='modal-open-button'
                    onClick={() => setSelectedStageDetail(stage)}
                  >
                    View Enemies
                  </button>
                </div>
              ))}
              <button onClick={() => { setMode("RaidSelection"); setBattleAgain(false) }}>
                Raid Boss
              </button>
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
            <div className="battle-again-container">
              <button className="battle-again-button" onClick={toggleBattleAgain}>
                {battleAgain ? 'Auto Battle: Enabled' : 'Auto Battle: Disabled'}
              </button>
            </div>
            {selectedStageDetail && (
              <div className="outter-modal">
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-content">
                    <h2>{selectedStageDetail.stageName} - Enemy Details</h2>
                    <div className="enemy-list">
                      {Array.from(new Set(selectedStageDetail.enemies.map((enemy) =>
                        getEnemyDetails(enemy.name, enemy.level)
                      )))}
                    </div>
                    <button
                      onClick={enemyDetailsClose}
                      style={{
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
              </div>
            )}
          </>
        )}

        {mode === "RaidSelection" && (
          <>
            <h1>Select a Raid</h1>
            <p>Raid bosses can't be killed. Instead, they will revive with 5 extra levels.</p>
            <p>Try and go for a new highscore!</p>
            <div className="stage-list">
              {initialRaidData.map((stage, index) => (
                <div key={index} className="stage-item" style={{ marginBottom: '20px' }}>
                  <h2>{stage.stageName}</h2>
                  <p>
                    Enemies: {stage.enemies.map((enemy) => characterList[enemy.name].name).join(', ')}
                  </p>
                  <p>
                    Personal best: {player_personalHighScores[`player_${stage.stageId}`] ? player_personalHighScores[`player_${stage.stageId}`].score : 0}
                  </p>
                  <button
                  className='stage-select-button'
                    onClick={() => selectRaid(index, 'Raid Boss')}
                  >
                    Select Stage
                  </button>
                  <button
                    className='modal-open-button'
                    onClick={() => setSelectedStageDetail(stage)}
                  >
                    View Enemies
                  </button>
                  <Leaderboard stageId={stage.stageId} viewCharacterDetails={viewCharacterDetails} fetchLeaderboard={fetchLeaderboard} />
                </div>
              ))}
              <button onClick={() => setMode("StageSelection")}>
                Normal Stages
              </button>
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
            {selectedStageDetail && (
              <div className="outter-modal">
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-content">
                    <h2>{selectedStageDetail.stageName} - Enemy Details</h2>
                    <div className="enemy-list">
                      {Array.from(new Set(selectedStageDetail.enemies.map((enemy) =>
                        getEnemyDetails(enemy.name, enemy.level)
                      )))}
                    </div>
                    <button
                      onClick={enemyDetailsClose}
                      style={{
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
              </div>
            )}
          </>
        )}

        {mode === "Battle" && player && enemy && (
          <>
            <h1>Battle Menu</h1>
            <div className="battle-menu">
              {/* Score UI for Raid Boss */}
              {enemy.enemy_type === 'Raid Boss' && (
                <div className="score-ui">
                  <h3>Total Damage Taken by Raid Boss:</h3>
                  <p>{raidTotalScore}</p>
                </div>
              )}
              <div className="battle-space">
              {/* Player Character Info */}
                <Character side={"player"} characterAnimation={playerAnimation} character={player} characterHealthColor={playerHealthColor} getPassiveDescription={getPassiveDescription} calculateExperienceForNextLevel={calculateExperienceForNextLevel}/>
              {/* Enemy Character Info */}
                <Character side={"enemy"} characterAnimation={enemyAnimation} character={enemy} characterHealthColor={enemyHealthColor} getPassiveDescription={getPassiveDescription} calculateExperienceForNextLevel={calculateExperienceForNextLevel}/>
              </div>
              <p className='turn-await-message'>{turn === 'Player' ? 'Waiting for player...' : 'Waiting for enemy...'}</p>
              {battleAgain && (
                <div className="battle-again-container">
                  <button className="battle-again-button" onClick={toggleBattleAgain}>
                    Cancel Auto Battle
                  </button>
                </div>
              )}

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
                setRaidTotalScore={setRaidTotalScore}
              />
            </div>
          </>
        )}

        {mode === "EndBattle" && (
          <div className="end-battle">
            <h1>{winner} wins!</h1>
            {raidTotalScore > 0 ? (<>
              <h2>Final score: {raidTotalScore}</h2>
            </>) : (<></>)}
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
              className='battle-logs-container'
            >
              {logs.length === 0 ? (
                <></>
              ) : (
                logs.map((log, index) => <p className='battle-logs' key={index}>{log}</p>)
              )}
            </div>
            <button onClick={restartGame}>Return</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
