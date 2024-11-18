import { useEffect } from 'react';
import { statusEffects } from './statusEffects.js';
import { animations } from './animations'
const TURN_LENGTH = 1000;
const animationVarriants = animations;
// Function to flash health color
const flashHealthColor = (color, setEntityHealthColor) => {
  setEntityHealthColor(color);
  setTimeout(() => setEntityHealthColor(''), TURN_LENGTH / 5);
};
//Used for handling level up
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
//Handles game ending logics
const handleGameEnd = (winningSide, updateMoney, updateCharacterLevel, moneyDrop, experienceDrop, playerCharacter, setPlayer, endGame, gameEnded) => {
  gameEnded.current = true; // Set game ended state
  if (winningSide === 'Player' && moneyDrop !== undefined) {
    if(moneyDrop !== undefined){
      updateMoney(moneyDrop);
    }
    if(experienceDrop !== undefined){
      let totalExp = playerCharacter.experience + experienceDrop;
      let totalLevel = playerCharacter.level;
      let levelUppedCharacter = playerCharacter;
      while(totalExp >= calculateExperienceForNextLevel(playerCharacter.level)){
        totalExp -= calculateExperienceForNextLevel(playerCharacter.level);
        totalLevel += 1;
        levelUppedCharacter = getLevelUppedStats(playerCharacter);
        console.log(playerCharacter.name + " leveled up!");
      }
      setPlayer(prevPlayer => ({
        ...prevPlayer, experience: totalExp, level: totalLevel, health: levelUppedCharacter.health, maxHealth: levelUppedCharacter.maxHealth, speed: levelUppedCharacter.speed, damage: levelUppedCharacter.damage
      }));
      updateCharacterLevel(playerCharacter.id, totalLevel, totalExp);
    }
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
      status_effect_stack.stackCount,
      deathCheck,
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
const doDamage = async (attacker, target, damage, setPlayer, endGame, setEnemyHealthColor, setEnemy, setPlayerHealthColor, playerPassives, enemyPassives, updateMoney, updateCharacterLevel, gameEnded) => {
  if (gameEnded.current) return false;
  
  const targetPassive = target === 'Player' ? playerPassives : enemyPassives;
  const attackerPassive = target === 'Player' ? enemyPassives : playerPassives;

  damage = calculateDamage(damage, targetPassive, attackerPassive);
  // Active effects after calculating final damage
  if (target === 'Enemy') {
    setEnemy(prevEnemy => {
      const newHealth = prevEnemy.health - damage;
      if (newHealth <= 0) {
        handleGameEnd('Player', updateMoney, updateCharacterLevel, prevEnemy.money_drop, prevEnemy.experience_drop, attacker, setPlayer, endGame, gameEnded);
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
  } else if (target === 'Player') {
    setPlayer(prevPlayer => {
      const newHealth = prevPlayer.health - damage;
      if (newHealth <= 0) {
        handleGameEnd('Enemy', updateMoney, updateCharacterLevel, undefined, undefined, undefined, undefined, endGame, gameEnded);
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
  return true;
};

// Define attack functions
const basicAttack = async (attacker, target, damage, setAnimation, ...args) => {
  if (target === 'Player') {
    setAnimation(animationVarriants.enemyAttack);
  } else {
    setAnimation(animationVarriants.playerAttack);
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      doDamage(attacker, target, damage, ...args);
    }, 150);
    setTimeout(() => {
      resolve();
    }, 300); //Both timeout runs sync-ly so 300 but doDamage runs after the first 150 which is the impact frame
  });
};

const doubleAttack = async (attacker, target, damage, setAnimation, ...args) => {
  await basicAttack(attacker, target, damage, setAnimation, ...args);
  setAnimation(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await basicAttack(attacker, target, damage, setAnimation, ...args);
};

// Store attack functions in an object
const attackFunctions = {
  basicAttack,
  doubleAttack,
};

function Attack({
  updateMoney,
  updateCharacterLevel,
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
  setPlayerAnimation,
  setEnemyAnimation,
  playerPassives,
  enemyPassives,
  gameEnded
}) {
  useEffect(() => {
    const handleAttack = async () => {
      if (turn === 'Player') {
        // let deathCheckPlayer = false;
        async function playerAttacks(){
          const skillId = player.skills[0];
          if (attackFunctions[skillId]) {
            await attackFunctions[skillId](player, 'Enemy', player.damage,setPlayerAnimation, setPlayer, endGame, setEnemyHealthColor, setEnemy, setPlayerHealthColor, playerPassives, enemyPassives, updateMoney, updateCharacterLevel, gameEnded);
          }
          setTurn('Enemy');
        }
        //Check if target has status effect
        if(player.status_effects.length > 0){
          await applyStatusEffects(player, setPlayer, setPlayerHealthColor, "Enemy", endGame, updateMoney, gameEnded)
          .then(deathCheckPlayer => {
            // console.log("Player death from status: ",deathCheckPlayer);
            if(deathCheckPlayer !== true){
              //Wait for status effects to take effect
              setTimeout(() => {
                playerAttacks();
              }, TURN_LENGTH / 2);
            } else{
              //Entity died from status effect, ending the game
              handleGameEnd('Enemy', updateMoney, updateCharacterLevel, undefined, undefined, player, setPlayer, endGame, gameEnded);
            }
          })
        }else{
          //Otherwise execute without waiting for applyStatusEffects
          playerAttacks();
        }
      } else if (turn === 'Enemy') {
        async function enemyAttacks(){
          const skillId = enemy.skills[0];
          if (attackFunctions[skillId]) {
            await attackFunctions[skillId](enemy, 'Player', enemy.damage,setEnemyAnimation, setPlayer, endGame, setEnemyHealthColor, setEnemy, setPlayerHealthColor, playerPassives, enemyPassives, updateMoney, updateCharacterLevel, gameEnded);
          }
          setTurn('Player');
        }
        //Check if target has status effect
        if(enemy.status_effects.length > 0){
          await applyStatusEffects(enemy, setEnemy, setEnemyHealthColor, "Player", endGame, updateMoney, gameEnded)
          .then(deathCheckEnemy => {
            // console.log("Enemy death from status: ",deathCheckEnemy);
            if(deathCheckEnemy !== true){
              //Wait for status effects to take effect
              setTimeout(()=>{
                enemyAttacks();
              }, TURN_LENGTH / 2);
            } else {
              //Entity died from status effect, ending the game
              handleGameEnd('Player', updateMoney, updateCharacterLevel, enemy.money_drop, enemy.experience_drop, player, setPlayer, endGame, gameEnded);
            }
          })
        }else{
          //Otherwise execute without waiting for applyStatusEffects
          enemyAttacks();
        }
      }
    };

    const attackInterval = setInterval(handleAttack, TURN_LENGTH);

    return () => clearInterval(attackInterval);
  }, [
  updateMoney,
  updateCharacterLevel,
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
  setPlayerAnimation,
  setEnemyAnimation,
  playerPassives,
  enemyPassives,
  gameEnded
  ]);

  return null;
}
export default Attack;