// Parent class for Character type
export class Character {
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

  attack(target, dmg) {
    target.getDamaged(dmg);
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
export class Wizard extends Character {
  constructor(name, hp, attackMultiplier) {
    super(name, hp, attackMultiplier, false);
    console.log(`Creating a wizard ${name}: ${hp} hp`);
  }
}

// classes for the enemies
export class Slime extends Character {
  constructor(name, hp, attackMultiplier) {
    super(name, hp, attackMultiplier, true);
    console.log(`Creating a wizard ${name}: ${hp} hp`);
  }
}
