export const animations = {
    idle: {
        border: '2px solid transparent', // Start with transparent border
        transition: {
            duration: 0.2, // Slightly longer for better visual effect
            border: {
                type: 'tween',
                ease: 'easeInOut',
            },
        },
    },
    activeTurn: {
        border: '2px solid #000', // Solid border color for active turn
        transition: {
            duration: 0.2, // Same duration for consistency
            border: {
                type: 'tween',
                ease: 'easeInOut',
            },
        },
    },
  };