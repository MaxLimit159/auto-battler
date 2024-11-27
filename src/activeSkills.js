export const activeSkills = [
    {
      id: 'skillHeal',
      name: 'Heal',
      description: "Heals 10% of your character's max health.\n5 seconds cooldown.",
      cooldown: 6,
      // player, "Enemy", player.damage, enemy, playerPassives, enemyPassives, setEnemy, setEnemyHealthColor, setPlayer, setPlayerHealthColor, updateMoney, updateCharacterLevel, endGame, gameEnded;
      useSkill: function (doDamage, doHeal, inflictStatusEffects, ...args) {
        const healAmount = args[0].maxHealth * 0.1;
        const newArgs = [...args];
        newArgs.splice(2, 1, healAmount);
        doHeal(...newArgs);
        console.log(`${args[0].name} used Heal for ${healAmount} health!`);
      },
    },
    {
      id: 'skillFireball',
      name: 'Fireball',
      description: "Damages the enemy by your character's DMG.",
      cooldown: 6,
      useSkill: function (doDamage, doHeal, inflictStatusEffects, ...args) {
        doDamage(...args);
        console.log(`${args[0].name} used Fireball for ${args[2]} damage!`);
      },
    },
    {
      id: 'skillPoison',
      name: 'Poison',
      description: "Inflicts poison on the enemy.",
      cooldown: 10,
      useSkill: function (doDamage, doHeal, inflictStatusEffects, ...args) {
        inflictStatusEffects(args[6],"poison");
        console.log(`${args[0].name} used Poison on ${args[3].name}!`);
      },
    },
    {
      id: 'skillDamageUp',
      name: 'Damage Up',
      description: "Gives your character Damage Up.",
      cooldown: 10,
      useSkill: function (doDamage, doHeal, inflictStatusEffects, ...args) {
        inflictStatusEffects(args[8],"damageUp");
        console.log(`${args[0].name} used ${this.name}!`);
      },
    },
  ];
  