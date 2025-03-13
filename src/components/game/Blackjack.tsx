import React, { useState, useEffect } from 'react';
import './BlackjackStyles.css';

// Define card suits and values
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Define Card type
interface Card {
  suit: string;
  value: string;
  hidden?: boolean;
  id: string;
}

// Define Game State
type GamePhase = 'initial' | 'playerTurn' | 'dealerTurn' | 'gameOver';
type GameResult = 'player' | 'dealer' | 'push' | 'blackjack' | null;

const Blackjack: React.FC = () => {
  // Game state
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('initial');
  const [result, setResult] = useState<GameResult>(null);
  const [message, setMessage] = useState<string>('Welcome to Blackjack!');

  // Initialize a new deck
  const initializeDeck = () => {
    const newDeck: Card[] = [];
    // Create a standard 52-card deck
    for (const suit of SUITS) {
      for (const value of VALUES) {
        // Add a unique ID to each card
        newDeck.push({ 
          suit, 
          value, 
          id: `${value}-${suit}-${Math.random().toString(36).substring(2, 9)}` 
        });
      }
    }
    
    // Log the deck to verify its contents
    console.log("New deck created with", newDeck.length, "cards");
    
    return shuffle(newDeck);
  };

  // Shuffle the deck using Fisher-Yates algorithm
  const shuffle = (cards: Card[]): Card[] => {
    const newDeck = [...cards];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    
    // Verify shuffle
    console.log("Deck shuffled, first 5 cards:", newDeck.slice(0, 5));
    
    return newDeck;
  };

  // Draw a card from the deck
  const drawCard = (hidden = false, currentDeckState?: Card[]): { card: Card | null, newDeck: Card[] } => {
    // Use provided deck state or current state
    const currentDeck = currentDeckState || deck;
    
    if (currentDeck.length === 0) {
      console.error("Attempted to draw from empty deck");
      return { card: null, newDeck: currentDeck };
    }
    
    const card = currentDeck[0];
    const newDeck = currentDeck.slice(1);
    
    if (!currentDeckState) {
      // Only update React state if not using a local deck state
      setDeck(newDeck);
    }
    
    console.log(`Drew card: ${card.value} of ${card.suit}, ${newDeck.length} cards remaining`);
    
    return { 
      card: hidden ? { ...card, hidden } : card, 
      newDeck 
    };
  };

  // Calculate hand value
  const calculateHandValue = (hand: Card[]): number => {
    if (!hand || hand.length === 0) return 0;
    
    let value = 0;
    let aces = 0;
    
    console.log("Calculating hand value for:", hand.map(c => `${c.value}${c.suit}`).join(', '));

    hand.forEach(card => {
      if (card.hidden) return;
      
      if (card.value === 'A') {
        aces += 1;
        value += 11;
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10;
      } else {
        value += parseInt(card.value);
      }
    });

    // Adjust for aces if needed
    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }
    
    console.log("Final hand value:", value);
    return value;
  };

  // Start a new game
  const startNewGame = () => {
    const newDeck = initializeDeck();
    setDeck(newDeck);
    setPlayerHand([]);
    setDealerHand([]);
    setGamePhase('initial');
    setResult(null);
    setMessage('Starting new game...');
    
    // Deal initial cards
    setTimeout(() => {
      // We'll draw cards manually here instead of using drawCard to ensure correct initial setup
      const deck1 = [...newDeck];
      const player1 = deck1.shift()!;
      const dealer1 = { ...deck1.shift()!, hidden: true };
      const player2 = deck1.shift()!;
      const dealer2 = deck1.shift()!;
      
      // Verify all cards are unique
      const uniqueCheck = new Set([player1.id, dealer1.id, player2.id, dealer2.id]);
      if (uniqueCheck.size !== 4) {
        console.error("Duplicate cards detected in initial deal!");
      }
      
      setDeck(deck1);
      setPlayerHand([player1, player2]);
      setDealerHand([dealer1, dealer2]);
      setGamePhase('playerTurn');
      
      // Check for blackjack
      const playerValue = calculateHandValue([player1, player2]);
      if (playerValue === 21) {
        revealDealerCard();
        setGamePhase('gameOver');
        setResult('blackjack');
        setMessage('Blackjack! You win!');
      } else {
        setMessage('Your turn: Hit or Stand?');
      }
    }, 500);
  };

  // Player chooses to hit
  const handleHit = () => {
    const result = drawCard();
    if (!result.card) return;

    // Create a new hand with the new card
    const newHand = [...playerHand, result.card];
    
    // Calculate the value before updating state
    const handValue = calculateHandValue(newHand);
    console.log("Hit: new hand value:", handValue, "with cards:", newHand.map(c => `${c.value}${c.suit}`).join(', '));
    
    // Update player's hand first
    setPlayerHand(newHand);
    
    // Then handle game logic based on hand value
    if (handValue > 21) {
      // Player busts
      console.log("Player busts with:", handValue);
      revealDealerCard();
      setGamePhase('gameOver');
      setResult('dealer');
      setMessage(`Bust with ${handValue}! Dealer wins.`);
    } else if (handValue === 21) {
      // Player has 21, automatically stand
      console.log("Player has 21, standing");
      handleStand();
    } else {
      setMessage(`Your hand: ${handValue}. Hit or Stand?`);
    }
  };

  // Player chooses to stand
  const handleStand = () => {
    // Log the player's final hand value
    const playerFinalValue = calculateHandValue(playerHand);
    console.log("Player stands with:", playerFinalValue, "cards:", playerHand.map(c => `${c.value}${c.suit}`).join(', '));
    
    setGamePhase('dealerTurn');
    setMessage(`Standing with ${playerFinalValue}. Dealer's turn...`);
    revealDealerCard();
    
    // Pass the current player value to dealer play
    setTimeout(() => dealerPlay(), 700);
  };

  // Reveal dealer's hidden card
  const revealDealerCard = () => {
    const newDealerHand = dealerHand.map(card => ({
      ...card,
      hidden: false
    }));
    setDealerHand(newDealerHand);
    console.log("Revealed dealer's hand:", newDealerHand.map(c => `${c.value}${c.suit}`).join(', '));
  };

  // Dealer's turn logic
  const dealerPlay = () => {
    let currentDealerHand = [...dealerHand];
    let dealerValue = calculateHandValue(currentDealerHand);
    // Create a local copy of the deck to work with
    let currentDeck = [...deck];
    
    // Dealer must hit until 17 or higher
    const dealerPlay = async () => {
      console.log("Starting dealer's turn with hand value:", dealerValue);
      
      while (dealerValue < 17) {
        // Use the local deck copy for drawing cards
        const result = drawCard(false, currentDeck);
        const card = result.card;
        currentDeck = result.newDeck; // Update the local deck
        
        if (!card) break;
        
        currentDealerHand = [...currentDealerHand, card];
        
        // Make sure to log what cards the dealer is getting
        console.log("Dealer hits:", card.value + card.suit, "new hand:", currentDealerHand.map(c => `${c.value}${c.suit}`).join(', '));
        
        // Update the React state with the new dealer hand and deck
        setDealerHand(currentDealerHand);
        setDeck(currentDeck);
        
        dealerValue = calculateHandValue(currentDealerHand);
        console.log("Dealer new hand value:", dealerValue);
        
        // Add a short delay to show each card draw
        await new Promise(resolve => setTimeout(resolve, 700));
      }
      
      // Get the latest player hand value directly
      const currentPlayerValue = calculateHandValue(playerHand);
      determineWinner(currentPlayerValue, dealerValue);
    };
    
    dealerPlay();
  };

  // Determine the winner
  const determineWinner = (playerValue: number, dealerValue: number) => {
    setGamePhase('gameOver');
    
    console.log(`Final comparison - Player: ${playerValue} (${playerHand.map(c => `${c.value}${c.suit}`).join(', ')})`);
    console.log(`Final comparison - Dealer: ${dealerValue} (${dealerHand.map(c => `${c.value}${c.suit}`).join(', ')})`);
    
    if (dealerValue > 21) {
      setResult('player');
      setMessage(`Dealer busts with ${dealerValue}! You win with ${playerValue}!`);
    } else if (playerValue > dealerValue) {
      setResult('player');
      setMessage(`You win! ${playerValue} beats ${dealerValue}`);
    } else if (dealerValue > playerValue) {
      setResult('dealer');
      setMessage(`Dealer wins. ${dealerValue} beats ${playerValue}`);
    } else {
      setResult('push');
      setMessage(`Push! Both have ${playerValue}`);
    }
  };

  // Initialize game on component mount
  useEffect(() => {
    startNewGame();
  }, []);

  // Render a card component
  const renderCard = (card: Card) => {
    if (card.hidden) {
      return (
        <div key={card.id} className="card hidden-card">
          <div className="card-back"></div>
        </div>
      );
    }
    
    const color = card.suit === '♥' || card.suit === '♦' ? 'text-red-500' : 'text-white';
    
    return (
      <div key={card.id} className="card">
        <div className={`card-front flex flex-col justify-between h-full ${color}`}>
          <div className="text-left pl-1">{card.value}</div>
          <div className="text-center text-2xl">{card.suit}</div>
          <div className="text-right pr-1 rotate-180">{card.value}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="text-center mb-4">
        <h1 className="text-3xl mb-2">Blackjack</h1>
        <p className="text-lg">{message}</p>
      </div>
      
      {/* Game table */}
      <div className="bg-green-900 w-full max-w-3xl h-96 rounded-3xl p-6 border-4 border-green-950 relative">
        {/* Dealer section */}
        <div className="mb-8">
          <p className="text-sm mb-1">Dealer: {gamePhase !== 'initial' && gamePhase !== 'playerTurn' ? calculateHandValue(dealerHand) : '?'}</p>
          <div className="flex gap-2 flex-wrap">
            {dealerHand.map((card) => renderCard(card))}
          </div>
        </div>
        
        {/* Player section */}
        <div>
          <p className="text-sm mb-1">Player: {calculateHandValue(playerHand)}</p>
          <div className="flex gap-2 flex-wrap">
            {playerHand.map((card) => renderCard(card))}
          </div>
        </div>
        
        {/* Game result overlay */}
        {gamePhase === 'gameOver' && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-black bg-opacity-70 py-4 rounded-b-3xl">
            <div className="text-center">
              <h2 className="text-2xl mb-2">
                {result === 'blackjack' ? 'BLACKJACK!' : 
                 result === 'player' ? 'YOU WIN!' : 
                 result === 'dealer' ? 'DEALER WINS' : 'PUSH (TIE)'}
              </h2>
              <p className="text-lg mb-3">
                {`Player: ${calculateHandValue(playerHand)} - Dealer: ${calculateHandValue(dealerHand)}`}
              </p>
              <button
                onClick={startNewGame}
                className="px-4 py-2 bg-white text-green-900 font-bold rounded-md hover:bg-gray-200"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      {gamePhase === 'playerTurn' && (
        <div className="flex gap-4 mt-4">
          <button
            onClick={handleHit}
            className="px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-200"
          >
            Hit
          </button>
          <button
            onClick={handleStand}
            className="px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-200"
          >
            Stand
          </button>
        </div>
      )}
      
      {(gamePhase === 'initial' || gamePhase === 'dealerTurn') && (
        <div className="flex justify-center mt-4">
          <p className="text-gray-400">Game in progress...</p>
        </div>
      )}
    </div>
  );
};

export default Blackjack; 