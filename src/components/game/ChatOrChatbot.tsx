import React, { useState, useEffect, useRef, createContext, useCallback } from 'react';
import { useTwitchAuth } from '../../hooks/use-twitch-auth';
import FilteredChat from '../../components/FilteredChat';

// Context for sharing hidden messages between components
export const HiddenMessagesContext = createContext<{
  hiddenMessages: string[];
  addHiddenMessage: (message: string) => void;
  removeHiddenMessage: (message: string) => void;
}>({
  hiddenMessages: [],
  addHiddenMessage: () => {},
  removeHiddenMessage: () => {}
});

// Provider component for the hidden messages
export const HiddenMessagesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [hiddenMessages, setHiddenMessages] = useState<string[]>([]);
  
  // Add a new message to the hidden pool
  const addHiddenMessage = (message: string) => {
    setHiddenMessages(prev => [...prev, message]);
    console.log(`Message hidden from chat for game use: "${message}"`);
  };
  
  // Mark a message as used (remove from available pool)
  const removeHiddenMessage = (message: string) => {
    setHiddenMessages(prev => prev.filter(msg => msg !== message));
  };
  
  return (
    <HiddenMessagesContext.Provider value={{ 
      hiddenMessages, 
      addHiddenMessage, 
      removeHiddenMessage 
    }}>
      {children}
    </HiddenMessagesContext.Provider>
  );
};

// AI-generated messages with usage tracking
interface AIMessage {
  id: string;
  text: string;
  usedCount: number;
}

// Game round data
interface GameRound {
  message: string;
  isAI: boolean;
  answered: boolean;
  correct: boolean | null;
}

// IMPORTANT: Create a complete copy of the current question to ensure it's isolated
// from state updates and absolutely cannot change during a round
let CURRENT_QUESTION: {
  message: string;
  isAI: boolean;
  roundId: string;
  lockedAt: number; // Timestamp when this question was locked
  isLocked: boolean; // Whether this question is currently locked
} | null = null;

const AI_MESSAGES: AIMessage[] = [
  { id: 'ai1', text: "Have you tried turning it off and on again?", usedCount: 0 },
  { id: 'ai2', text: "I can't believe they're adding another battle royale game to the market", usedCount: 0 },
  { id: 'ai3', text: "This stream is so entertaining, I've been watching for hours!", usedCount: 0 },
  { id: 'ai4', text: "The new patch completely ruined my favorite character", usedCount: 0 },
  { id: 'ai5', text: "Does anyone know when the next big gaming event is?", usedCount: 0 },
  { id: 'ai6', text: "I think the streamer needs to adjust their audio settings", usedCount: 0 },
  { id: 'ai7', text: "That was an amazing play! How did you manage to pull that off?", usedCount: 0 },
  { id: 'ai8', text: "I've been a subscriber for three months now and I love the content!", usedCount: 0 },
  { id: 'ai9', text: "This game has the best graphics I've seen all year", usedCount: 0 },
  { id: 'ai10', text: "Can we see your gaming setup? I'm curious what peripherals you use", usedCount: 0 },
  { id: 'ai11', text: "I tried that strategy yesterday and it completely failed for me", usedCount: 0 },
  { id: 'ai12', text: "The loading times in this game are ridiculous", usedCount: 0 },
  { id: 'ai13', text: "What's your opinion on the controversial change in the latest update?", usedCount: 0 },
  { id: 'ai14', text: "I just got here, what did I miss?", usedCount: 0 },
  { id: 'ai15', text: "My internet keeps dropping today, so frustrating", usedCount: 0 },
  { id: 'ai16', text: "Do you have any recommendations for a good gaming chair?", usedCount: 0 },
  { id: 'ai17', text: "That was so unlucky! You should have won that match", usedCount: 0 },
  { id: 'ai18', text: "I can't understand why people are hating on this game, it's fantastic", usedCount: 0 },
  { id: 'ai19', text: "What's your favorite game of all time?", usedCount: 0 },
  { id: 'ai20', text: "The developers need to fix the servers ASAP", usedCount: 0 }
];

// Function to explicitly lock the current question to prevent any changes
const lockCurrentQuestion = (instanceId: string) => {
  if (CURRENT_QUESTION) {
    CURRENT_QUESTION.isLocked = true;
    CURRENT_QUESTION.lockedAt = Date.now();
    console.log(`[${instanceId}] LOCKED question: "${CURRENT_QUESTION.message}" at ${new Date(CURRENT_QUESTION.lockedAt).toISOString()}`);
  }
};

// Function to check if we can modify the current question
const canModifyQuestion = (instanceId: string) => {
  if (!CURRENT_QUESTION) return true;
  
  // If question is locked, check how long it's been locked
  if (CURRENT_QUESTION.isLocked) {
    const lockDuration = Date.now() - CURRENT_QUESTION.lockedAt;
    
    // Only allow modifications after 30 seconds of locking (our max round time)
    // This is a safety mechanism to prevent permanent locking
    if (lockDuration < 30000) {
      console.log(`[${instanceId}] Cannot modify question - locked for ${lockDuration}ms`);
      return false;
    } else {
      console.log(`[${instanceId}] Lock expired after ${lockDuration}ms - allowing modification`);
      return true;
    }
  }
  
  return !CURRENT_QUESTION.isLocked;
};

const ChatOrChatbot: React.FC = () => {
  const { isAuthenticated } = useTwitchAuth();
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'result'>('waiting');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(AI_MESSAGES);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameInstanceId = useRef(Math.random().toString(36).substring(2, 9));
  
  // Track which messages were used in the game to avoid duplicates
  const [usedGameMessages, setUsedGameMessages] = useState<Set<string>>(new Set());
  
  // Create state for hidden messages within the component
  const [hiddenMessages, setHiddenMessages] = useState<string[]>([]);
  
  // Maximum number of hidden messages to store
  const MAX_HIDDEN_MESSAGES = 25;
  
  // Track current question to ensure it doesn't change during a round
  const currentMessageRef = useRef<string | null>(null);
  
  // Add a new message to the hidden pool
  const addHiddenMessage = useCallback((message: string) => {
    // Don't add if it's already been used in a game
    if (usedGameMessages.has(message)) {
      console.log(`[${gameInstanceId.current}] Not hiding already used message: "${message}"`);
      return false;
    }
    
    // Don't add more messages if we've reached the cap and we're not in waiting mode
    if (hiddenMessages.length >= MAX_HIDDEN_MESSAGES && gameStatus !== 'waiting') {
      console.log(`[${gameInstanceId.current}] Hit hidden message cap (${MAX_HIDDEN_MESSAGES}), not storing: "${message}"`);
      return false;
    }
    
    setHiddenMessages(prev => {
      // Double check we haven't hit the cap
      if (prev.length >= MAX_HIDDEN_MESSAGES) {
        return prev;
      }
      
      const newMessages = [...prev, message];
      console.log(`[${gameInstanceId.current}] Updated hidden messages:`, newMessages);
      return newMessages;
    });
    console.log(`[${gameInstanceId.current}] Message hidden from chat for game use: "${message}"`);
    return true;
  }, [usedGameMessages, gameStatus, hiddenMessages.length, gameInstanceId]);
  
  // Mark a message as used in the game
  const markMessageAsUsed = useCallback((message: string) => {
    setUsedGameMessages(prev => {
      const newSet = new Set(prev);
      newSet.add(message);
      return newSet;
    });
  }, []);
  
  // Mark a message as used (remove from available pool)
  const removeHiddenMessage = useCallback((message: string) => {
    setHiddenMessages(prev => prev.filter(msg => msg !== message));
    // Also mark it as used so we don't re-add it
    markMessageAsUsed(message);
  }, [markMessageAsUsed]);

  // Function to select a real chat message to use for the game
  const selectRealMessage = () => {
    // Use hidden messages that were intercepted and never shown
    if (hiddenMessages.length === 0) {
      console.log(`[${gameInstanceId.current}] No hidden messages available`);
      return null;
    }

    // Randomly select a message
    const randomIndex = Math.floor(Math.random() * hiddenMessages.length);
    const selectedMessage = hiddenMessages[randomIndex];
    
    // Mark it as used
    removeHiddenMessage(selectedMessage);
    
    console.log(`[${gameInstanceId.current}] Selected hidden message: "${selectedMessage}"`);
    return selectedMessage;
  };

  // Function to select an AI message based on usage count
  const selectAIMessage = () => {
    // Sort by usage count (least used first)
    const sortedMessages = [...aiMessages].sort((a, b) => a.usedCount - b.usedCount);
    
    // Take the first few messages (least used ones) as candidates
    const candidates = sortedMessages.slice(0, Math.max(3, Math.floor(sortedMessages.length / 4)));
    
    // Randomly select from candidates
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];
    
    // Update usage count
    setAiMessages(prev => prev.map(msg => 
      msg.id === selected.id ? { ...msg, usedCount: msg.usedCount + 1 } : msg
    ));
    
    return selected.text;
  };

  // Function to start a new round
  const startNewRound = () => {
    // Prevent multiple simultaneous calls to startNewRound
    if (gameStatus === 'playing') {
      console.log(`[${gameInstanceId.current}] Ignoring startNewRound call - round already in progress`);
      return;
    }
    
    // Check if we can modify the current question (locking mechanism)
    if (!canModifyQuestion(gameInstanceId.current)) {
      console.log(`[${gameInstanceId.current}] Cannot start new round - current question is locked`);
      return;
    }
    
    console.log(`[${gameInstanceId.current}] Starting new round. Available hidden messages: ${hiddenMessages.length}`);
    
    if (hiddenMessages.length > 0) {
      console.log(`[${gameInstanceId.current}] Hidden message pool:`, hiddenMessages);
    }
    
    // Always 50/50 chance regardless of how many hidden messages we have
    let isAI = Math.random() < 0.5;
    console.log(`[${gameInstanceId.current}] Random selection chose ${isAI ? 'AI' : 'human'} message`);
    
    let message: string | null;
    
    // If we chose human but have no hidden messages, fall back to AI
    if (!isAI && hiddenMessages.length === 0) {
      console.log(`[${gameInstanceId.current}] Wanted human message but none available, falling back to AI`);
      isAI = true;
    }
    
    if (isAI) {
      message = selectAIMessage();
      console.log(`[${gameInstanceId.current}] Selected AI message: "${message}"`);
    } else {
      // We know we have hidden messages at this point
      message = selectRealMessage();
      
      // Double-check we got a message (defensive programming)
      if (!message) {
        console.log(`[${gameInstanceId.current}] Failed to get real message, falling back to AI`);
        message = selectAIMessage();
        isAI = true;
      } else {
        console.log(`[${gameInstanceId.current}] Using real message: "${message}"`);
      }
    }
    
    // Update game status first to indicate we're transitioning to playing
    setGameStatus('playing');
    
    // Store the current message in our immutable reference
    CURRENT_QUESTION = {
      message: message!,
      isAI, 
      roundId: Math.random().toString(36).substring(2, 9), // Unique ID for this round
      isLocked: false,
      lockedAt: 0
    };
    
    // Immediately lock the question to prevent changes
    lockCurrentQuestion(gameInstanceId.current);
    
    // Also store in the ref for backwards compatibility
    currentMessageRef.current = message;
    
    // Mark this message as used
    if (message) {
      markMessageAsUsed(message);
    }
    
    // Set the component state
    setCurrentRound({
      message: message!,
      isAI,
      answered: false,
      correct: null
    });
    
    // Auto-select after 30 seconds
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      if (currentRound && !currentRound.answered) {
        console.log(`[${gameInstanceId.current}] Time's up! Making random guess`);
        handleAnswer(Math.random() < 0.5); // Random guess
      }
    }, 30000);
  };

  // Function to handle player's answer
  const handleAnswer = (guessIsAI: boolean) => {
    // We need to have a current round and question
    if (!currentRound || currentRound.answered || !CURRENT_QUESTION) return;
    
    // Always use the immutable question, not the state
    const isCorrect = guessIsAI === CURRENT_QUESTION.isAI;
    console.log(`[${gameInstanceId.current}] Player guessed ${guessIsAI ? 'AI' : 'Human'}, actual: ${CURRENT_QUESTION.isAI ? 'AI' : 'Human'}`);
    
    // Update score
    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
    
    // Update current round
    setCurrentRound(prev => prev ? {
      ...prev,
      message: CURRENT_QUESTION!.message, // Always use immutable question
      isAI: CURRENT_QUESTION!.isAI,       // Always use immutable question
      answered: true,
      correct: isCorrect
    } : null);
    
    setGameStatus('result');
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Clear the references
    currentMessageRef.current = null;
    
    // Set timer for next round
    timerRef.current = setTimeout(() => {
      // Explicitly unlock the question
      if (CURRENT_QUESTION) {
        CURRENT_QUESTION.isLocked = false;
        console.log(`[${gameInstanceId.current}] Unlocking question before setting to null`);
      }
      
      CURRENT_QUESTION = null; // Reset immutable question for next round
      startNewRound();
    }, 5000);
  };

  // Decide whether to show or hide an incoming chat message
  const processNewChatMessage = (message: string) => {
    console.log(`[${gameInstanceId.current}] Processing new chat message: "${message}"`);
    
    // Skip empty messages, but allow shorter ones
    if (!message || message.trim() === '') {
      console.log(`[${gameInstanceId.current}] Skipping empty message`);
      return false;
    }
    
    // Skip messages we've already used in the game
    if (usedGameMessages.has(message)) {
      console.log(`[${gameInstanceId.current}] Message was already used in a game: "${message}"`);
      return false; // Let it show in chat since it's already been used
    }
    
    // Check if we already have this exact message in our hidden pool
    // to avoid any possibility of duplication
    if (hiddenMessages.includes(message)) {
      console.log(`[${gameInstanceId.current}] Message already in hidden pool: "${message}"`);
      return true; // Hide it since we already have it 
    }
    
    // Check if we have already hit our maximum hidden messages capacity
    if (hiddenMessages.length >= MAX_HIDDEN_MESSAGES && gameStatus !== 'waiting') {
      console.log(`[${gameInstanceId.current}] At max hidden capacity, showing message in chat: "${message}"`);
      return false; // Don't hide, we have enough hidden messages
    }
    
    // If the message is the current question (using our immutable reference), don't display it
    if (CURRENT_QUESTION && CURRENT_QUESTION.message === message) {
      console.log(`[${gameInstanceId.current}] Message is current game question, hiding: "${message}"`);
      return true; // Always hide the current question
    }
    
    // Always intercept messages matching our AI patterns to avoid confusion
    const isAIPattern = AI_MESSAGES.some(aiMsg => 
      message.toLowerCase().includes(aiMsg.text.toLowerCase())
    );
    
    if (isAIPattern) {
      console.log(`[${gameInstanceId.current}] Intercepting message that matches AI pattern: "${message}"`);
      return true; // Hide it but don't use for game (to avoid confusion)
    }
    
    // Only start accumulating messages if we aren't in a locked state
    // This prevents new messages from interfering with the current round
    if (CURRENT_QUESTION && CURRENT_QUESTION.isLocked && gameStatus === 'playing') {
      console.log(`[${gameInstanceId.current}] Not intercepting message during locked round: "${message}"`);
      return false; // Let it through during a locked round
    }
    
    // 50% chance of intercepting any chat message (if we haven't hit the cap)
    if (hiddenMessages.length < MAX_HIDDEN_MESSAGES) {
      const shouldHide = Math.random() < 0.5;
      
      if (shouldHide) {
        // Add to hidden pool - this function handles the cap check
        const wasAdded = addHiddenMessage(message);
        
        // If we're waiting for messages, start a round
        // BUT only if we're not in the middle of another round
        if (wasAdded && gameStatus === 'waiting' && !currentRound && !CURRENT_QUESTION) {
          console.log(`[${gameInstanceId.current}] Starting first round after intercepting message`);
          // Use a small timeout to ensure everything is properly initialized
          setTimeout(() => {
            // Double-check we haven't started another round in the meantime
            if (gameStatus === 'waiting' && !CURRENT_QUESTION) {
              startNewRound();
            } else {
              console.log(`[${gameInstanceId.current}] Not starting round - state changed since message intercepted`);
            }
          }, 500);
        }
        
        if (wasAdded) {
          console.log(`[${gameInstanceId.current}] Successfully intercepted message for game: "${message}" (Total hidden: ${hiddenMessages.length + 1})`);
          // Return true to indicate message should be filtered (not shown)
          return true;
        }
      }
    }
    
    console.log(`[${gameInstanceId.current}] Allowing message to display in chat: "${message}"`);
    // Return false to indicate message should be shown normally
    return false;
  };

  // Start the game when component mounts
  useEffect(() => {
    console.log(`[${gameInstanceId.current}] Game component mounted`);
    
    // Add a recurring check to ensure question stability
    const stabilityCheckInterval = setInterval(() => {
      // Skip if we're not in an active round
      if (gameStatus !== 'playing' || !currentRound || !CURRENT_QUESTION) return;
      
      // Log the current state to help with debugging
      console.log(`[${gameInstanceId.current}] Stability check - Current question: "${CURRENT_QUESTION.message}"`);
      console.log(`[${gameInstanceId.current}] Current round state:`, JSON.stringify(currentRound));
      
      // Ensure the question is locked during gameplay
      if (!CURRENT_QUESTION.isLocked) {
        console.warn(`[${gameInstanceId.current}] CRITICAL: Question is not locked during gameplay!`);
        lockCurrentQuestion(gameInstanceId.current);
      }
      
      // Check for state drift and fix if necessary
      if (currentRound.message !== CURRENT_QUESTION.message || 
          currentRound.isAI !== CURRENT_QUESTION.isAI) {
        console.error(`[${gameInstanceId.current}] CRITICAL: Question state drift detected!`);
        console.error(`Component state: "${currentRound.message}", Immutable: "${CURRENT_QUESTION.message}"`);
        
        // Fix the state
        setCurrentRound({
          message: CURRENT_QUESTION.message,
          isAI: CURRENT_QUESTION.isAI,
          answered: currentRound.answered,
          correct: currentRound.correct
        });
      }
    }, 5000); // Check every 5 seconds
    
    // Force a refresh of the game state after 2 seconds
    // This helps ensure the component is fully initialized
    const initTimer = setTimeout(() => {
      console.log(`[${gameInstanceId.current}] Checking game state on initial load...`);
      console.log(`[${gameInstanceId.current}] Hidden messages:`, hiddenMessages);
      
      // If we already have messages, start a round immediately
      if (hiddenMessages.length > 0) {
        console.log(`[${gameInstanceId.current}] Found existing hidden messages, starting first round`);
        startNewRound();
      } else {
        console.log(`[${gameInstanceId.current}] No hidden messages yet, waiting for chat activity`);
        setGameStatus('waiting');
      }
    }, 2000);
    
    return () => {
      console.log(`[${gameInstanceId.current}] Game component unmounting`);
      clearTimeout(initTimer);
      clearInterval(stabilityCheckInterval);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // This effect ensures that our immutable question always stays in sync
  // with the component state, even if something tries to modify the state directly
  useEffect(() => {
    // Only run this check during an active round
    if (gameStatus === 'playing' && currentRound && CURRENT_QUESTION) {
      // Verify the current round matches our immutable question
      if (currentRound.message !== CURRENT_QUESTION.message || 
          currentRound.isAI !== CURRENT_QUESTION.isAI) {
        console.error(`[${gameInstanceId.current}] State drift detected! Fixing game state to match immutable question`);
        console.error(`Component state: "${currentRound.message}", Immutable: "${CURRENT_QUESTION.message}"`);
        
        // Reset the component state to match our immutable reference
        setCurrentRound({
          message: CURRENT_QUESTION.message,
          isAI: CURRENT_QUESTION.isAI,
          answered: currentRound.answered,
          correct: currentRound.correct
        });
      }
    }
  }, [currentRound, gameStatus]);

  // Additional stability effect - ensure only one round starts after initialization
  useEffect(() => {
    // This effect doesn't need to do anything on mount,
    // it just prevents redundant round starts
    const id = gameInstanceId.current;
    console.log(`[${id}] Stability guard effect mounted`);
    
    return () => {
      console.log(`[${id}] Stability guard effect unmounted`);
    };
  }, []);

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-xl text-center text-white">Please log in with Twitch to play Chat or Chatbot</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-h-11/12 flex flex-row bg-gray-900 text-white p-6">
      {/* Left panel - Chat display */}
      <div className="w-1/2 h-full pr-4 border-r border-gray-700">
        <h2 className="text-xl mb-4 text-center">Your Twitch Chat</h2>
        <div className="h-[calc(100%-2rem)]">
          <FilteredChat 
            onNewMessage={(msg) => processNewChatMessage(msg)}
            filteredMessages={CURRENT_QUESTION ? [CURRENT_QUESTION.message] : []} // Filter out the immutable question
          />
        </div>
      </div>
      
      {/* Right panel - Game UI */}
      <div className="w-1/2 h-full pl-4 flex flex-col">
        <h2 className="text-xl mb-4 text-center">Chat or Chatbot?</h2>
        
        {/* Score display */}
        <div className="flex justify-between mb-4 text-lg">
          <div>Correct: <span className="text-green-400">{score.correct}</span></div>
          <div>Incorrect: <span className="text-red-400">{score.incorrect}</span></div>
        </div>
        
        {/* Game status */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {gameStatus === 'waiting' && (
            <div className="text-center">
              <p className="text-lg mb-4">Waiting for chat messages...</p>
              <p>Start chatting in your Twitch channel to play!</p>
            </div>
          )}
          
          {gameStatus === 'playing' && CURRENT_QUESTION && (
            <div className="text-center">
              <p className="text-lg mb-6">Is this message from a real person or AI?</p>
              
              <div className="bg-gray-800 p-6 rounded-lg mb-8 max-w-md">
                <p className="text-lg">{CURRENT_QUESTION.message}</p>
              </div>
              
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => handleAnswer(false)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Real Person
                </button>
                
                <button 
                  onClick={() => handleAnswer(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  AI Chatbot
                </button>
              </div>
            </div>
          )}
          
          {gameStatus === 'result' && currentRound && (
            <div className="text-center">
              <p className="text-lg mb-2">
                {currentRound.correct 
                  ? <span className="text-green-400">Correct!</span> 
                  : <span className="text-red-400">Wrong!</span>}
              </p>
              
              <div className="bg-gray-800 p-6 rounded-lg mb-4 max-w-md">
                <p className="text-lg">{currentRound.message}</p>
              </div>
              
              <p className="text-lg mb-4">
                This message was from {currentRound.isAI ? 'an AI chatbot' : 'a real person'}
              </p>
              
              <p className="text-sm text-gray-400">Next round in a few seconds...</p>
            </div>
          )}
        </div>
        
        {/* Hidden message stats (for debugging) */}
        <div className="mt-4 text-xs text-gray-500">
          Hidden messages available: {hiddenMessages.length}
        </div>
      </div>
    </div>
  );
};

export default ChatOrChatbot; 