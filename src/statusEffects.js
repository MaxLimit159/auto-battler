// Constants
const TURN_LENGTH = 1000;
// Function to flash health color
const flashHealthColor = (color, setEntityHealthColor) => {
  setEntityHealthColor(color);
  setTimeout(() => setEntityHealthColor(''), TURN_LENGTH / 5);
};

let deathCheck = false; // Initialize deathCheck as false
export const statusEffects = {
    poison: { 
      name: "Poison", 
      image: "/StatusEffectImage/poison.png",
      description: "Takes 10% of max health as damage on turn.", 
      duration: 2,
      effect: (setEntity, setEntityHealthColor, stackCount) => {
        if(deathCheck !== true){
        setEntity(prevEntity => {
          // Calculate total damage based on stackCount
          const totalDamage = prevEntity.maxHealth * 0.1 * stackCount;
          const newHealth = prevEntity.health - totalDamage;
          
          console.log(prevEntity.name + " takes " + totalDamage + " as poison damage from " + stackCount + " stack(s)!");
          flashHealthColor('purple', setEntityHealthColor);
          
          // Check if the entity's health is below or equal to 0
          if (newHealth <= 0) {
            deathCheck = true;
          }
      
          // Return the updated entity state with the new health
          return { ...prevEntity, health: Math.max(newHealth, 0) };
        });
      }
        return deathCheck;
      }
    
    }
  };