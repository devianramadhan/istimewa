
import { GameManager } from './GameManager';
import { Card } from './types';

// Helper to mock a game with N players
function createTestGame(numPlayers: number) {
    const manager = new GameManager();
    const roomId = 'test';
    manager.createGame(roomId);

    for (let i = 0; i < numPlayers; i++) {
        manager.addPlayer(roomId, `p${i}`, `Player ${i}`);
    }

    manager.startGame(roomId);

    for (let i = 0; i < numPlayers; i++) {
        manager.setPlayerReady(roomId, `p${i}`);
    }

    // Auto-start touches internal private methods or we use publicly available ones
    // startGame checks readiness? setPlayerReady triggers it if all ready.
    // So loop above should start it.

    return { manager, roomId };
}

function assert(condition: boolean, msg: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${msg}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${msg}`);
    }
}

console.log('--- STARTING TESTS ---');

// TEST 1: Deck Size
console.log('\n[Test 1] Deck Size for 7 Players');
const { manager: m1, roomId: r1 } = createTestGame(7);
const g1 = m1.getGame(r1)!;
// Initial Deck: 2 x (52 + 4) = 112 cards.
// Distributed: 7 players * 6 cards = 42 cards.
// Remaining: 112 - 42 = 70.
assert(g1.deck.length === 70, `Deck should have 70 cards remaining (Actual: ${g1.deck.length})`);


// TEST 2: Hand Refill Logic
console.log('\n[Test 2] Hand Refill');
const { manager: m2, roomId: r2 } = createTestGame(2);
const g2 = m2.getGame(r2)!;
const p1id = g2.players[0].id; // Current player should be random, let's force play or find current
const currentPlayer = g2.players[g2.currentPlayerIndex];
// Hand has 2 cards.
// Play 1 card. Should Refill to 2.
const cardIdx = 0;
m2.playCard(r2, currentPlayer.id, [cardIdx], 'hand');
assert(currentPlayer.hand.length === 2, `Hand should refill to 2 (Actual: ${currentPlayer.hand.length})`);


// TEST 3: Bomb Logic
console.log('\n[Test 3] Bomb Logic (4 Cards)');
// We need to rig the hand to have 4 same rank cards
const p2 = g2.players[(g2.currentPlayerIndex) % 2]; // Next player
// Give p2 4 Aces
p2.hand = [
    { suit: 'hearts' as const, rank: 'A' as const },
    { suit: 'diamonds' as const, rank: 'A' as const },
    { suit: 'clubs' as const, rank: 'A' as const },
    { suit: 'spades' as const, rank: 'A' as const }
];
// Force turn to p2?
g2.currentPlayerIndex = g2.players.indexOf(p2);
// Play 4 Aces
m2.playCard(r2, p2.id, [0, 1, 2, 3], 'hand'); // Indices
assert(g2.discardPile.length === 0, `Discard pile should be empty (Burned) (Actual: ${g2.discardPile.length})`);
assert(!!g2.message?.includes('BOMB'), 'Message should say BOMB');


// TEST 4: End Game Penalty
console.log('\n[Test 4] End Game Penalty (Last Card Special)');
// Setup: Empty Deck, Hand has '2' (Special).
g2.deck = [];
p2.hand = [{ suit: 'hearts' as const, rank: '2' as const }]; // Special
// Add some cards to pile to pick up
g2.discardPile = [{ suit: 'clubs' as const, rank: '5' as const }];
// Force turn to p2
g2.currentPlayerIndex = g2.players.indexOf(p2);
// Play the '2'
console.log('Before Play - Hand:', p2.hand.length, 'Pile:', g2.discardPile.length);
m2.playCard(r2, p2.id, [0], 'hand');
console.log('After Play - Hand:', p2.hand.length, 'Pile:', g2.discardPile.length);
console.log('Message:', g2.message);

// Expect: '2' played, then pile picked up.
// Hand Should be > 0 (contains pile + the 2). 
// Pile should be empty.
assert(p2.hand.length >= 2, `Hand should have cards (picked up pile) (Actual: ${p2.hand.length})`);
assert(g2.discardPile.length === 0, 'Discard pile should be empty (Taken)');
assert(!!g2.message?.includes('Penalty'), 'Message should mention Penalty');

console.log('\n--- ALL TESTS PASSED ---');
