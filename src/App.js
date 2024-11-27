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

const stageData = [
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
]
const calculateExperienceForNextLevel = (level) => level * 100;
const getLevelUppedStats = (character) => {
  const levelMultiplier = 1 + (character.level - 1) * 0.05;

  // Apply the scaling and round down each stat
  character.maxHealth = Math.floor(character.maxHealth * levelMultiplier);
  character.health = Math.floor(character.maxHealth);
  character.damage = Math.floor(character.damage * levelMultiplier);
  character.speed = Math.floor(character.speed * levelMultiplier);

  return character;
};
const createCharacter = (name, level = 1, experience = 0) => {
  // Clone the base character from the characterList
  const baseCharacter = { ...characterList[name] };

  if (!baseCharacter) {
    throw new Error(`Character ${name} not found in characterList`);
  }

  // Set initial level
  const character = { ...baseCharacter, level, experience };

  //Return the character with the proper stats based on the given level
  return getLevelUppedStats(character);
};
// Function to get the description of a passive by its name
const getPassiveDescription = (passiveName) => {
  const passive = passiveDescriptions.find(p => p.name === passiveName);
  return passive 
    ? `<b>${passive.name}</b>: ${passive.description}` 
    : 'No passive';
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

  //Manage shop UI
  const [shopTab, setShopTab] = useState('characters');
  const [isShopOpen, setIsShopOpen] = useState(false);

  //Manage and load player data
  const { money, player_characters, player_activeSkills, updateMoney, updateCharacterLevel, updatePlayerActiveSkills, saveGame } = SaveManager();
  useEffect(() => {
    saveGame(money, player_characters, player_activeSkills);
  }, [money, player_characters, player_activeSkills, saveGame]);

  //Varriables to pass over to Attack.js
  const gameEnded = useRef(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const animationVarriants = useMemo(() => animations, []);//Note to self: animation is memorized with no dependencies so dont try to change it with codes
  const [enemyQueue, setEnemyQueue] = useState(null);
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState();
  const [selectedSkills, setSelectedSkills] = useState([]);

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
//Constantly update the state to show the saved data
useEffect(() => {
  const equippedSkills = Object.keys(player_activeSkills).filter(
    (skillId) => player_activeSkills[skillId]?.equipped
  );
  setSelectedSkills(equippedSkills);
}, [player_activeSkills]);

//Get details of the enemy in SelectStage
const getEnemyDetails = (enemyName) => {
  const enemy = characterList[enemyName];
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
          </div>
        ) : (
          <p>No passive</p>
        )}
      </div>
    </div>
  );
};

const handleModalClose = () => {
  setSelectedStage(null);
};
  return (
    <>
    {isShopOpen && (
      <div className="modal">
        <div className="modal-content">
          <h2>Recruiting Guild</h2>
          
          {/* Tab Navigation */}
          <div className="tabs">
            <button 
              className={`tab-button ${shopTab === 'characters' ? 'active' : ''}`}
              onClick={() => setShopTab('characters')}
            >
              Characters
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
          )}

          {shopTab === 'skills' && (
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
                      {playerCharacterStats.passives.length > 0 ? (
                        <div style={{ whiteSpace: 'pre-line' }}>
                          {playerCharacterStats.passives.map(passive => (
                            <p dangerouslySetInnerHTML={{ __html: getPassiveDescription(passive) }} key={passive}></p>
                          ))}
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
                  {Array.from(new Set(selectedStage.enemies.map((enemy) => enemy.name))).map((enemyName) =>
                    getEnemyDetails(enemyName)
                  )}
                </div>
                <button
                  onClick={handleModalClose}
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
                          <span className="status-effect-duration">
                            {effect.duration === null ? effect.stackCount : effect.duration}
                          </span>
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
                            title={effect.description}
                          />
                          <span className="status-effect-duration">
                            {effect.duration === null ? effect.stackCount : effect.duration}
                          </span>
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
          <button onClick={restartGame}>Return</button>
        </div>
      )}
    </div>
    </>
  );
}

export default App;
