import './App.css';
import { useState, useRef } from 'react';
import Attack from './Attacks.js'; // Import the new Attack component
import HealthBar from './BattleModeComponents/HealthBar.js';
import { characterList } from './characters';
import { passiveDescriptions } from './passives';
import { animations } from './animations'
import SaveManager from './SaveManager';
import { motion } from "framer-motion"

// Function to get the description of a passive by its name
const getPassiveDescription = (passiveName) => {
  const passive = passiveDescriptions.find(p => p.name === passiveName);
  return passive ? `${passive.name}: ${passive.description}` : 'No passive';
};
const characterKeys = Object.keys(characterList);
function App() {
  const [mode, setMode] = useState('Start');
  const [player, setPlayer] = useState(null);
  const [enemy, setEnemy] = useState('');
  const [turn, setTurn] = useState('');
  const [winner, setWinner] = useState('');
  const [playerHealthColor, setPlayerHealthColor] = useState('');
  const [enemyHealthColor, setEnemyHealthColor] = useState('');
  const { money, updateMoney, saveGame } = SaveManager();
  const gameEnded = useRef(false);
  const animationVarriants = animations;
  const handleSaveGame = () => {
    saveGame();  // Manually save the game
  };

  const startGame = (characterId) => {
    let startingEnemyIndex = Math.floor(Math.random() * characterKeys.length);
    let startingEnemy = characterKeys[startingEnemyIndex];
    setEnemy(characterList[startingEnemy]);
    const character = characterList[characterId];
    setPlayer(character);
    const initialTurn = character.speed >= characterList[startingEnemy].speed ? 'player' : 'enemy';
    setTurn(initialTurn);
    setMode('Battle');
    setWinner('');
    gameEnded.current = false;
  };

  const endGame = (winner) => {
    setMode('EndBattle');
    setWinner(winner);
  };

  const restartGame = () => {
    window.location.reload();
  };

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
            {Object.keys(characterList).map((id) => (
              <div key={id} className="character-item">
                <img src={characterList[id].image || '/CharacterImage/default.png'} alt={characterList[id].name} /> {/* Handle empty image */}
                <h2>{characterList[id].name}</h2>
                <p>HP: {characterList[id].health}</p>
                <p>DMG: {characterList[id].damage}</p>
                <p>SPD: {characterList[id].speed}</p>
                <p>Passives:</p>
                <div>
                {characterList[id].passives.length > 0 ? (
                  <div style={{ whiteSpace: 'pre-line' }}>
                    {characterList[id].passives.map(passive => getPassiveDescription(passive)).join('\n')}
                  </div>
                ) : (
                  'No passive'
                )}
                </div>
                <button onClick={() => startGame(id)}>Select</button>
              </div>
            ))}
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
                animate={turn === 'player' ? animationVarriants.activeTurn : animationVarriants.idle}
              >
                <img src={player.image || '/CharacterImage/default.png'} alt={player.name} /> {/* Handle empty image */}
                <h2>Player: {player.name}</h2>
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
                </motion.div>

              {/* Enemy Character Info */}
              <div className={`character-item ${turn === 'enemy' ? 'active-turn' : ''}`}>
                <img src={enemy.image || '/CharacterImage/default.png'} alt={enemy.name} /> {/* Handle empty image */}
                <h2>Enemy: {enemy.name}</h2>
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
                          <span className="status-effect-duration">{effect.duration}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p></p>
                  )}
                </div>
              </div>
            </div>
            <p>{turn === 'player' ? 'Waiting for player...' : 'Waiting for enemy...'}</p>
            
            {/* Attack component that handles the combat logics */}
            <Attack
              updateMoney={updateMoney}
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
              setTimeout={setTimeout}
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
          <button onClick={restartGame}>Restart Game</button>
        </div>
      )}
    </div>
  );
}

export default App;
