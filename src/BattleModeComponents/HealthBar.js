import React, { useState, useEffect } from 'react';

function HealthBar({ health, maxHealth, healthColor }) {
  const [displayedHealth, setDisplayedHealth] = useState(health);
  const animationDuration = 100; // Duration of the animation in milliseconds
  const steps = 100; // Number of steps for the animation
  const stepTime = animationDuration / steps;
  useEffect(() => {
    if (displayedHealth !== health) {
      const healthDifference = health - displayedHealth;
      const healthStep = healthDifference / steps; // Amount of health to adjust per step

      const intervalId = setInterval(() => {
        setDisplayedHealth(prevHealth => {
          const newHealth = prevHealth + healthStep;
          if ((healthStep > 0 && newHealth >= health) || (healthStep < 0 && newHealth <= health)) {
            clearInterval(intervalId);
            return health;
          }
          return newHealth;
        });
      }, stepTime);

      return () => clearInterval(intervalId); // Cleanup interval when component unmounts
    }
  }, [health, displayedHealth]);

  return (
    <p className={`health ${healthColor}`}>
      Health: {Math.round(displayedHealth)} / {maxHealth}
    </p>
  );
}

export default HealthBar;