export class Character {
    constructor(name, hp, attackMultiplier, isEnemy = false) {
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.attackMultiplier = attackMultiplier;
        this.isEnemy = isEnemy;
        this.statusEffects = [];
    }
    
    getDamaged(amount) {
        this.hp = Math.max(0, this.hp - amount);
        return this.hp;
    }
    
    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp;
    }
    
    addStatusEffect(effect) {
        this.statusEffects.push(effect);
    }
    
    removeStatusEffect(effectName) {
        this.statusEffects = this.statusEffects.filter(e => e.name !== effectName);
    }
}

export class PlayerCharacter extends Character {
    constructor(name, level, charClass) {
        const hp = 10 + level * 5;
        const attackMultiplier = 1 + level * 0.1;
        super(name, hp, attackMultiplier, false);
        
        this.level = level;
        this.charClass = charClass;
        this.inventory = [];
    }
    
    useItem(itemName) {
        const itemIndex = this.inventory.findIndex(i => i.name === itemName);
        if (itemIndex >= 0) {
            const item = this.inventory[itemIndex];
            // Apply item effects
            if (item.type === 'healing') {
                this.heal(item.value);
            }
            // Remove item after use
            this.inventory.splice(itemIndex, 1);
            return true;
        }
        return false;
    }
}

export class Wizard extends PlayerCharacter {
    constructor(name, level) {
        super(name, level, 'Wizard');
        this.spells = ['Magic Missile', 'Fireball', 'Shield'];
    }
}

export class Fighter extends PlayerCharacter {
    constructor(name, level) {
        super(name, level, 'Fighter');
        this.abilities = ['Power Attack', 'Second Wind', 'Combat Mastery'];
    }
}

// Enemy classes
export class Slime extends Character {
    constructor(name, hp, attackMultiplier) {
        super(name, hp, attackMultiplier, true);
        this.type = 'Slime';
        this.specialAbility = 'Acid Splash';
    }
}

export class Goblin extends Character {
    constructor(name, hp, attackMultiplier) {
        super(name, hp, attackMultiplier, true);
        this.type = 'Goblin';
        this.specialAbility = 'Sneak Attack';
    }
}