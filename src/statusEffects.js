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
      description: "Takes 10% of max health as damage on turn.", 
      duration: 2,
      stackCount: null,
      effect: (setEntity, setEntityHealthColor, stackCount, deathCheck) => {
        return new Promise((resolve) => {
          if (deathCheck !== true) {
            setEntity(prevEntity => {
              // Calculate total damage based on stackCount
              const totalDamage = prevEntity.maxHealth * 0.05 * stackCount;
              const newHealth = prevEntity.health - totalDamage;
      
              console.log(prevEntity.name + " takes " + totalDamage + " as poison damage from " + stackCount + " stack(s)!");
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
    soul: { 
      name: "Soul", 
      image: "/StatusEffectImage/soul.png",
      description: "Used to launch powerful attacks.", 
      duration: null,
      stackCount: 1,
      effect: (setEntity, setEntityHealthColor, stackCount, deathCheck) => {
        return new Promise((resolve) => {
          resolve(deathCheck);
        })
      }
    }
  };