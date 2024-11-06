import { useEffect, useRef } from 'react';
import { statusEffects } from './statusEffects.js';
const TURN_LENGTH = 1000;
// Function to flash health color
const flashHealthColor = (color, setEntityHealthColor) => {
  setEntityHealthColor(color);
  setTimeout(() => setEntityHealthColor(''), TURN_LENGTH / 5);
};
//Handles game ending logics
const handleGameEnd = (winningSide, updateMoney, moneyDrop, endGame, gameEnded) => {
  gameEnded.current = true; // Set game ended state
  if (winningSide === 'Player' && moneyDrop !== undefined) {
    updateMoney(moneyDrop);
  }
  endGame(winningSide);
  console.log(`Game ends. ${winningSide} wins`);
};
//Function to handle status effects
const applyStatusEffects = async (character, setEntity, setEntityHealthColor, winning_side, endGame, updateMoney, gameEnded) => {
  const effectsToRemove = [];
  let deathCheck = false;

  // Count the stacks of each unique status effect by type
  const statusEffectCounts = character.status_effects.reduce((acc, effect) => {
    if (acc[effect.name]) {
      acc[effect.name].stackCount += 1;
    } else {
      acc[effect.name] = { ...effect, stackCount: 1 };
    }
    return acc;
  }, {});
  // Convert statusEffectCounts from Object to Array and loop through each unique status effect type to activate each effect functions based on its stack count
  for (const status_effect_stack of Object.values(statusEffectCounts)) {
    deathCheck = await status_effect_stack.effect(
      setEntity,
      setEntityHealthColor,
      status_effect_stack.stackCount
    );

    //Reduce the durration of all status effect on the character matching the currently processing statusEffectCount
    for (const status_effect of character.status_effects){
      if(status_effect_stack.name === status_effect.name){

        // Reduce duration by 1 after effect is applied
        status_effect.duration -= 1;

        // Check if the duration is zero or below, and mark it for removal
        if (status_effect.duration <= 0) {
          effectsToRemove.push(status_effect);
        }
      }
    }

    // If the character dies break out of the loop
    if (deathCheck) {
      break;
    }
  }

  // Remove expired status effects from the character's status effects
  character.status_effects = character.status_effects.filter(
    effect => !effectsToRemove.includes(effect)
  );

  // Update the entity with the new status effects list
  setEntity(prevEntity => ({
    ...prevEntity,
    status_effects: [...character.status_effects],
  }));

  return deathCheck;
};

//Function to give statusEffects to character
const inflictStatusEffects = (setEntity, buffName) => {
  const statusEffect = { ...statusEffects[buffName] }; // Copy the buff info
  
  setEntity(prevEntity => {
    const updatedStatusEffects = [...prevEntity.status_effects, statusEffect];
    return { ...prevEntity, status_effects: updatedStatusEffects };
  });
};

// Function to calculate damage
const calculateDamage = (damage, targetPassive, attackerPassive) => {
  // Defensive damage reduction logics
  if (!attackerPassive.includes('Arcane Infused')) {
    if (targetPassive.includes('Bulwark')) {
      damage *= 0.5;
    }
  }
  return damage;
};

// Function to handle damage
const doDamage = (attacker, target, damage, setPlayer, endGame, setEnemyHealthColor, setEnemy, setPlayerHealthColor, playerPassives, enemyPassives, updateMoney, gameEnded) => {
  if (gameEnded.current) return;
  
  const targetPassive = target === 'player' ? playerPassives : enemyPassives;
  const attackerPassive = target === 'player' ? enemyPassives : playerPassives;

  damage = calculateDamage(damage, targetPassive, attackerPassive);

  // Active effects after calculating final damage
  if (target === 'enemy') {
    setEnemy(prevEnemy => {
      const newHealth = prevEnemy.health - damage;
      if (newHealth <= 0) {
        handleGameEnd('Player', updateMoney, prevEnemy.money_drop, endGame, gameEnded);
      }
      flashHealthColor('red', setEnemyHealthColor);
      return { ...prevEnemy, health: Math.max(newHealth, 0) };
    });
    // Life Steal Passive: Heal the attacker when damage is dealt
    if (attackerPassive.includes('Life Steal')) {
      setPlayer(prevPlayer => {
        const healedHealth = prevPlayer.health + damage / 2;
        console.log(`Player healing: ${prevPlayer.health} + ${damage / 2} = ${Math.min(healedHealth, prevPlayer.maxHealth)}`);
        flashHealthColor('green', setPlayerHealthColor);
        return { ...prevPlayer, health: Math.min(healedHealth, prevPlayer.maxHealth) };
      });
    }
    if (attackerPassive.includes('Poison Tip')) {
      inflictStatusEffects(setEnemy, 'poison');
    }
  } else if (target === 'player') {
    setPlayer(prevPlayer => {
      const newHealth = prevPlayer.health - damage;
      if (newHealth <= 0) {
        handleGameEnd('Enemy', updateMoney, undefined, endGame, gameEnded);
      }
      flashHealthColor('red', setPlayerHealthColor);
      return { ...prevPlayer, health: Math.max(newHealth, 0) };
    });
    // Life Steal Passive: Heal the attacker when damage is dealt
    if (attackerPassive.includes('Life Steal')) {
      setEnemy(prevEnemy => {
        const healedHealth = prevEnemy.health + damage / 2;
        console.log(`Enemy healing: ${prevEnemy.health} + ${damage / 2} = ${Math.min(healedHealth, prevEnemy.maxHealth)}`);
        flashHealthColor('green', setEnemyHealthColor);
        return { ...prevEnemy, health: Math.min(healedHealth, prevEnemy.maxHealth) };
      });
    }
    if (attackerPassive.includes('Poison Tip')) {
      inflictStatusEffects(setPlayer, 'poison');
    }
  }
};

// Define attack functions
const basicAttack = (attacker, target, damage, ...args) => {
  doDamage(attacker, target, damage, ...args);
};

const doubleAttack = (attacker, target, damage, ...args) => {
  basicAttack(attacker, target, damage, ...args);
  setTimeout(() => {
    basicAttack(attacker, target, damage, ...args);
  }, TURN_LENGTH / 2);
};

// Store attack functions in an object
const attackFunctions = {
  basicAttack,
  doubleAttack,
};

function Attack({
  updateMoney,
  player,
  enemy,
  turn,
  setTurn,
  endGame,
  mode,
  setPlayer,
  setEnemy,
  setPlayerHealthColor,
  setEnemyHealthColor,
  setTimeout,
  playerPassives,
  enemyPassives,
  gameEnded
}) {
  useEffect(() => {
    const handleAttack = async () => {
      if (turn === 'player') {
        let deathCheckPlayer = await applyStatusEffects(player, setPlayer, setPlayerHealthColor, "Enemy", endGame, updateMoney, gameEnded);
        //Wait for status effects to take effect
        console.log("Player death from status: ",deathCheckPlayer);
        if(deathCheckPlayer !== true){
          setTimeout(() => {
            const skillId = player.skills[0];
            if (attackFunctions[skillId]) {
              attackFunctions[skillId](player, 'enemy', player.damage, setPlayer, endGame, setEnemyHealthColor, setEnemy, setPlayerHealthColor, playerPassives, enemyPassives, updateMoney, gameEnded);
            }
            setTimeout(() => setTurn('enemy'), TURN_LENGTH / 2);
          }, TURN_LENGTH / 2);
        } else{
          handleGameEnd('Enemy', updateMoney, undefined, endGame, gameEnded);
        }
      } else if (turn === 'enemy') {
        let deathCheckEnemy = await applyStatusEffects(enemy, setEnemy, setEnemyHealthColor, "Player", endGame, updateMoney, gameEnded);
        //Wait for status effects to take effect
        console.log("Enemy death from status: ",deathCheckEnemy);
        if(deathCheckEnemy !== true){
          setTimeout(()=>{
            const skillId = enemy.skills[0];
            if (attackFunctions[skillId]) {
              attackFunctions[skillId](enemy, 'player', enemy.damage, setPlayer, endGame, setEnemyHealthColor, setEnemy, setPlayerHealthColor, playerPassives, enemyPassives, updateMoney, gameEnded);
            }
            setTimeout(() => setTurn('player'), TURN_LENGTH / 2);
          }, TURN_LENGTH / 2);
        } else {
          handleGameEnd('Player', updateMoney, enemy.money_drop, endGame, gameEnded);
        }
      }
    };

    const attackInterval = setInterval(handleAttack, TURN_LENGTH);

    return () => clearInterval(attackInterval);
  }, [
    turn,
    player,
    enemy,
    mode,
    setTurn,
    setPlayer,
    endGame,
    setEnemy,
    setPlayerHealthColor,
    setEnemyHealthColor,
    setTimeout,
    playerPassives,
    enemyPassives,
  ]);

  return null;
}

export default Attack;