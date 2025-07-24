import { Wizard, Slime } from './character.js';
import { rollDice } from './utils.js';

export class GameEngine {
    constructor(characters, theme) {
        this.players = characters;
        this.enemies = [];
        this.theme = theme;
        this.story = [];
        this.currentTurn = 'players';
    }
    
    initializeGame() {
        // Create enemies based on player levels
        const avgLevel = this.players.reduce((sum, char) => sum + parseInt(char.level), 0) / this.players.length;
        const enemyCount = Math.min(4, Math.max(2, Math.ceil(this.players.length * 1.5)));
        
        for (let i = 0; i < enemyCount; i++) {
            const enemyLevel = Math.max(1, Math.round(avgLevel * (0.8 + Math.random() * 0.4)));
            this.enemies.push(new Slime(
                `Enemy ${i+1}`,
                8 + enemyLevel * 4,
                1 + enemyLevel * 0.2
            ));
        }
        
        // Generate initial story
        return this.generateStorySegment('start');
    }
    
    async generateStorySegment(type, diceResult = null) {
        let prompt;
        
        if (type === 'start') {
            prompt = `Begin a D&D adventure with the theme "${this.theme}". 
                The party consists of: ${this.players.map(p => `${p.name} (${p.type} level ${p.level})`).join(', ')}.
                They are about to face: ${this.enemies.map(e => `${e.name}`).join(', ')}.
                Create an engaging opening scene that sets up the adventure.`;
        } else if (type === 'progress') {
            prompt = `Continue the D&D adventure with theme "${this.theme}".
                Previous events: ${this.story.slice(-3).join(' ')}
                The party consists of: ${this.players.map(p => `${p.name} (${p.type} level ${p.level})`).join(', ')}.
                Current situation: ${this.getCurrentSituation()}
                The players just rolled a ${diceResult} on a D20. 
                Describe what happens next and set up the next challenge.`;
        } else if (type === 'conclusion') {
            prompt = `Conclude the D&D adventure with theme "${this.theme}".
                The party consists of: ${this.players.map(p => `${p.name} (${p.type} level ${p.level})`).join(', ')}.
                Previous events: ${this.story.slice(-3).join(' ')}
                Current situation: ${this.getCurrentSituation()}
                Write a satisfying conclusion to the adventure.`;
        }
        
        try {
            const response = await makeAPIRequest('chat', {
                model: "hackathon/qwen3",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            });
            
            const segment = response.choices?.[0]?.message?.content;
            this.story.push(segment);
            return segment;
        } catch (error) {
            console.error('Error generating story segment:', error);
            return "The story continues...";
        }
    }
    
    getCurrentSituation() {
        const alivePlayers = this.players.filter(p => p.hp > 0).length;
        const aliveEnemies = this.enemies.filter(e => e.hp > 0).length;
        
        return `Party status: ${alivePlayers}/${this.players.length} players alive. 
            Enemies remaining: ${aliveEnemies}/${this.enemies.length}.`;
    }
    
    processTurn(diceResult) {
        // Determine which side acts
        const actors = this.currentTurn === 'players' ? this.players : this.enemies;
        const targets = this.currentTurn === 'players' ? this.enemies : this.players;
        
        // Filter to alive characters only
        const aliveActors = actors.filter(a => a.hp > 0);
        const aliveTargets = targets.filter(t => t.hp > 0);
        
        if (aliveActors.length === 0 || aliveTargets.length === 0) {
            return this.checkGameEnd();
        }
        
        // Simple combat logic - each alive actor attacks a random target
        aliveActors.forEach(actor => {
            const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            const damage = Math.max(1, diceResult * actor.attackMultiplier * 0.2);
            target.getDamaged(damage);
        });
        
        // Switch turn
        this.currentTurn = this.currentTurn === 'players' ? 'enemies' : 'players';
        
        return this.checkGameEnd();
    }
    
    checkGameEnd() {
        const alivePlayers = this.players.filter(p => p.hp > 0).length;
        const aliveEnemies = this.enemies.filter(e => e.hp > 0).length;
        
        if (alivePlayers === 0) return 'defeat';
        if (aliveEnemies === 0) return 'victory';
        return 'continue';
    }
}