export const characterList = {
    dummy: {
      id: 'dummy',
      name: "Dummy",
      health: 200,
      maxHealth: 200,
      damage: 0,
      speed: 0,
      experience: 0,
      level: 1,
      image: '/CharacterImage/dummy.png',
      skills: ['basicAttack'],
      passives: [],
      status_effects: [],
      playable: false,
      money_drop: 0,
      experience_drop: 0,
    },
    knight: { 
        id: 'knight', 
        name: "Knight", 
        health: 80,
        maxHealth: 80,
        damage: 15, 
        speed: 8, 
        experience: 0,
        level: 1,
        image: '/CharacterImage/knight.png',
        skills: ['basicAttack'],
        passives: ['Bulwark'],
        status_effects: [],
        playable: true,
        money_drop: 50,
        experience_drop: 50,
      },
      archer: { 
        id: 'archer', 
        name: "Archer", 
        health: 70,
        maxHealth: 70,
        damage: 15, 
        speed: 10, 
        experience: 0,
        level: 1,
        image: '/CharacterImage/archer.png',
        skills: ['basicAttack'],
        passives: ['Poison Tip'],
        status_effects: [],
        playable: true,
        money_drop: 20,
        experience_drop: 50,
      },
      mage: { 
        id: 'mage', 
        name: "Mage", 
        health: 60,
        maxHealth: 60,
        damage: 25, 
        speed: 12, 
        experience: 0,
        level: 1,
        image: '/CharacterImage/mage.png',
        skills: ['basicAttack'],
        passives: ['Arcane Infused'],
        status_effects: [],
        playable: true,
        money_drop: 40,
        experience_drop: 40,
      },
      rogue: { 
        id: 'rogue', 
        name: "Rogue", 
        health: 70,
        maxHealth: 70,
        damage: 10, 
        speed: 15, 
        experience: 0,
        level: 1,
        image: '/CharacterImage/rogue.png',
        skills: ['doubleAttack'],
        passives: ['Dual Wield'],
        status_effects: [],
        playable: true,
        money_drop: 30,
        experience_drop: 40,
      },
      vampire: {
        id: 'vampire',
        name: "Vampire",
        health: 50,
        maxHealth: 50,
        damage: 20,
        speed: 16,
        experience: 0,
        level: 1,
        image: '/CharacterImage/vampire.png',
        skills: ['basicAttack'],
        passives: ['Life Steal'],
        status_effects: [],
        playable: true,
        money_drop: 45,
        experience_drop: 60,
      },
      zombie: {
        id: 'zombie',
        name: "Zombie",
        health: 50,
        maxHealth: 50,
        damage: 10,
        speed: 5,
        experience: 0,
        level: 1,
        image: '/CharacterImage/zombie.png',
        skills: ['basicAttack'],
        passives: [],
        status_effects: [],
        playable: false,
        money_drop: 30,
        experience_drop: 40,
      },
      ghost: {
        id: 'ghost',
        name: "Ghost",
        health: 60,
        maxHealth: 60,
        damage: 15,
        speed: 10,
        experience: 0,
        level: 1,
        image: '/CharacterImage/ghost.png',
        skills: ['basicAttack'],
        passives: [],
        status_effects: [],
        playable: false,
        money_drop: 40,
        experience_drop: 50,
      },
      necromancer: {
        id: 'necromancer',
        name: "Necromancer",
        health: 200,
        maxHealth: 200,
        damage: 10,
        speed: 10,
        experience: 0,
        level: 1,
        image: '/CharacterImage/necromancer.png',
        skills: ['basicAttack'],
        passives: ['Soul Absorbion'],
        status_effects: [],
        playable: false,
        money_drop: 120,
        experience_drop: 120,
      },
  };