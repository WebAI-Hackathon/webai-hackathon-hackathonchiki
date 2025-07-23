import { Wizard, Character, Slime } from "./character.js";

export class Game {
    players; // Main players of type Character[]
    enemies; // Enemies of type Character[]
    playerTurn;

    construct() {
    }

    start() {
        // Creating the enteties
        this.createCharacters(3);
        this.createEnemies(2);

        // Starting the main game loop
        this.playerTurn = true;
        this.mainGameLoop();
    }

    // Creating the numberOfCharacters times new Characters (Wizard)
    createCharacters(numberOfCharacters) {
        this.players = [];

        for (let i = 0; i < numberOfCharacters; i++) {
            const wizard = new Wizard("Wizard " + i, Math.random()*50, Math.random() + 2);
            this.players.push(wizard);
        }

        console.log("Players are chosen:");
        console.log(this.players);
    }

    // Creating the numberOfCharacter times new Enemies (Slime)
    createEnemies(numberOfCharacters) {
        this.enemies = [];

        for (let i = 0; i < numberOfCharacters; i++) {
            const slime = new Slime("Slime " + i, Math.random()*50, Math.random() + 2);
            this.enemies.push(slime);
        }

        console.log("Enemie are created:");
        console.log(this.enemies);
    }

    // As long as one player lives the game continues
    checkForLoss() {
        for (let player of this.players) { // at least one player alive
            if (player.hp > 0) return false;
        }

        return true;
    }

    // As long as one enemy lives the game continues
    checkForWin() {
        for (let enemy of this.enemies) { // at least one enemy still alive
            if (enemy.hp > 0) return false;
        }

        return true;
    }

    // Random player (or enemy) attacks random enemy (or player) and changes the turn
    makeRandomTurn() {
        let randomPlayer = this.players[Math.floor((Math.random()*10)%this.players.length)];
        let randomEnemy = this.enemies[Math.floor((Math.random()*10)%this.enemies.length)];
        let randomDmg = Math.random()*10;

        if (this.playerTurn) { // players take turn
            randomPlayer.attack(randomEnemy, randomDmg*randomPlayer.attackMultiplier);
            console.log(`${randomPlayer.name} attacked ${randomEnemy.name}: ${randomDmg} dmg`);
            console.log(`${randomEnemy.name} has ${randomEnemy.hp} hp left`);
        } else {
            randomEnemy.attack(randomPlayer, randomDmg*randomEnemy.attackMultiplier);
            console.log(`${randomEnemy.name} attacked ${randomPlayer.name}: ${randomDmg} dmg`);
            console.log(`${randomPlayer.name} has ${randomPlayer.hp} hp left`);
        }
        this.playerTurn = !this.playerTurn;
    }

    mainGameLoop() {
        let gameOver = false;
        while(!gameOver) {
            this.makeRandomTurn();

            // Checking for game end
            if (this.checkForLoss()) {
                gameOver = true;
                console.log("GAME OVER!!!");
                console.log("Sadly the enemies have killed the main characters and won :(");
                console.log(this.players);
                console.log(this.enemies);
            } else if(this.checkForWin()) {
                gameOver = true;
                console.log("GAME OVER!!!");
                console.log("THE MAIN CHARACTERS HAVE WON ^^");
                console.log(this.players);
                console.log(this.enemies);
            } else {
                gameOver = false;
            }
        }
    }
}