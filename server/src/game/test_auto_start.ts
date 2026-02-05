
import { GameManager } from './GameManager';

function assert(condition: boolean, msg: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${msg}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${msg}`);
    }
}

console.log('--- STARTING AUTO-START TEST ---');

const manager = new GameManager();
const roomId = 'auto-start-test';

// 1. Create Game
const game = manager.createGame(roomId);
assert(game.status === 'waiting', 'Game should be in waiting status');

// 2. Add 2 Players
manager.addPlayer(roomId, 'p1', 'Player 1');
manager.addPlayer(roomId, 'p2', 'Player 2');
assert(game.players.length === 2, 'Should have 2 players');
assert(game.players.every(p => !p.isReady), 'Players should not be ready initially');

// 3. P1 Sets Ready
console.log('P1 setting ready...');
manager.setPlayerReady(roomId, 'p1');
const p1 = game.players.find(p => p.id === 'p1')!;
const p2 = game.players.find(p => p.id === 'p2')!;

assert(p1.isReady === true, 'P1 should be ready');
assert(p2.isReady === false, 'P2 should not be ready');
assert(game.status === 'waiting', 'Game should still be waiting (only 1 ready)');

// 4. P2 Sets Ready -> Should Trigger Start
console.log('P2 setting ready...');
manager.setPlayerReady(roomId, 'p2');

assert(p2.isReady === false, 'P2 should be reset to not ready (Auto-Start logic executed)');
// startGame resets isReady to false!
// So if auto-start happened, isReady should be FALSE now.
// Let's check status first.

assert(game.status === 'preparing', `Game status should be 'preparing' (Actual: ${game.status})`);
assert(game.deck.length > 0, 'Deck should be initialized');
assert(p1.hand.length === 2, 'P1 should have cards');

// Check isReady reset
assert(p1.isReady === false, 'P1 isReady should be reset for Preparation phase');
assert(p2.isReady === false, 'P2 isReady should be reset for Preparation phase');


// 5. Swap Phase Ready
console.log('Simulating Swap Phase Ready...');
manager.setPlayerReady(roomId, 'p1');
assert(game.status === 'preparing', 'Game should still be preparing');

manager.setPlayerReady(roomId, 'p2');
assert(game.status === 'playing', `Game status should be 'playing' (Actual: ${game.status})`);

console.log('--- ALL TESTS PASSED ---');
