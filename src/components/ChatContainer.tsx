import React, { useEffect, useRef, useState } from 'react';
import ChatMessage, { ChatMessageData } from './ChatMessage';

interface ChatContainerProps {
  messages: ChatMessageData[];
  maxMessages?: number;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ 
  messages, 
  maxMessages = 100 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessageData[]>([]);

  // Update displayed messages when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Keep only the most recent messages up to maxMessages
      const newMessages = [...messages].slice(-maxMessages);
      setDisplayedMessages(newMessages);
    }
  }, [messages, maxMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedMessages, autoScroll]);

  // Handle scroll events to disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-y-auto bg-black text-white p-4 font-mono"
      onScroll={handleScroll}
    >
      {displayedMessages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-500">
          <p>No messages yet...</p>
        </div>
      ) : (
        displayedMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}
    </div>
  );
};

export default ChatContainer; 