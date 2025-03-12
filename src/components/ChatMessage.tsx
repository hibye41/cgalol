import React from 'react';

export interface ChatMessageFragment {
  type: 'text' | 'emote' | 'mention' | 'cheermote';
  text: string;
  emote?: {
    id: string;
    emote_set_id: string;
    owner_id: string;
    format: string[];
  };
  mention?: {
    user_id: string;
    user_login: string;
    user_name: string;
  };
  cheermote?: {
    prefix: string;
    bits: number;
    tier: number;
  };
}

export interface ChatMessageData {
  id: string;
  broadcaster_name: string;
  chatter_name: string;
  message: {
    text: string;
    fragments: ChatMessageFragment[];
  };
  is_action: boolean;
  color?: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const renderFragment = (fragment: ChatMessageFragment, index: number) => {
    switch (fragment.type) {
      case 'emote':
        if (fragment.emote) {
          return (
            <img 
              key={index}
              src={`https://static-cdn.jtvnw.net/emoticons/v2/${fragment.emote.id}/default/dark/1.0`}
              alt={fragment.text}
              title={fragment.text}
              className="inline-block h-6"
            />
          );
        }
        return <span key={index}>{fragment.text}</span>;
        
      case 'mention':
        return (
          <span key={index} className="bg-purple-900 text-white px-1">
            {fragment.text}
          </span>
        );
        
      case 'cheermote':
        if (fragment.cheermote) {
          return (
            <span key={index} className="text-yellow-400">
              {fragment.text}
            </span>
          );
        }
        return <span key={index}>{fragment.text}</span>;
        
      case 'text':
      default:
        return <span key={index}>{fragment.text}</span>;
    }
  };

  return (
    <div className="py-1 font-mono">
      <span className="text-gray-400 mr-2">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span 
        className="font-bold mr-1" 
        style={{ color: message.color || 'white' }}
      >
        {message.chatter_name}:
      </span>
      <span className={message.is_action ? 'italic' : ''}>
        {message.message.fragments.map(renderFragment)}
      </span>
    </div>
  );
};

export default ChatMessage; 