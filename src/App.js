import './App.css';
import { useState, useRef, useEffect, useMemo } from 'react';
import Attack from './Attacks.js'; // Import the new Attack component
import HealthBar from './BattleModeComponents/HealthBar.js';
// import { playableCharacterList } from './charactersFiles/playable_characters.js';
import { characterList } from './charactersFiles/characters.js';
import { passiveDescriptions } from './passives';
import { animations } from './animations'
import SaveManager from './SaveManager';
import { motion } from "framer-motion"

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
  return passive ? `${passive.name}: ${passive.description}` : 'No passive';
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
  const { money, player_characters, updateMoney, updateCharacterLevel, saveGame } = SaveManager();
  const gameEnded = useRef(false);
  const animationVarriants = useMemo(() => animations, []);//Note to self: animation is memorized with no dependencies so dont try to change it with codes
  const [enemyQueue, setEnemyQueue] = useState(() => 
    [
      { name: 'zombie', level: 1 },
      { name: 'ghost', level: 1 },
      { name: 'necromancer', level: 1 }
    ].map(({ name, level }) => createCharacter(name, level))
  );
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState();
  //Timer for next battle states
  const [countdown, setCountdown] = useState(5);  // Timer starting at 5 seconds
  const [timerActive, setTimerActive] = useState(false);
  const nextBattleTimer = useRef(null);
  const handleSaveGame = () => {
    saveGame();  // Manually save the game
  };

  const startGame = (characterId) => {
    //Remember the id
    setCurrentPlayerId(characterId);
    //Set enemy
    let enemyCharacter = enemyQueue[currentEnemyIndex];
    setEnemy(enemyQueue[currentEnemyIndex]);
    //Randomize enemy (old)
    // let startingEnemyIndex = Math.floor(Math.random() * characterKeys.length);
    // let startingEnemy = characterKeys[startingEnemyIndex];
    // setEnemy(characterList[startingEnemy]);
    //Set player
    let playerCharacter = createCharacter(characterId, player_characters[characterId].level, player_characters[characterId].experience);
    setPlayer(playerCharacter);
    let initialTurn = playerCharacter.speed >= enemyCharacter.speed ? 'Player' : 'Enemy';
    setTurn(initialTurn);
    setMode('Battle');
    setWinner('');
    gameEnded.current = false;
    
    //Due to ascyn, im setting the new index here so when startGame runs again it has the updated index
    let nextIndex = currentEnemyIndex + 1;
    setCurrentEnemyIndex(nextIndex);
  };

  const endGame = (winner) => {
    if (winner === 'Player' && currentEnemyIndex <= enemyQueue.length - 1) {
      // Move to the next enemy

      setMode('EndBattle');
      setWinner(winner);

      // nextBattleTimer.current = setTimeout(() => {
      //   startGame(currentPlayerId);
      // }, 5000);
      setCountdown(5);
      setTimerActive(true);
      nextBattleTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(nextBattleTimer.current);  // Stop the countdown
            setTimerActive(false);
            startGame(currentPlayerId);  // Start the next battle
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
    setEnemyQueue(() => 
      [
        { name: 'zombie', level: 1 },
        { name: 'ghost', level: 1 },
        { name: 'necromancer', level: 1 }
      ].map(({ name, level }) => createCharacter(name, level))
    );
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
  return (
    <div className="container">
      {mode === "Start" && (
        <>
          <div className="user-stats-display">
            <h3>User stats</h3>
            <p>Money: {money}</p>
            <button onClick={handleSaveGame}>Save Game</button>
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
                          {playerCharacterStats.passives.map(passive => getPassiveDescription(passive)).join('\n')}
                        </div>
                      ) : (
                        'No passive'
                      )}
                    </div>
                    <button onClick={() => startGame(id)}>Select</button>
                  </div>
                );
              }
              return null;
            })}
          </div>
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
                      {player.passives.map(passive => getPassiveDescription(passive)).join('\n')}
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
                        <img
                          src={effect.image || '/StatusEffectImage/default.png'}
                          alt={effect.name}
                          className="status-effect-image"
                          title={effect.description}
                        />
                        <span className="status-effect-duration">{effect.duration}</span>
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
                <h2>Enemy: {enemy.name}</h2>
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
                      {enemy.passives.map(passive => getPassiveDescription(passive)).join('\n')}
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
  );
}

export default App;
