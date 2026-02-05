import { GameState, Player, Card, Suit, Rank } from './types';
import { getCardValue, isSpecialCard } from './utils';

export class GameManager {
    private games: Map<string, GameState> = new Map();

    createGame(roomId: string): GameState {
        const newGame: GameState = {
            id: roomId,
            players: [],
            deck: [],
            discardPile: [],
            currentPlayerIndex: 0,
            direction: 1,
            status: 'waiting',
            winner: null,
            message: 'Waiting for players...'
        };
        this.games.set(roomId, newGame);
        return newGame;
    }

    getGame(roomId: string): GameState | undefined {
        return this.games.get(roomId);
    }

    // Track Disconnect Timeouts: Map<roomId-playerName, Timer>
    private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

    addPlayer(roomId: string, playerId: string, name: string): boolean {
        const game = this.games.get(roomId);
        if (!game) return false;

        // Check if player already exists
        const existingPlayer = game.players.find(p => p.id === playerId);
        if (existingPlayer) {
            existingPlayer.connected = true; // Ensure marked connected
            return true;
        }

        // Check for Reconnection (Same Name, Disconnected)
        const rejoiningPlayer = game.players.find(p => p.name === name);
        if (rejoiningPlayer) {
            if (!rejoiningPlayer.connected) {
                // RECONNECT SUCCESS
                console.log(`[GameManager] Player ${name} reconnected to ${roomId}`);

                // Update ID to new socket
                rejoiningPlayer.id = playerId;
                rejoiningPlayer.connected = true;

                // Clear Timeout
                const timeoutKey = `${roomId}-${name}`;
                if (this.disconnectTimeouts.has(timeoutKey)) {
                    clearTimeout(this.disconnectTimeouts.get(timeoutKey));
                    this.disconnectTimeouts.delete(timeoutKey);
                }

                return true;
            } else {
                // Name taken and currently connected
                return false;
            }
        }

        if (game.status !== 'waiting') return false; // Cannot join if game started

        const newPlayer: Player = {
            id: playerId,
            name,
            hand: [],
            faceUpCards: [],
            faceDownCards: [],
            isReady: false,
            hasSwapped: false,
            connected: true
        };
        game.players.push(newPlayer);
        return true;
    }

    handleDisconnect(roomId: string, playerId: string): void {
        const game = this.games.get(roomId);
        if (!game) return;

        const player = game.players.find(p => p.id === playerId);
        if (!player || player.isBot) return;

        console.log(`[GameManager] Player ${player.name} disconnected from ${roomId}`);
        player.connected = false;

        // Start 10s Timer to convert to Bot
        const timeoutKey = `${roomId}-${player.name}`;
        // Clear existing if any (edge case)
        if (this.disconnectTimeouts.has(timeoutKey)) clearTimeout(this.disconnectTimeouts.get(timeoutKey));

        const timeout = setTimeout(() => {
            this.convertPlayerToBot(roomId, player.name);
        }, 10000); // 10 seconds

        this.disconnectTimeouts.set(timeoutKey, timeout);

        // Notify others handled by emit outside? Or status message?
        // game.message = `${player.name} disconnected. Waiting 10s...`;
    }

    convertPlayerToBot(roomId: string, playerName: string) {
        const game = this.games.get(roomId);
        if (!game) return;

        const player = game.players.find(p => p.name === playerName);
        if (!player || player.connected) return; // Reconnected in time

        console.log(`[GameManager] Converting ${playerName} to Bot`);

        player.isBot = true;
        player.connected = true; // Bot is "connected"
        player.name = `${player.name} (Bot)`;
        player.isReady = true;

        // Clear timeout ref
        this.disconnectTimeouts.delete(`${roomId}-${playerName}`);

        // If it's their turn, modify generic bot logic to handle "converted" bot?
        // Yes, if current turn is theirs, trigger move.
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id === player.id && game.status === 'playing') {
            this.processBotTurn(game, player.id);
        }

        // Trigger Update
        this.triggerUpdate(roomId);
    }

    // removePlayer remains mostly same

    initializeDeck(numDecks: number = 1): Card[] {
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck: Card[] = [];

        for (let d = 0; d < numDecks; d++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    deck.push({ suit, rank });
                }
            }

            // Add 4 Jokers per deck (Total 8 for 2 decks)
            for (let i = 0; i < 4; i++) {
                deck.push({ suit: 'joker', rank: 'joker' });
            }
        }

        return this.shuffleDeck(deck);
    }

    shuffleDeck(deck: Card[]): Card[] {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    setPlayerReady(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        // Allow ready in 'waiting' (Lobby) and 'preparing' (Swap Phase)
        if (!game || (game.status !== 'preparing' && game.status !== 'waiting')) return false;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return false;

        player.isReady = true;

        // Auto-start disabled. Waiting for Host command.
        // Exception: If in 'preparing' phase (post-deal), auto-transition to playing is OK?
        // User said: "owner room id dapat menjalankan game". implies lobby -> game.
        // What about Swap Phase -> Play Phase?
        // Usually, Swap Phase -> Play Phase is auto when everyone ready.
        // Let's keep Swap -> Play auto for flow smoothness, but Lobby -> Prep manual.

        // Auto-start Logic
        // 1. Swap Phase -> Playing Phase (Already handled below)
        // 2. Lobby -> Preparing Phase (User requested: Auto-start if with Bot)
        if (game.status === 'waiting') {
            const allReady = game.players.every(p => p.isReady);
            const hasBot = game.players.some(p => p.isBot);

            // If playing with Bot and everyone is ready, AUTO START.
            if (allReady && hasBot) {
                console.log(`[GameManager] Auto-starting bot game ${roomId}`);
                this.startGame(roomId, game.players[0].id); // Assume Host is player 0
            }
        }

        if (game.status === 'preparing') {
            // Force ensure bots are ready (safety net) - DO THIS FIRST
            game.players.forEach(p => {
                if (p.isBot && !p.isReady) {
                    p.isReady = true;
                    console.log(`[GameManager] Force-readied bot: ${p.name}`);
                }
            });

            const allReady = game.players.every(p => p.isReady);
            console.log(`[GameManager] Player ${player.name} ready in preparing phase.`);
            console.log(`[GameManager] Players ready status:`, game.players.map(p => ({ name: p.name, isReady: p.isReady, isBot: p.isBot })));
            console.log(`[GameManager] All Ready? ${allReady}`);

            if (allReady) {
                console.log(`[GameManager] Starting playing phase for room ${roomId}`);
                this.startPlayingPhase(game);
            } else {
                console.log(`[GameManager] NOT all ready yet. Waiting...`);
            }
        }

        // Trigger generic update for readiness change
        this.triggerUpdate(roomId);

        return true;
    }

    swapCards(roomId: string, playerId: string, handIndex: number, faceUpIndex: number): boolean {
        const game = this.games.get(roomId);
        if (!game || game.status !== 'preparing') return false;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return false;

        // Validate Indices
        if (handIndex < 0 || handIndex >= player.hand.length) return false;
        if (faceUpIndex < 0 || faceUpIndex >= player.faceUpCards.length) return false;

        // Perform Swap
        const handCard = player.hand[handIndex];
        const faceUpCard = player.faceUpCards[faceUpIndex];

        player.hand[handIndex] = faceUpCard;
        player.faceUpCards[faceUpIndex] = handCard;

        player.hasSwapped = true; // Mark as having interacted (optional)

        // Reset Ready status if they swap? Or just keep as is.
        // Usually swapping doesn't un-ready, but here 'ready' means 'done swapping'.
        // So if they are ready, they shouldn't be able to swap?
        // UI disables swap if ready. Server should strictly enforce?
        if (player.isReady) return false;

        return true;
    }

    startGame(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        if (!game || game.players.length < 2) return false;

        // Validate Host (First Player)
        if (game.players[0].id !== playerId) return false;

        // Validate All Ready
        if (!game.players.every(p => p.isReady)) return false;

        game.status = 'preparing';

        // Rule: If > 6 players, use 2 decks
        const numDecks = game.players.length > 6 ? 2 : 1;
        game.deck = this.initializeDeck(numDecks);

        game.discardPile = [];
        game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
        game.direction = 1;

        this.dealInitialCards(game);

        // Reset Ready Status for Preparation Phase (Swapping)
        game.players.forEach(p => p.isReady = false);

        // AUTO-READY BOTS
        game.players.forEach(p => {
            if (p.isBot) {
                p.isReady = true; // Bots skip prep
                console.log(`[GameManager] Auto-readied bot: ${p.name}`);
            }
        });

        game.message = "Preparation Phase: Swap your cards! Press Ready when done.";

        return true;
    }

    private dealInitialCards(game: GameState) {
        // Deal 2 Face Down, 2 Face Up, 2 Hand to each player
        // Total 6 cards per player

        for (const player of game.players) {
            // 2 Face Down
            for (let i = 0; i < 2; i++) {
                if (game.deck.length > 0) player.faceDownCards.push(game.deck.pop()!);
            }

            // 2 Face Up
            for (let i = 0; i < 2; i++) {
                if (game.deck.length > 0) player.faceUpCards.push(game.deck.pop()!);
            }

            // 2 Hand
            for (let i = 0; i < 2; i++) {
                if (game.deck.length > 0) player.hand.push(game.deck.pop()!);
            }
        }
    }

    private startPlayingPhase(game: GameState) {
        game.status = 'playing';
        game.message = `Game Started! ${game.players[game.currentPlayerIndex].name}'s turn.`;

        // Check if first player is a bot and trigger bot turn
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.isBot) {
            console.log(`[GameManager] First player is bot (${currentPlayer.name}), triggering bot turn...`);
            this.processBotTurn(game, currentPlayer.id);
        }
    }

    handleSocketDisconnect(socketId: string) {
        for (const game of this.games.values()) {
            const player = game.players.find(p => p.id === socketId);
            if (player) {
                this.handleDisconnect(game.id, socketId);
                // Trigger update to show "Disconnected" status in UI?
                // The handleDisconnect sets connected=false.
                // We should emit update so UI shows grayed out / status.
                this.triggerUpdate(game.id);
                break; // Assume 1 room per socket
            }
        }
    }

    playCard(roomId: string, playerId: string, cardIndices: number[], source: 'hand' | 'faceUp' | 'faceDown'): boolean {
        const game = this.games.get(roomId);
        if (!game || game.status !== 'playing') return false;

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id !== playerId) return false;

        let cardList: Card[];

        // Validate Source Priority
        if (source === 'hand') {
            cardList = currentPlayer.hand;
        } else if (source === 'faceUp') {
            if (currentPlayer.hand.length > 0) return false; // Must empty hand first
            cardList = currentPlayer.faceUpCards;
        } else if (source === 'faceDown') {
            if (currentPlayer.hand.length > 0 || currentPlayer.faceUpCards.length > 0) return false; // Must empty visible first
            cardList = currentPlayer.faceDownCards;
        } else {
            return false;
        }

        // Validate Indices
        if (cardIndices.some(idx => idx < 0 || idx >= cardList.length)) return false;
        if (cardIndices.length === 0) return false;

        // Get Cards (Peak)
        const cardsToPlay = cardIndices.map(idx => cardList[idx]);
        const firstCard = cardsToPlay[0];

        // 1. All cards must be same rank
        if (!cardsToPlay.every(c => c.rank === firstCard.rank)) return false;

        let isValid = false;
        let isBomb = false;
        const topCard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;

        // Bomb Logic: 4 cards of same rank
        if (cardsToPlay.length === 4) {
            isValid = true;
            isBomb = true;
        }
        // Normal Validation
        else if (!topCard) {
            isValid = true;
        }
        else if (isSpecialCard(firstCard.rank)) {
            isValid = true;
        }
        else {
            if (topCard.rank === '7') {
                if (getCardValue(firstCard.rank) < 7) isValid = true;
            } else {
                if (getCardValue(firstCard.rank) >= getCardValue(topCard.rank)) isValid = true;
            }
        }

        if (!isValid) return false;

        // --- END GAME PENALTY CHECK ---
        // Rule: Cannot play Special Card as LAST card. If done, play it but then pick up pile.
        // Condition: Source is Hand (implied by logic usually, but strictly: if playing last cards from hand and deck empty)
        // Wait, "Deck sudah habis".
        let triggerEndGamePenalty = false;
        const isPlayingLastCards = source === 'hand' && currentPlayer.hand.length === cardIndices.length;
        const isDeckEmpty = game.deck.length === 0;

        if (isPlayingLastCards && isDeckEmpty && isSpecialCard(firstCard.rank)) {
            // Exception: 2 Face Up and 2 Face Down are safe. But the rule says "Logic ... tidak berlaku untuk ... kartu terbuka/tertutup, selama kartu tidak berada di tangan".
            // So this ONLY applies to Hand.
            triggerEndGamePenalty = true;
        }

        // --- EXECUTE PLAY ---
        // Remove cards. Sort indices desc to remove from end first
        const sortedIndices = [...cardIndices].sort((a, b) => b - a);
        for (const idx of sortedIndices) {
            cardList.splice(idx, 1);
        }
        game.discardPile.push(...cardsToPlay);
        game.message = `${currentPlayer.name} played ${cardsToPlay.length}x ${firstCard.rank}`;

        // --- REFILL HAND ---
        // Rule: Must maintain min 2 cards if deck available
        if (source === 'hand' && game.deck.length > 0) {
            while (currentPlayer.hand.length < 2 && game.deck.length > 0) {
                const newCard = game.deck.pop();
                if (newCard) currentPlayer.hand.push(newCard);
            }
        }

        // --- SPECIAL EFFECTS ---
        let skipTurnAdvance = false;

        if (triggerEndGamePenalty) {
            this.takePile(roomId, playerId); // This advances turn inside
            game.message += ' (Final Special Penalty!)';
            return true;
        }

        if (isBomb) {
            game.discardPile = [];
            game.message += ' (BOMB!)';
            // Bomb usually burns.
        }
        else if (firstCard.rank === '2') {
            game.message += ' (Pile Reset)';
        }
        else if (firstCard.rank === '7') {
            game.message += ' (Next < 7)';
        }
        else if (firstCard.rank === '10') {
            game.discardPile = [];
            game.message += ' (Pile Burned)';
        }
        else if (firstCard.rank === 'joker' || firstCard.suit === 'joker') {
            game.direction *= -1;

            console.log(`[GameManager] Joker played! Players: ${game.players.length}, Direction: ${game.direction}`);

            // Special rule for 2-player games: Joker reverses direction, 
            // which means same player plays again
            if (game.players.length === 2) {
                console.log(`[GameManager] 2-player Joker! Setting skipTurnAdvance = true`);
                game.message += ' (Joker - Main Lagi!)';
                // In 2-player, reversing direction means the same player goes again
                // The player must beat the card BEFORE the joker (if any)
                // We don't advance turn, so skipTurnAdvance = true
                skipTurnAdvance = true;
            } else {
                game.message += ' (Reverse)';
            }
        }

        // Check Win Condition
        if (currentPlayer.hand.length === 0 &&
            currentPlayer.faceUpCards.length === 0 &&
            currentPlayer.faceDownCards.length === 0) {
            game.status = 'finished';
            game.winner = currentPlayer.id;
            game.message = `Winner: ${currentPlayer.name}!`;
            return true;
        }

        // Advance turn
        console.log(`[GameManager] skipTurnAdvance: ${skipTurnAdvance}`);
        if (!skipTurnAdvance) {
            console.log(`[GameManager] Advancing turn...`);
            this.advanceTurn(game);
        } else {
            console.log(`[GameManager] Skipping turn advance - same player continues`);

            // Auto-take pile if player has no valid moves (for HUMAN players)
            // Bots already handle this in processBotTurn
            if (!currentPlayer.isBot && game.discardPile.length > 0) {
                const hasValidMove = this.playerHasValidMove(game, currentPlayer);
                if (!hasValidMove) {
                    console.log(`[GameManager] Player ${currentPlayer.name} (Continuing Turn) has no valid moves, auto-taking pile...`);
                    setTimeout(() => {
                        this.takePile(game.id, currentPlayer.id);
                    }, 1000);
                }
            }

            // If same player continues and it's a bot, trigger bot turn
            if (currentPlayer.isBot) {
                console.log(`[GameManager] Same player is bot, triggering bot turn...`);
                this.processBotTurn(game, currentPlayer.id);
            }
        }

        // Trigger update for Bot moves (async side effects)
        // If human played, return true triggers sync.
        // If Bot played (via recursive/async), we need to ensure sync.
        // Since playCard is synchronous for Human, it returns true -> index emits.
        // For Bot, it calls playCard inside setTimeout. We need to trigger listener.
        if (currentPlayer.isBot) {
            this.triggerUpdate(roomId);
        }

        return true;
    }

    takePile(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        if (!game || game.status !== 'playing') return false;

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id !== playerId) return false;

        if (game.discardPile.length === 0) return false;

        currentPlayer.hand.push(...game.discardPile);
        game.discardPile = [];

        game.message = `${currentPlayer.name} took the pile`;

        console.log(`[GameManager] ${currentPlayer.name} took pile, advancing turn...`);
        this.advanceTurn(game);
        console.log(`[GameManager] Turn advanced to player ${game.players[game.currentPlayerIndex].name}`);

        return true;
    }

    // --- BOT LOGIC ---

    addBot(roomId: string): boolean {
        const game = this.games.get(roomId);
        if (!game) return false;

        const botId = `bot-${Date.now()}`;
        const newPlayer: Player = {
            id: botId,
            name: 'Computer (Bot)',
            hand: [],
            faceUpCards: [],
            faceDownCards: [],
            isReady: true, // Bots are always ready!
            hasSwapped: true, // Bots don't swap
            isBot: true
        };
        game.players.push(newPlayer);
        return true;
    }

    private advanceTurn(game: GameState) {
        // Advance turn
        let nextIndex = game.currentPlayerIndex + game.direction;
        if (nextIndex >= game.players.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = game.players.length - 1;
        game.currentPlayerIndex = nextIndex;

        // Check if next player is Bot
        const nextPlayer = game.players[nextIndex];
        console.log(`[advanceTurn] Turn advanced to ${nextPlayer.name} (isBot: ${nextPlayer.isBot})`);

        // Auto-take pile if player has no valid moves
        if (!nextPlayer.isBot && game.discardPile.length > 0) {
            const hasValidMove = this.playerHasValidMove(game, nextPlayer);
            if (!hasValidMove) {
                console.log(`[GameManager] Player ${nextPlayer.name} has no valid moves, auto-taking pile...`);
                setTimeout(() => {
                    this.takePile(game.id, nextPlayer.id);
                }, 1000); // Small delay for UX
                return; // Don't trigger bot turn yet
            }
        }

        if (nextPlayer.isBot) {
            console.log(`[advanceTurn] Calling processBotTurn for ${nextPlayer.name}...`);
            this.processBotTurn(game, nextPlayer.id);
        } else {
            console.log(`[advanceTurn] Next player is human, waiting for their move...`);
        }
    }

    // Helper: Check if player has any valid move
    private playerHasValidMove(game: GameState, player: any): boolean {
        const topCard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
        if (!topCard) return true; // Can always play if pile is empty

        // Check hand
        for (const card of player.hand) {
            if (this.isValidMove(card, topCard)) return true;
        }

        // Check face up (only if hand is empty)
        if (player.hand.length === 0) {
            for (const card of player.faceUpCards) {
                if (this.isValidMove(card, topCard)) return true;
            }
        }

        // Face down is always playable (blind)
        if (player.hand.length === 0 && player.faceUpCards.length === 0 && player.faceDownCards.length > 0) {
            return true;
        }

        return false;
    }

    private processBotTurn(game: GameState, botId: string) {
        // Delay to simulate thinking
        setTimeout(() => {
            const bot = game.players.find(p => p.id === botId);
            if (!bot) return;

            console.log(`[Bot] ${bot.name} is taking turn...`);

            // Bot Logic:
            // 1. Find all valid cards from current source (Hand -> FaceUp -> FaceDown)
            // 2. Randomly pick one valid card to play
            // 3. If no valid cards, take pile

            const topCard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
            console.log(`[Bot] Top card:`, topCard ? `${topCard.rank}${topCard.suit}` : 'null (empty pile)');

            let source: 'hand' | 'faceUp' | 'faceDown' = 'hand';
            let candidateIndices: number[] = [];

            // Determine Source
            if (bot.hand.length > 0) source = 'hand';
            else if (bot.faceUpCards.length > 0) source = 'faceUp';
            else source = 'faceDown';

            console.log(`[Bot] Source: ${source}, Cards in source: ${source === 'hand' ? bot.hand.length : source === 'faceUp' ? bot.faceUpCards.length : bot.faceDownCards.length}`);

            // Find valid moves
            const cardList = source === 'hand' ? bot.hand : (source === 'faceUp' ? bot.faceUpCards : bot.faceDownCards);

            if (source === 'faceDown') {
                // Blind play - pick random card
                if (cardList.length > 0) {
                    const randomIndex = Math.floor(Math.random() * cardList.length);
                    candidateIndices = [randomIndex];
                    console.log(`[Bot] Blind play - selected index ${randomIndex}`);
                }
            } else {
                // Find ALL valid cards
                const validIndices: number[] = [];
                const specialIndices: number[] = [];
                const normalIndices: number[] = [];

                for (let i = 0; i < cardList.length; i++) {
                    const card = cardList[i];
                    const isValid = this.isValidMove(card, topCard);
                    // console.log(`[Bot] Checking card ${i}: ${card.rank}${card.suit} - Valid: ${isValid}`);
                    if (isValid) {
                        validIndices.push(i);
                        if (isSpecialCard(card.rank)) {
                            specialIndices.push(i);
                        } else {
                            normalIndices.push(i);
                        }
                    }
                }

                // console.log(`[Bot] Valid indices: [${validIndices.join(', ')}]`);
                // console.log(`[Bot] Special indices: [${specialIndices.join(', ')}]`);

                // Prioritize Special Cards (User Request)
                if (specialIndices.length > 0) {
                    // Pick a random special card
                    const randomChoice = specialIndices[Math.floor(Math.random() * specialIndices.length)];
                    candidateIndices = [randomChoice];
                    console.log(`[Bot] Prioritizing Special Card at count ${candidateIndices.length}`);
                }
                else if (normalIndices.length > 0) {
                    // Pick a random normal card
                    const randomChoice = normalIndices[Math.floor(Math.random() * normalIndices.length)];
                    candidateIndices = [randomChoice];
                    console.log(`[Bot] Selecting Normal Card at count ${candidateIndices.length}`);
                }
            }

            if (candidateIndices.length > 0) {
                // Try Play
                console.log(`[Bot] Attempting to play card at index ${candidateIndices[0]} from ${source}`);
                const success = this.playCard(game.id, bot.id, candidateIndices, source);
                console.log(`[Bot] Play result: ${success ? 'SUCCESS' : 'FAILED'}`);

                // CRITICAL FIX: If play fails (for ANY reason), fallback to taking pile immediately
                // This prevents bot from freezing if logic says valid but playCard rejects it
                if (!success) {
                    console.log(`[Bot] Play failed despite valid check. Fallback: Taking Pile.`);
                    if (game.discardPile.length > 0) {
                        this.takePile(game.id, bot.id);
                    } else {
                        // Very rare edge case: Failed to play on empty pile? 
                        // Should not happen, but force advance to unstick?
                        // No, takePile needs pile. If empty, maybe just skip? 
                        // Actually, if pile is empty, almost any card is valid. 
                        // If it failed, it's a bug. But we can't take pile.
                        console.error(`[Bot] STUCK: Failed to play on empty pile?`);
                    }
                }
            } else {
                // No valid move -> Take Pile
                console.log(`[Bot] No valid cards found`);
                if (game.discardPile.length > 0) {
                    console.log(`[Bot] Taking pile (${game.discardPile.length} cards)`);
                    this.takePile(game.id, bot.id);
                } else {
                    console.log(`[Bot] No valid move and pile is empty for bot ${bot.name}`);
                }
            }
            // No valid move -> Take Pile
            console.log(`[Bot] No valid cards found`);
            if (game.discardPile.length > 0) {
                console.log(`[Bot] Taking pile (${game.discardPile.length} cards)`);
                this.takePile(game.id, bot.id);
            } else {
                // Edge case: pile is empty and no valid move
                // This shouldn't happen in normal game flow
                console.log(`[Bot] No valid move and pile is empty for bot ${bot.name}`);
            }
        }

            // After Action, trigger update via callback
            // GameManager is purely state. Server emits via onGameUpdate callback
            // Bot changes state asynchronously (setTimeout). 
            // PROBLEM: Manager cannot emit. We need a callback or Event Emitter.
            // Quick fix: Pass a callback or assume server polls? No polling.
            // Solution: Manager emits event? Or return promise?
            // Since this runs in async, we need a way to notify server index.ts.
            // For this quick prototype, I'll attach a callback/listener to GameManager.
        }, 1500);
}

    // Add Listener Support
    public onGameUpdate: ((roomId: string) => void) | null = null;

    private triggerUpdate(roomId: string) {
    if (this.onGameUpdate) this.onGameUpdate(roomId);
}

    // Helper validation (extracted)
    private isValidMove(card: Card, topCard: Card | null): boolean {
    if (!topCard) return true;

    // Check card 7 rule FIRST (before special cards)
    // When top card is 7, next player must play card < 7
    if (topCard.rank === '7') {
        return getCardValue(card.rank) < 7;
    }

    // Special cards (2, 10, Joker) can be played on anything (except after 7)
    if (isSpecialCard(card.rank)) return true;

    // Normal rule: play equal or higher
    return getCardValue(card.rank) >= getCardValue(topCard.rank);
}
}
