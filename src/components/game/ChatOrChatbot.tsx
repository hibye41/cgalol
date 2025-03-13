import React, { useState, useEffect, useRef } from 'react';
import { useTwitchAuth } from '../../hooks/use-twitch-auth';
import FilteredChat from '../FilteredChat';

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

const ChatOrChatbot: React.FC = () => {
  const { isAuthenticated } = useTwitchAuth();
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [usedMessages, setUsedMessages] = useState<Set<string>>(new Set());
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'result'>('waiting');
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(AI_MESSAGES);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameInstanceId = useRef(Math.random().toString(36).substring(2, 9));

  // Function to select a chat message to use for the game
  const selectChatMessage = () => {
    // Filter out messages we've already used
    const availableMessages = chatMessages.filter(msg => !usedMessages.has(msg));
    
    if (availableMessages.length === 0) {
      // If no chat messages are available, default to AI
      return null;
    }

    // Randomly select a message
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    return availableMessages[randomIndex];
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
    console.log(`[${gameInstanceId.current}] Starting new round. Available chat messages: ${chatMessages.length}`);
    
    // 50% chance of showing AI or real chat message
    const isAI = Math.random() < 0.5;
    
    let message: string | null;
    
    if (isAI || chatMessages.length === 0) {
      message = selectAIMessage();
      console.log(`[${gameInstanceId.current}] Selected AI message: "${message}"`);
    } else {
      message = selectChatMessage();
      
      // If no chat messages are available, fall back to AI
      if (!message) {
        console.log(`[${gameInstanceId.current}] No chat messages available, falling back to AI`);
        message = selectAIMessage();
        setGameStatus('waiting');
        return; // Wait for chat messages
      }
      
      console.log(`[${gameInstanceId.current}] Selected chat message: "${message}"`);
      
      // Mark this chat message as used
      setUsedMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(message as string);
        return newSet;
      });
    }
    
    setCurrentRound({
      message: message,
      isAI,
      answered: false,
      correct: null
    });
    
    setGameStatus('playing');
    
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
    if (!currentRound || currentRound.answered) return;
    
    const isCorrect = guessIsAI === currentRound.isAI;
    console.log(`[${gameInstanceId.current}] Player guessed ${guessIsAI ? 'AI' : 'Human'}, actual: ${currentRound.isAI ? 'AI' : 'Human'}`);
    
    // Update score
    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
    
    // Update current round
    setCurrentRound(prev => prev ? {
      ...prev,
      answered: true,
      correct: isCorrect
    } : null);
    
    setGameStatus('result');
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Set timer for next round
    timerRef.current = setTimeout(() => {
      startNewRound();
    }, 5000);
  };

  // Handle new chat messages coming in
  const handleNewChatMessage = (message: string) => {
    console.log(`[${gameInstanceId.current}] Received new chat message: "${message}"`);
    setChatMessages(prev => [...prev, message]);
    
    // If we're waiting for messages, start a round
    if (gameStatus === 'waiting' && !currentRound) {
      startNewRound();
    }
  };

  // Start the game when component mounts
  useEffect(() => {
    console.log(`[${gameInstanceId.current}] Game component mounted`);
    // If we already have messages, start a round immediately
    if (chatMessages.length > 0) {
      startNewRound();
    } else {
      console.log(`[${gameInstanceId.current}] Waiting for chat messages...`);
      setGameStatus('waiting');
    }
    
    return () => {
      console.log(`[${gameInstanceId.current}] Game component unmounting`);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
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
      <div className="w-1/3 h-full pr-4 border-r border-gray-700">
        <h2 className="text-xl mb-3 text-center">Live Chat</h2>
        <FilteredChat 
          filteredMessages={Array.from(usedMessages)} 
          onNewMessage={handleNewChatMessage}
        />
      </div>
      
      {/* Right panel - Game */}
      <div className="w-2/3 h-full pl-4 flex flex-col">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">Chat or Chatbot?</h1>
          <p className="text-lg">
            Score: {score.correct} correct, {score.incorrect} incorrect
          </p>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          {gameStatus === 'waiting' && (
            <div className="text-center">
              <p className="text-xl mb-6">Waiting for chat messages...</p>
              <div className="animate-pulse text-gray-400">
                Send some messages in your Twitch chat to play!
              </div>
            </div>
          )}
          
          {gameStatus === 'playing' && currentRound && (
            <div className="text-center max-w-2xl">
              <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-lg">
                <p className="text-xl">"{currentRound.message}"</p>
              </div>
              
              <p className="text-lg mb-6">Is this message from a real person or AI?</p>
              
              <div className="flex gap-6 justify-center">
                <button 
                  onClick={() => handleAnswer(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold transition duration-150"
                >
                  Real Person
                </button>
                <button 
                  onClick={() => handleAnswer(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition duration-150"
                >
                  AI Chatbot
                </button>
              </div>
            </div>
          )}
          
          {gameStatus === 'result' && currentRound && (
            <div className="text-center max-w-2xl">
              <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-lg">
                <p className="text-xl">"{currentRound.message}"</p>
              </div>
              
              <div className={`text-2xl font-bold mb-4 ${currentRound.correct ? 'text-green-400' : 'text-red-400'}`}>
                {currentRound.correct ? 'Correct!' : 'Wrong!'}
              </div>
              
              <p className="text-lg mb-6">
                This message was from {currentRound.isAI ? 'an AI chatbot' : 'a real person'}
              </p>
              
              <p className="text-gray-400 text-sm mt-4">
                Next round starting soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatOrChatbot; 