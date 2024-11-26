import { useEffect, useState } from 'react';
import { statusEffects } from './statusEffects.js';
import { animations } from './animations'
import { activeSkills } from './activeSkills.js';
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

// Function to handle DoT status effects
const applyDoTStatusEffects = async (character, setEntity, setEntityHealthColor, winning_side, endGame, updateMoney, gameEnded) => {
  const effectsToRemove = [];
  let deathCheck = false;

  // Filter status effects to only include "DoT" types
  const dotEffects = character.status_effects.filter(effect => effect.type === "DoT");

  // Count the stacks of each unique "DoT" status effect
  const statusEffectCounts = dotEffects.reduce((acc, effect) => {
    if (acc[effect.name]) {
      acc[effect.name].stackCount += 1;
    } else {
      acc[effect.name] = { ...effect, stackCount: 1 };
    }
    return acc;
  }, {});

  // Convert statusEffectCounts from Object to Array and loop through each unique status effect type to activate each effect functions based on its stack count
  for (const status_effect_stack of Object.values(statusEffectCounts)) {
    // Apply the effect and update the deathCheck status
    deathCheck = await status_effect_stack.effect(
      setEntity,
      setEntityHealthColor,
      status_effect_stack.stackCount,
      deathCheck
    );

    // Reduce the duration of all matching status effects
    for (const status_effect of dotEffects) {
      if (status_effect_stack.name === status_effect.name) {
        if (status_effect.duration !== null) {
          // Reduce duration by 1 after effect is applied
          status_effect.duration -= 1;

          // Check if the duration is zero or below, and mark it for removal
          if (status_effect.duration <= 0) {
            effectsToRemove.push(status_effect);
          }
        }
      }
    }

    // If the character dies, break out of the loop
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

const applyBuffStatusEffects = async (character, setEntity) => {
  const effectsToRemove = [];

  // Iterate over the character's status effects and process only "Buff" types
  for (const statusEffect of character.status_effects) {
    if (statusEffect.type === "Buff") {
      // Reduce the duration of Buff effects
      if (statusEffect.duration !== null) {
        statusEffect.duration -= 1;

        // Check if the duration has expired and mark it for removal
        if (statusEffect.duration <= 0) {
          effectsToRemove.push(statusEffect);
        }
      }
    }
  }

// Remove expired Buff status effects from the character's status effects list
character.status_effects = character.status_effects.filter(
  effect => !effectsToRemove.includes(effect)
);

// Update the entity with the new status effects list
setEntity(prevEntity => ({
  ...prevEntity,
  status_effects: [...character.status_effects],
}));

return effectsToRemove.length > 0;
};

//Function to give statusEffects to character
const inflictStatusEffects = (setEntity, buffName) => {
  const statusEffect = { ...statusEffects[buffName] }; // Copy the buff info

  setEntity(prevEntity => {
    const updatedStatusEffects = [...prevEntity.status_effects];

    // Check if the effect already exists
    const existingEffect = updatedStatusEffects.find(
      effect => effect.name === statusEffect.name
    );

    if (existingEffect) {
      if (statusEffect.type === "Buff") {
        // Refresh the effect for Buff type effects
        existingEffect.duration = statusEffect.duration;
      } else if (statusEffect.stackCount !== null) {
        // Increment stackCount for stackable effects
        existingEffect.stackCount++;
      } else if (statusEffect.duration !== null) {
        // Add another instance for duration-based effects
        updatedStatusEffects.push({ ...statusEffect });
      }
    } else {
      // Effect does not exist; add it
      updatedStatusEffects.push({ ...statusEffect });
    }

    return { ...prevEntity, status_effects: updatedStatusEffects };
  });
};

// Function to calculate damage
const calculateDamage = (attacker, defender, damage, attackerPassives, defenderPassives) => {
  // Damage reducing logics
  if (!attackerPassives.includes('Arcane Infused')) {
    if (defenderPassives.includes('Bulwark')) {
      damage *= 0.5;
    }
  }
  // Damage increasing logics
  const damageUpBuff = attacker.status_effects.find(effect => effect.name === "Damage Up");
  if (damageUpBuff) {
    damage *= 1.2;
  }

  return damage;
};

// Function to handle damage
const doDamage = async (
  attacker,
  defenderSide, // Represents 'Player' or 'Enemy'
  damage,
  defender,
  attackerPassives,
  defenderPassives,
  setDefender,
  setDefenderHealthColor,
  setAttacker,
  setAttackerHealthColor,
  updateMoney,
  updateCharacterLevel,
  endGame,
  gameEnded
) => {
  if (gameEnded.current) return false;

  // Calculate final damage considering passives
  damage = calculateDamage(attacker, defender, damage, attackerPassives, defenderPassives);

  // Reduce defender's health and check if they are defeated
  setDefender((prevDefender) => {
    const newHealth = prevDefender.health - damage;

    if (newHealth <= 0) {
      handleGameEnd(
        defenderSide === "Player" ? "Enemy" : "Player",
        updateMoney,
        updateCharacterLevel,
        defenderSide === "Enemy" ? prevDefender.money_drop : undefined,
        defenderSide === "Enemy" ? prevDefender.experience_drop : undefined,
        attacker,
        defenderSide === "Enemy" ? setAttacker : undefined,
        endGame,
        gameEnded
      );
    }

    flashHealthColor("red", setDefenderHealthColor);
    return { ...prevDefender, health: Math.max(newHealth, 0) };
  });

  // Handle passives for the attacker
  if (attackerPassives.includes("Life Steal")) {
    setAttacker((prevAttacker) => {
      const healedHealth = prevAttacker.health + damage / 2;
      flashHealthColor("lightblue", setAttackerHealthColor);
      console.log(
        `${defenderSide === "Player" ? "Enemy" : "Player"} healing: ${
          prevAttacker.health
        } + ${damage / 2} = ${Math.min(healedHealth, prevAttacker.maxHealth)}`
      );
      return { ...prevAttacker, health: Math.min(healedHealth, prevAttacker.maxHealth) };
    });
  }
  if (attackerPassives.includes("Poison Tip")) {
    inflictStatusEffects(setDefender, "poison");
  }
  if (attackerPassives.includes("Soul Absorption")) {
    inflictStatusEffects(setAttacker, "soul");
  }

  //Handles passives for the defender
  if (defenderPassives.includes("Chest Mimic")) {
    updateMoney(10);
    console.log("Enemy dropped 10 coins!");
  }

  return true;
};

const doHeal = async (
  attacker,
  defenderSide, // Represents 'Player' or 'Enemy'
  damage,
  defender,
  attackerPassive,
  defenderPassive,
  setDefender,
  setDefenderHealthColor,
  setAttacker,
  setAttackerHealthColor,
  updateMoney,
  updateCharacterLevel,
  endGame,
  gameEnded
) => {
  if (gameEnded.current) return false;

  // Heal the user
  setAttacker((prevAttacker) => {
    const newHealth = prevAttacker.health + damage;
    flashHealthColor("lightblue", setAttackerHealthColor);
    return { ...prevAttacker, health: Math.min(newHealth, prevAttacker.maxHealth) };
  });

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
  await basicAttack(attacker, target, damage/2, setAnimation, ...args);
};

const soulBarrage = async (attacker, target, damage, setAnimation, ...args) => {
  await basicAttack(attacker, target, damage, setAnimation, ...args);
  await basicHeal(attacker, target, damage, setAnimation, ...args);
  setAnimation(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await basicAttack(attacker, target, damage, setAnimation, ...args);
  await basicHeal(attacker, target, damage, setAnimation, ...args);
  setAnimation(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await basicAttack(attacker, target, damage, setAnimation, ...args);
  await basicHeal(attacker, target, damage, setAnimation, ...args);
};

const basicHeal = async (attacker, target, damage, setAnimation, ...args) => {
  await doHeal(attacker, target, damage, ...args);
}
// Store attack functions in an object
const attackFunctions = {
  basicAttack,
  doubleAttack,
  soulBarrage,
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
  gameEnded,
  selectedSkills,
}) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [cooldowns, setCooldowns] = useState(
    activeSkills.reduce((acc, skill) => {
      acc[skill.id] = 0;  // Initialize cooldowns to 0 for all skills
      return acc;
    }, {})
  );
  useEffect(() => {
    const handleAttack = async () => {
      const isPlayerTurn = turn === "Player";
      const attacker = isPlayerTurn ? player : enemy;
      const defender = isPlayerTurn ? enemy : player;
      const setAttacker = isPlayerTurn ? setPlayer : setEnemy;
      const setDefender = isPlayerTurn ? setEnemy : setPlayer;
      const setAttackerHealthColor = isPlayerTurn
        ? setPlayerHealthColor
        : setEnemyHealthColor;
      const setDefenderHealthColor = isPlayerTurn
        ? setEnemyHealthColor
        : setPlayerHealthColor;
      const attackerPassives = isPlayerTurn ? playerPassives : enemyPassives;
      const defenderPassives = isPlayerTurn ? enemyPassives : playerPassives;
      const setAttackerAnimation = isPlayerTurn
        ? setPlayerAnimation
        : setEnemyAnimation;
      const nextTurn = isPlayerTurn ? "Enemy" : "Player";
        async function actionAttack(){
          const soulEffect = attacker.status_effects.find(effect => effect.name === "Soul");
          if(soulEffect && soulEffect.stackCount >= 5)
          {
            // Reduce Soul stacks after using soulBarrage
            setAttacker(prevAttacker => {
              const updatedEffects = prevAttacker.status_effects.map(effect => {
                if (effect.name === "Soul") {
                  return { ...effect, stackCount: effect.stackCount - 5 };
                }
                return effect;
              });
              return { ...prevAttacker, status_effects: updatedEffects };
            });
            await attackFunctions.soulBarrage(attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded);
          }else{
            const skillId = attacker.skills[0];
            if (attackFunctions[skillId]) {
              await attackFunctions[skillId](attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded);
            }
          }
          // Check if the target has any "Buff" type status effects before applying them
          if (attacker.status_effects.some(effect => effect.type === "Buff")) {
            await applyBuffStatusEffects(attacker, setAttacker);
            setTurn(nextTurn);
          } else {
            // Otherwise, execute the turn switch immediately
            setTurn(nextTurn);
          }
        }
        //Check if target has status effect
        if (attacker.status_effects.some(effect => effect.type === "DoT")) {
          await applyDoTStatusEffects(attacker, setAttacker, setAttackerHealthColor, nextTurn, endGame, updateMoney, gameEnded)
          .then(deathCheck => {
            if(deathCheck !== true){
              //Wait for status effects to take effect
              setTimeout(() => {
                actionAttack();
              }, TURN_LENGTH / 2);
            } else{
              //Entity died from status effect, ending the game
              handleGameEnd(nextTurn, updateMoney, updateCharacterLevel, isPlayerTurn ? undefined : enemy.money_drop, isPlayerTurn ? undefined : enemy.experience_drop, player, setPlayer, endGame, gameEnded);
            }
          })
        }else{
          //Otherwise execute without waiting for applyDoTStatusEffects
          actionAttack();
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
  gameEnded,
  selectedSkills,
  ]);

  // Handle Cooldown Timers (this is separated from the turn system)
  useEffect(() => {
    const cooldownInterval = setInterval(() => {
      setCooldowns(prevCooldowns => {
        const updatedCooldowns = {};
        Object.keys(prevCooldowns).forEach(skillId => {
          if (prevCooldowns[skillId] > 0) {
            updatedCooldowns[skillId] = prevCooldowns[skillId] - 1;
          } else {
            updatedCooldowns[skillId] = 0;
          }
        });
        return updatedCooldowns;
      });
    }, 1000); // Decrease cooldown every second

    return () => clearInterval(cooldownInterval); // Cleanup
  }, []);

  // Handle Skill Usage independent of turn
  useEffect(() => {
    if (selectedSkill && cooldowns[selectedSkill] === 0) {
      const skill = activeSkills.find(s => s.id === selectedSkill);
      if (skill) {
        // Trigger the skill effect based on selected skill
        skill.useSkill(doDamage, doHeal, inflictStatusEffects, player, "Enemy", player.damage, enemy, playerPassives, enemyPassives, setEnemy, setEnemyHealthColor, setPlayer, setPlayerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded);
        // Set cooldown for selected skill
        setCooldowns(prevCooldowns => ({
          ...prevCooldowns,
          [selectedSkill]: skill.cooldown
        }));
        setSelectedSkill(null); // Reset selected skill
      }
    }
  }, [
    selectedSkill, 
    cooldowns, 
    player, 
    player.damage, 
    playerPassives, 
    enemy, 
    enemyPassives, 
    setPlayer, 
    setPlayerHealthColor, 
    setEnemy, 
    setEnemyHealthColor, 
    updateMoney, 
    updateCharacterLevel, 
    endGame, 
    gameEnded,
  ]);

  return (
    <div>
      <div className="active-skills">
        {activeSkills
        .filter((skill) => selectedSkills.includes(skill.id))
        .map((skill) => (
          <button
            key={skill.id}
            disabled={cooldowns[skill.id] > 0} // Disable if cooldown > 0
            onClick={() => setSelectedSkill(skill.id)} // Set selected skill
            title={skill.description}
          >
            {skill.name} 
            {cooldowns[skill.id] > 0 && ` (${cooldowns[skill.id]}s)`} {/* Show cooldown */}
          </button>
        ))}
      </div>
    </div>
  );
}
export default Attack;