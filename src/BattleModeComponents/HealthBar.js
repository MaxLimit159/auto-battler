import React, { useState, useEffect } from 'react';

function HealthBar({ health, maxHealth, healthColor, shield }) {
  const [displayedHealth, setDisplayedHealth] = useState(health);

  // Immediately update displayedHealth when health changes
  useEffect(() => {
    setDisplayedHealth(health);
  }, [health]);

  const healthPercentage = (displayedHealth / maxHealth) * 100;
  const shieldPercentage = (shield / maxHealth) * 100;

  return (
    <div
      className="health-bar-container"
      style={{
        border: '1px solid black',
        width: '100%',
        height: '25px',
        background: '#ccc',
        borderRadius: '5px',
        position: 'relative',
      }}
    >
      <div
        className="health-bar"
        style={{
          width: `${healthPercentage}%`,
          height: '100%',
          background: healthColor || 'green',
          borderRadius: '5px 0 0 5px',
          position: 'relative',
        }}
      />
      <div
        className="shield-bar"
        style={{
          width: `${shieldPercentage}%`,
          height: '100%',
          background: 'rgba(0, 0, 255, 0.5)', // Semi-transparent blue for the shield
          borderRadius: '5px 0 0 5px',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1, // Ensure it overlays below health text but above the health bar
        }}
      ></div>
      <div
        className="health-text"
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontWeight: 'bold',
          color: healthPercentage < 25 ? 'red' : 'white', // Red text for critical health, white otherwise
        }}
      >
        {`${Math.round(displayedHealth)} / ${maxHealth}`}
      </div>
    </div>
  );
}

export default HealthBar;
