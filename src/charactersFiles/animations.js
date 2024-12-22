export const animations = {
    idle: {
        border: '2px solid transparent',
    },
    activeTurn: {
        border: '2px solid #000',
    },
    playerAttack: {
        x: [0, 350, 350, 0],
        border: '2px solid #000',
        transition: {
          duration: 0.3,
          type: 'tween',
          ease: 'easeInOut',
          times: [0, 0.5, 0.7, 1]
        },
      },
    enemyAttack: {
        x: [0, -350, -350, 0],
        border: '2px solid #000',
        transition: {
          duration: 0.3,
          type: 'tween',
          ease: 'easeInOut',
          times: [0, 0.5, 0.7, 1]
        },
      },
  };