import { useEffect, useState, useRef } from 'react';
import { statusEffects } from './statusEffects.js';
import { animations } from './charactersFiles/animations.js'
import { activeSkills } from './activeSkills.js';
import { characterList } from './charactersFiles/characters.js';
const baseCharacterList = JSON.parse(JSON.stringify(characterList));
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
const createCharacter = (name, level = 1, experience = 0, enemy_type) => {
  // Clone the base character from the baseCharacterList
  const baseCharacter = {...baseCharacterList[name]};

  if (!baseCharacter) {
    throw new Error(`Character ${name} not found in characterList`);
  }

  // Set initial level
  const character = { ...baseCharacter, level, experience, ...(enemy_type !== undefined && { enemy_type })};
  //Return the character with the proper stats based on the given level
  return getLevelUppedStats(character);
};
//Handles game ending logics
const handleGameEnd = (winningSide, updateMoney, updateCharacterLevel, moneyDrop, experienceDrop, winnerChar, loserChar, setPlayer, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives, setEnemy) => {
  // console.log(winningSide);
  if (winningSide === 'Player' && moneyDrop !== undefined) {
    if(loserChar.enemy_type === 'Raid Boss'){
      const newLevel = loserChar.level + 5;
      const goldenBuffs = loserChar.status_effects.filter(effect => effect.type === 'Golden');
      
      const refreshedBoss = createCharacter(loserChar.id, newLevel, 0, 'Raid Boss');

      goldenBuffs.forEach(buff => {
        const existingBuff = refreshedBoss.status_effects.find(effect => effect.name === buff.name);
    
        if (!existingBuff) {
          refreshedBoss.status_effects.push({ ...buff });
        }
      });

      setEnemy(refreshedBoss);
      inflictStatusEffects(setEnemy, "necrotic");

      console.log(`Raid Boss leveled up to ${newLevel}. Stats refreshed!`);
    } else {
      if(moneyDrop !== undefined){
        console.log(winnerChar.name + " gained " + moneyDrop + " money!");
        updateMoney(moneyDrop);
      }
      if(experienceDrop !== undefined){
        console.log(winnerChar.name + " gained " + experienceDrop + " experience!");
        let totalExp = winnerChar.experience + experienceDrop;
        let totalLevel = winnerChar.level;
        let levelUppedCharacter = winnerChar;
        while(totalExp >= calculateExperienceForNextLevel(winnerChar.level)){
          totalExp -= calculateExperienceForNextLevel(winnerChar.level);
          totalLevel += 1;
          levelUppedCharacter = getLevelUppedStats(winnerChar);
          console.log(winnerChar.name + " leveled up!");
        }
        setPlayer(prevPlayer => ({
          ...prevPlayer, experience: totalExp, level: totalLevel, health: levelUppedCharacter.health, maxHealth: levelUppedCharacter.maxHealth, speed: levelUppedCharacter.speed, damage: levelUppedCharacter.damage
        }));
        updateCharacterLevel(winnerChar.id, totalLevel, totalExp);
      }
      if (loserChar.lootTable) {
        loserChar.lootTable.forEach((loot) => {
          if (player_ownedPassives[loot.passiveId] && player_ownedPassives[loot.passiveId].isObtained) {
            return; // Skip this loot since the player already owns it
          }

          const roll = Math.random(); // Generate a random number between 0 and 1
          const chancePercentage = loot.chance / 100; // Convert the chance to a decimal (e.g., 10% -> 0.1)
      
          if (roll <= chancePercentage) {
            console.log(`Player obtained: ${loot.name} (${loot.chance}%)!`);
            updatePlayerOwnedPassives(loot.passiveId, undefined, undefined, true); // Mark the passive as obtained
          }
        });
      }
    }
  } else if (winningSide === "Enemy" && winnerChar.enemy_type === 'Raid Boss') {

  }
  if(loserChar.enemy_type !== 'Raid Boss'){
    gameEnded.current = true; // Set game ended state
    endGame(winningSide);
    console.log(`Game ends. ${winningSide} wins`);
  }
};

// Function to handle status effects
const applyStatusEffects = async (character, setEntity, setEntityHealthColor, winning_side, endGame, updateMoney, gameEnded) => {
  let deathCheck = false;

  // Count the stacks of each unique status effect and sum their total damage
  const statusEffectCounts = character.status_effects.reduce((acc, effect) => {
    if (acc[effect.name]) {
      // Increment stack count
      acc[effect.name].identicalStackCount += 1;
      // Add the current effect's damage to the total damage
      acc[effect.name].totalDamage += effect.damage || 0;
    } else {
      // Initialize the effect with identicalStackCount and totalDamage
      acc[effect.name] = {
        ...effect,
        identicalStackCount: 1,
        totalDamage: effect.damage || 0, // Set damage or 0 if undefined
      };
    }
    return acc;
  }, {});

  // Convert statusEffectCounts from Object to Array and loop through each unique status effect type to activate each effect functions based on its stack count
  for (const statusEffectStack of Object.values(statusEffectCounts)) {
    // Apply the effect and update the deathCheck status
    deathCheck = await statusEffectStack.effect(
      setEntity,
      setEntityHealthColor,
      statusEffectStack.identicalStackCount,
      statusEffectStack.totalDamage,
      deathCheck
    );

    // If the character dies, break out of the loop
    if (deathCheck) {
      break;
    }
  }

  // Update the entity with the current status effects list (no reduction in duration here)
  setEntity(prevEntity => ({
    ...prevEntity,
    status_effects: [...character.status_effects],
  }));

  return deathCheck;
};

const reduceStatusEffectDurations = async (character, setEntity) => {
  setEntity(prevEntity => {
    // Modify prevEntity directly
    for (let i = prevEntity.status_effects.length - 1; i >= 0; i--) {
      const statusEffect = prevEntity.status_effects[i];
      if (statusEffect.duration !== null) {
        statusEffect.duration -= 1;

        // Remove the effect if its duration has expired
        if (statusEffect.duration <= 0) {
          prevEntity.status_effects.splice(i, 1); // Use splice to remove the expired effect
        }
      }
    }

    // Return the updated entity
    return {
      ...prevEntity,
      // Ensure status_effects is updated, though we already mutated it
      status_effects: [...prevEntity.status_effects],
    };
  });
};

//Function to give statusEffects to character
const inflictStatusEffects = (setEntity, buffName, inflicterDamage = 0, setDurration = null) => {
  const statusEffect = { ...statusEffects[buffName] }; // Copy the buff info
  //Set it's durration to the one given
  if(setDurration !== null){
    statusEffect.duration = setDurration;
  }
  // If inflicterDamage is provided and the status effect has a damage property, set the damage
  if (inflicterDamage > 0 && statusEffect.hasOwnProperty('damage')) {
    statusEffect.damage = inflicterDamage;
  }

  setEntity(prevEntity => {
    const updatedStatusEffects = [...prevEntity.status_effects];

    // Check if the effect already exists
    const existingEffect = updatedStatusEffects.find(
      effect => effect.name === statusEffect.name
    );

    if (existingEffect) {
      if (statusEffect.stackCount !== null) {
        // Increment stackCount for stackable effects
        existingEffect.stackCount++;
      } else if (statusEffect.duration !== null) {
        if(statusEffect.canHaveDuplicate === true){
          // Add another instance for duration-based effects
          updatedStatusEffects.push({ ...statusEffect });
        } else {
          //Can't have dupes so just refresh the durration
            existingEffect.duration = statusEffect.duration;
        }
      }
    } else {
      // Effect does not exist; add it
      updatedStatusEffects.push({ ...statusEffect });
    }
    // console.log(updatedStatusEffects);
    return { ...prevEntity, status_effects: updatedStatusEffects };
  });
};

// Function to remove status effects from a character
const removeStatusEffect = (setEntity, buffName) => {
  const statusEffect = { ...statusEffects[buffName] };
  setEntity(prevEntity => {
    // Filter out status effects that do not match the buffName
    const updatedStatusEffects = prevEntity.status_effects.filter(
      effect => effect.name !== statusEffect.name
    );
    // console.log(updatedStatusEffects);
    return { ...prevEntity, status_effects: updatedStatusEffects };
  });
};

// Function to give shield to a character
const giveShield = (setEntity, shieldAmount, entity) => {
  console.log(entity.name, " gained ", shieldAmount, " shield.");
  setEntity(prevEntity => ({
    ...prevEntity,
    shield: prevEntity.shield + shieldAmount
  }));
};

// Function to calculate damage
const calculateDamage = (attacker, defender, damage, attackerPassives, defenderPassives) => {
  // Damage reducing logics
  if (!attackerPassives.includes('Arcane Infused')) {
    if (defenderPassives.includes('Bulwark')) {
      damage *= 0.5;
    }
  }
  if(defenderPassives.includes('Weakening Poison')) {
    if (attacker.status_effects.some(effect => effect.name === "Poison")){
      damage *= 0.75;
    }
  }
  // Damage increasing logics
  const damageUpBuff = attacker.status_effects.find(effect => effect.name === "Damage Up");
  if (damageUpBuff) {
    damage *= 1.2;
  }
  const necroticEffect = attacker.status_effects.find(effect => effect.name === "Necrotic");
  if (necroticEffect) {
    damage += 0.05 * necroticEffect.stackCount * defender.maxHealth;
  }

  return damage;
};

// Function to handle damage
const doDamage = async (
  attacker,
  defenderSide, // Represents 'Player' or 'Enemy'
  attackerDamage,
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
  gameEnded,
  player_ownedPassives,
  updatePlayerOwnedPassives,
) => {
  if (gameEnded.current) return false;
  // Calculate final attackerDamage considering passives
  attackerDamage = calculateDamage(attacker, defender, attackerDamage, attackerPassives, defenderPassives);
  // Calculate final defenderDamage considering passives
  const defenderDamage = calculateDamage(defender, attacker, defender.damage, defenderPassives, attackerPassives);

  // Reduce defender's health and/or shield and check if they are defeated
  setDefender((prevDefender) => {
    const remainingDamage = attackerDamage;
    const maxHealth = prevDefender.maxHealth;
    let updatedShield = prevDefender.shield || 0;
    let updatedHealth = prevDefender.health;
    console.log(attacker.name, " deals ", attackerDamage, " to ", defender.name);
    if (updatedShield > 0) {
      if (remainingDamage > updatedShield) {
        // Damage exceeds shield, reduce health with remaining damage
        const excessDamage = remainingDamage - updatedShield;
        updatedHealth = prevDefender.health - excessDamage;
        updatedShield = 0; // Shield is fully depleted
      } else {
        // Damage is absorbed entirely by the shield
        updatedShield -= remainingDamage;
      }
    } else {
      // No shield, reduce health directly
      updatedHealth -= remainingDamage;
    }

    // Check if the defender is defeated
    if (updatedHealth <= 0) {
      setDefender((prevDefender) => ({
        ...prevDefender,
        health: 0,
        shield: Math.max(updatedShield, 0),
      }));
    
      setTimeout(() => {
        handleGameEnd(
          defenderSide === "Player" ? "Enemy" : "Player",
          updateMoney,
          updateCharacterLevel,
          defenderSide === "Enemy" ? prevDefender.money_drop : undefined,
          defenderSide === "Enemy" ? prevDefender.experience_drop : undefined,
          attacker,
          defender,
          defenderSide === "Enemy" ? setAttacker : undefined,
          endGame,
          gameEnded,
          player_ownedPassives,
          updatePlayerOwnedPassives,
          defenderSide === "Enemy" ? setDefender : undefined,
        );
      }, 0);
    } else {
      // If the attack didn't defeat the defender, check for "Undead Rage" trigger
      if (updatedHealth <= maxHealth * 0.3 && defenderPassives.includes("Undead Rage")) {
        if (defenderSide === "Player"){
          playerHandlePassiveUndeadRage(
            defender,
            attacker,
            attackerDamage,
            setDefender,
            setAttacker
          );
        } else {
          enemyHandlePassiveUndeadRage(
            defender,
            attacker,
            attackerDamage,
            setDefender,
            setAttacker
          );
        }
      }
    }

    // Flash health bar to indicate damage
    flashHealthColor("red", setDefenderHealthColor);

    // Update the defender's state
    return {
      ...prevDefender,
      health: updatedHealth,
      shield: Math.max(updatedShield, 0), // Ensure shield doesn't go below zero
    };
  });

  // Handle passives for the attacker
  if (attackerPassives.includes("Life Steal")) {
    setAttacker((prevAttacker) => {
      const healedHealth = prevAttacker.health + attackerDamage / 2;
      flashHealthColor("lightblue", setAttackerHealthColor);
      return { ...prevAttacker, health: Math.min(healedHealth, prevAttacker.maxHealth) };
    });
  }
  if (attackerPassives.includes("Poison Tip")) {
    inflictStatusEffects(setDefender, "poison");
  }
  if (attackerPassives.includes("Soul Absorption")) {
    inflictStatusEffects(setAttacker, "soul");
  }
  if (attackerPassives.includes("Sharp Edge")) {
    inflictStatusEffects(setDefender, "bleed", Math.floor(attackerDamage / 2));
  }

  //Handles passives for the defender
  if (defenderPassives.includes("Chest Mimic")) {
    updateMoney(10);
    console.log("Enemy dropped 10 coins!");
  }
  if (defenderPassives.includes("Retaliate")) {
    const retaliateDamage = Math.floor(defenderDamage / 2);
    setAttacker((prevAttacker) => {
      const newHealth = prevAttacker.health - retaliateDamage;
      flashHealthColor("red", setAttackerHealthColor);
      console.log(
        `${prevAttacker.name} took ${retaliateDamage} damage from retaliation.`
      );
      return { ...prevAttacker, health: newHealth };
    });
  
    // Check if the attacker is defeated from retaliate damage
    setTimeout(() => {
      setAttacker((prevAttacker) => {
        if (prevAttacker.health <= 0) {
          handleGameEnd(
            defenderSide,
            updateMoney,
            updateCharacterLevel,
            defenderSide === "Player" ? prevAttacker.money_drop : undefined,
            defenderSide === "Player" ? prevAttacker.experience_drop : undefined,
            defender,
            attacker,
            defenderSide === "Player" ? setDefender : undefined,
            endGame,
            gameEnded,
            player_ownedPassives,
            updatePlayerOwnedPassives,
            defenderSide === "Player" ? setAttacker : undefined,
          );
        }
        return prevAttacker;
      });
    }, 0); // Allow the attacker health update to trigger first
  }
  return true;
};

const doHeal = async (
  attacker,
  defenderSide, // Represents 'Player' or 'Enemy'
  attackerDamage,
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
  gameEnded,
  player_ownedPassives,
  updatePlayerOwnedPassives
) => {
  if (gameEnded.current) return false;

  // Heal the user
  setAttacker((prevAttacker) => {
    const newHealth = prevAttacker.health + attackerDamage;
    console.log(attacker.name, " heals for ", attackerDamage);
    flashHealthColor("lightblue", setAttackerHealthColor);
    return { ...prevAttacker, health: Math.min(newHealth, prevAttacker.maxHealth) };
  });

  return true;
};

//Closures to apply effects that happen once per battle
const createPassiveUndeadRageHandler = () => {
  let hasRun = false; // Tracks if the function has already run

  return async (user, target, userDamage, setUser, setTarget) => {
    if (hasRun) return; // Exit early if the function has already run

    console.log(user.name, " activates Undead Rage passive!");
    hasRun = true; // Mark the function as executed
    giveShield(setUser, user.maxHealth * 0.5, user);
    inflictStatusEffects(setUser, 'damageUp', undefined, 3);
  };
};
let playerHandlePassiveUndeadRage = createPassiveUndeadRageHandler();
let enemyHandlePassiveUndeadRage = createPassiveUndeadRageHandler();

// Define attack functions
const basicAttack = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  if (target === 'Player') {
    setAnimation(animationVarriants.enemyAttack);
  } else {
    setAnimation(animationVarriants.playerAttack);
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      doDamage(attacker, target, attackerDamage, ...args);
    }, 150);
    setTimeout(() => {
      resolve();
    }, 300); //Both timeout runs sync-ly so 300 but doDamage runs after the first 150 which is the impact frame
  });
};

const doubleAttack = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  await basicAttack(attacker, target, attackerDamage, setAnimation, ...args);
  setAnimation(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await basicAttack(attacker, target, attackerDamage/2, setAnimation, ...args);
};

const soulBarrage = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  await basicAttack(attacker, target, attackerDamage, setAnimation, ...args);
  await basicHeal(attacker, target, attackerDamage, setAnimation, ...args);
  setAnimation(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await basicAttack(attacker, target, attackerDamage, setAnimation, ...args);
  await basicHeal(attacker, target, attackerDamage, setAnimation, ...args);
  setAnimation(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await basicAttack(attacker, target, attackerDamage, setAnimation, ...args);
  await basicHeal(attacker, target, attackerDamage, setAnimation, ...args);
};

const arcaneAssault = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  for (let i = 0; i < 3; i++) {
    await basicAttack(attacker, target, attackerDamage, setAnimation, ...args);
    setAnimation(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  inflictStatusEffects(args[5], "codexMysticAegis");
  removeStatusEffect(args[5], "codexArcaneAssault");
};

const mysticAegis = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  giveShield(args[5], attacker.maxHealth*0.5, attacker);
  inflictStatusEffects(args[5], "codexVenomousVerse");
  removeStatusEffect(args[5], "codexMysticAegis");
};

const venomousVerse = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  inflictStatusEffects(args[3], "poison");
  inflictStatusEffects(args[3], "poison");
  inflictStatusEffects(args[3], "poison");
  inflictStatusEffects(args[5], "codexArcaneAssault");
  removeStatusEffect(args[5], "codexVenomousVerse");
};


const basicHeal = async (attacker, target, attackerDamage, setAnimation, ...args) => {
  await doHeal(attacker, target, attackerDamage, ...args);
}
// Store attack functions in an object
const attackFunctions = {
  basicAttack,
  doubleAttack,
  soulBarrage,
  arcaneAssault,
  mysticAegis,
  venomousVerse,
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
  player_ownedPassives,
  updatePlayerOwnedPassives,
  logs,
  setRaidTotalScore,
}) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [cooldowns, setCooldowns] = useState(
    activeSkills.reduce((acc, skill) => {
      acc[skill.id] = 0;  // Initialize cooldowns to 0 for all skills
      return acc;
    }, {})
  );

  //Code block for score tracking during Raid Boss
  const previousHealthRef = useRef(enemy.health);
  useEffect(() => {
    // Check if enemy's health decreased
    if (enemy && enemy.health !== undefined && enemy.enemy_type === 'Raid Boss') {
      const previousHealth = previousHealthRef.current;

      if (enemy.health < previousHealth) {
        const damageTaken = previousHealth - enemy.health;
        setRaidTotalScore(prevScore => Math.floor(prevScore + damageTaken));
      }
      previousHealthRef.current = enemy.health;
    }
  }, [enemy, setRaidTotalScore]);

  //Calculate aniamtion distance based on viewport size
  useEffect(() => {
    const screenWidth = window.innerWidth;
  
    // Calculate the attack distance based on the screen width
    const playerAttackDistance = screenWidth <= 768 ? screenWidth * 0.5 : undefined;
    const enemyAttackDistance = screenWidth <= 768 ? screenWidth * 0.5 : undefined;
  
    if(playerAttackDistance && enemyAttackDistance){
      animationVarriants.playerAttack = {
        ...animationVarriants.playerAttack,
        x: [0, playerAttackDistance, playerAttackDistance, 0],
      };
    
      animationVarriants.enemyAttack = {
        ...animationVarriants.enemyAttack,
        x: [0, -enemyAttackDistance, -enemyAttackDistance, 0],
      };
    }
  })

  //Refresh one-time use functions when a battle starts
  useEffect(() => {
    playerHandlePassiveUndeadRage = createPassiveUndeadRageHandler();
    enemyHandlePassiveUndeadRage = createPassiveUndeadRageHandler();
  }, []);
  
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
        const codexArcaneAssaultEffect = attacker.status_effects.find(effect => effect.name === "Arcmage Codex: Arcane Assault");
        const codexMysticAegis = attacker.status_effects.find(effect => effect.name === "Arcmage Codex: Mystic Aegis");
        const codexVenomousVerse = attacker.status_effects.find(effect => effect.name === "Arcmage Codex: Venomous Verse");
        if(soulEffect && soulEffect.stackCount >= 5)
        {
          soulEffect.stackCount -= 5;
          await attackFunctions.soulBarrage(attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives);
        }else if(codexArcaneAssaultEffect){
          await attackFunctions.arcaneAssault(attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives);
        }else if(codexMysticAegis){
          await attackFunctions.mysticAegis(attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives);
        }else if(codexVenomousVerse){
          await attackFunctions.venomousVerse(attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives);
        }else{
          const skillId = attacker.skills[0];
          if (attackFunctions[skillId]) {
            await attackFunctions[skillId](attacker, nextTurn, attacker.damage,setAttackerAnimation, defender, attackerPassives, defenderPassives, setDefender, setDefenderHealthColor, setAttacker, setAttackerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives);
          }
        }
        await reduceStatusEffectDurations(attacker, setAttacker)
        // Increment the turn and execute turn effects
        setTurn(nextTurn);
      }
      //Check if target has status effect
      if (attacker.status_effects.length > 0) {
        await applyStatusEffects(attacker, setAttacker, setAttackerHealthColor, nextTurn, endGame, updateMoney, gameEnded)
        .then(deathCheck => {
          if(deathCheck !== true){
              actionAttack();
          } else{
            //Entity died from status effect, ending the game (attacker is the one dying)
            handleGameEnd(nextTurn, updateMoney, updateCharacterLevel, isPlayerTurn ? undefined : enemy.money_drop, isPlayerTurn ? undefined : enemy.experience_drop, defender, attacker, setPlayer, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives, setEnemy);
          }
        })
      }else{
        //Otherwise execute without waiting for applyStatusEffects
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
  player_ownedPassives,
  updatePlayerOwnedPassives,
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
        skill.useSkill(doDamage, doHeal, inflictStatusEffects, player, "Enemy", player.damage, enemy, playerPassives, enemyPassives, setEnemy, setEnemyHealthColor, setPlayer, setPlayerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded, player_ownedPassives, updatePlayerOwnedPassives);
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
    player_ownedPassives,
    updatePlayerOwnedPassives,
  ]);

  return (
    <>
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
    <div
    className='battle-logs-container'
    >
      {logs.length === 0 ? (
        <></>
      ) : (
        logs.map((log, index) => <p className='battle-logs' key={index}>{log}</p>)
      )}
    </div>
  </>
)}
export default Attack;