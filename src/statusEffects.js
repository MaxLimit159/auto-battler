// Constants
const TURN_LENGTH = 1000;
// Function to flash health color
const flashHealthColor = (color, setEntityHealthColor) => {
  setEntityHealthColor(color);
  setTimeout(() => setEntityHealthColor(''), TURN_LENGTH / 5);
};

export const statusEffects = {
    poison: { 
      name: "Poison", 
      image: "/StatusEffectImage/poison.png",
      description: "Takes 10% of max health as damage on turn start.",
      damage: 0,
      type: "DoT",
      duration: 2,
      canHaveDuplicate: true,
      stackCount: null,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          if (deathCheck !== true) {
            setEntity(prevEntity => {
              // Calculate total damage based on identicalStackCount
              const totalDamage = prevEntity.maxHealth * 0.05 * identicalStackCount;
              const newHealth = prevEntity.health - totalDamage;
      
              console.log(prevEntity.name + " takes " + totalDamage + " as poison damage from " + identicalStackCount + " stack(s)!");
              flashHealthColor('purple', setEntityHealthColor);
      
              if (newHealth <= 0) {
                deathCheck = true;
              }
      
              // Return the updated entity state with the new health
              return { ...prevEntity, health: Math.max(newHealth, 0) };
            });

            setTimeout(() => {
              resolve(deathCheck);
            }, 0); // Ensure that resolve happens after state update because deathCheck is set inside it
          }
        });
      }
    },
    bleed: { 
      name: "Bleed", 
      image: "/StatusEffectImage/bleed.png",
      description: "Takes 50% of applier's damage on turn start.",
      damage: 0, //Will be initialized with 50% of inflicter's damage
      type: "DoT",
      duration: 2,
      canHaveDuplicate: true,
      stackCount: null,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          if (deathCheck !== true) {
            setEntity(prevEntity => {
              // Calculate total damage based on identicalStackCount
              const newHealth = prevEntity.health - totalDamage;
      
              console.log(prevEntity.name + " takes " + totalDamage + " as bleed damage from " + identicalStackCount + " stack(s)!");
              flashHealthColor('red', setEntityHealthColor);
      
              if (newHealth <= 0) {
                deathCheck = true;
              }
      
              // Return the updated entity state with the new health
              return { ...prevEntity, health: Math.max(newHealth, 0) };
            });

            setTimeout(() => {
              resolve(deathCheck);
            }, 0); // Ensure that resolve happens after state update because deathCheck is set inside it
          }
        });
      }
    },
    soul: { 
      name: "Soul", 
      image: "/StatusEffectImage/soul.png",
      description: "Used to launch powerful attacks.", 
      type: "Neutral",
      duration: null,
      canHaveDuplicate: false,
      stackCount: 1,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          resolve(deathCheck);
        })
      }
    },
    codexArcaneAssault: { 
      name: "Arcmage Codex: Arcane Assault", 
      image: "/StatusEffectImage/codexArcaneAssault.png",
      description: "Replace basic attack with Arcane Assault: Attacks 3 times. Changes to Arcmage Codex: Mystic Aegis at the end of turn.", 
      type: "Neutral",
      duration: null,
      canHaveDuplicate: false,
      stackCount: null,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          resolve(deathCheck);
        });
      }
    },
    codexMysticAegis: { 
      name: "Arcmage Codex: Mystic Aegis", 
      image: "/StatusEffectImage/codexMysticAegis.png",
      description: "Replace basic attack with Mystic Aegis: Gains 50% of max health as shield. Changes to Arcmage Codex: Venomous Verse at the end of turn.", 
      type: "Neutral",
      duration: null,
      canHaveDuplicate: false,
      stackCount: null,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
            resolve(deathCheck);
        })
      }
    },
    codexVenomousVerse: {
      name: "Arcmage Codex: Venomous Verse", 
      image: "/StatusEffectImage/codexVenomousVerse.png",
      description: "Replace basic attack with Venomous Verse: Applies 3 Poison. Changes to Arcmage Codex: Venomous Verse at the end of turn.", 
      type: "Neutral",
      duration: null,
      canHaveDuplicate: false,
      stackCount: null,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          resolve(deathCheck);
        })
      }
    },
    damageUp: { 
      name: "Damage Up", 
      image: "/StatusEffectImage/damageUp.png",
      description: "Deals 20% extra damage.",
      type: "Buff",
      canHaveDuplicate: false,
      duration: 2,
      stackCount: null,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          resolve(deathCheck);
        })
      }
    },
    necrotic: { 
      name: "Necrotic", 
      image: "/StatusEffectImage/necrotic.png",
      description: "Each stack increases damage by 5% of enemy max health.", 
      type: "Golden",
      duration: null,
      canHaveDuplicate: false,
      stackCount: 1,
      effect: function (setEntity, setEntityHealthColor, identicalStackCount, totalDamage, deathCheck) {
        return new Promise((resolve) => {
          resolve(deathCheck);
        })
      }
    },
  };