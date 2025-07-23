// Parent class for Character type
class Character {
  // constructor for the character
  constructor(name, hp, attackMultiplier, enemy) {
    this.name = name;
    this.hp = hp;
    this.attackMultiplier = attackMultiplier;
    this.enemy = enemy;
    this.dead = false;
  }

  getDamaged(dmg) {
    if (!this.dead) {
      this.hp -= dmg;
      if (this.hp <= 0) {
        console.log("THE CHARACTER DIED :(");
        this.dead = false;
      }
    }
  }
}

// Enum for types
const types = {
  WIZARD: "wizard",

  SLIME: "slime",
};

// Enum for powers
const elements = {
  FIRE: "fire",
  WATER: "water",
  SOIL: "soil",
  AIR: "air",
};

// The classes for the main characters
class Wizard extends Character {
  constructor(name, hp, attackMultiplier) {
    super(name, hp, attackMultiplier, false);
    console.log(`Creating a wizard ${name}: ${hp} hp`);
  }
}

// classes for the enemies
class Slime extends Character {
  constructor(name, element, hp, attackMultiplier) {
    super(name, types.SLIME, element, hp, attackMultiplier, true);
    console.log(`Creating a wizard ${name}: ${hp} hp`);
  }
}
