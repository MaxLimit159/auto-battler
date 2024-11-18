import React, { useState, useEffect } from 'react';

function HealthBar({ health, maxHealth, healthColor }) {
  const [displayedHealth, setDisplayedHealth] = useState(health);

  // Immediately update displayedHealth when health changes
  useEffect(() => {
    setDisplayedHealth(health);
  }, [health]);

  const healthPercentage = (displayedHealth / maxHealth) * 100;

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
        className="health-text"
        style={{
          position: 'absolute',
          top: '3px',
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
