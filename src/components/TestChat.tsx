import React, { useEffect, useState, useRef } from 'react';
import { useTwitchAuth } from '../hooks/use-twitch-auth';
import { TWITCH_CLIENT_ID } from '../lib/twitch-config';

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  isDeleted: boolean;
}

interface EventSubPayload {
  subscription: {
    type: string;
  };
  event: {
    message_id?: string;
    chatter_user_name?: string;
    message?: {
      text: string;
    };
  };
}

const TestChat: React.FC = () => {
  const { isAuthenticated, user, accessToken } = useTwitchAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated || !user || !accessToken) {
      return;
    }

    // Initialize WebSocket connection
    const initWebSocket = () => {
      const socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        console.log('WebSocket connection opened');
      });

      socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed:', event.code);
        // Reconnect after a short delay
        setTimeout(initWebSocket, 3000);
      });

      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });

      socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        const { metadata, payload } = data;
        const { message_type } = metadata;

        switch (message_type) {
          case 'session_welcome': {
            const { session } = payload;
            const { id } = session;
            console.log('Connected to EventSub with session ID:', id);
            setSessionId(id);
            setConnected(true);
            
            // Subscribe to chat events once we have a session ID
            if (user) {
              subscribeToChat(id, user.id);
            }
            break;
          }

          case 'notification':
            handleNotification(payload);
            break;

          case 'session_keepalive':
            // Just keep the connection alive
            break;

          case 'session_reconnect': {
            // Handle reconnect by connecting to the new URL
            const reconnectUrl = payload.session.reconnect_url;
            socket.close();
            const newSocket = new WebSocket(reconnectUrl);
            socketRef.current = newSocket;
            break;
          }

          default:
            console.log('Unhandled message type:', message_type, data);
        }
      });
    };

    initWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isAuthenticated, user, accessToken]);

  const subscribeToChat = async (sessionId: string, userId: string) => {
    if (!accessToken) return;

    try {
      // Subscribe to chat messages
      await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'channel.chat.message',
          version: '1',
          condition: {
            broadcaster_user_id: userId,
            user_id: userId
          },
          transport: {
            method: 'websocket',
            session_id: sessionId
          }
        })
      });

      // Subscribe to message deletions
      await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'channel.chat.message_delete',
          version: '1',
          condition: {
            broadcaster_user_id: userId,
            user_id: userId
          },
          transport: {
            method: 'websocket',
            session_id: sessionId
          }
        })
      });

      console.log('Subscribed to chat events');
    } catch (error) {
      console.error('Error subscribing to chat events:', error);
    }
  };

  const handleNotification = (payload: EventSubPayload) => {
    const { subscription, event } = payload;
    const { type } = subscription;

    switch (type) {
      case 'channel.chat.message': {
        const { message_id, chatter_user_name, message } = event;
        
        if (message_id && chatter_user_name && message) {
          setMessages(prev => [
            ...prev,
            {
              id: message_id,
              username: chatter_user_name,
              text: message.text,
              isDeleted: false
            }
          ]);
        }
        break;
      }

      case 'channel.chat.message_delete': {
        const { message_id: deletedMessageId } = event;
        
        if (deletedMessageId) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === deletedMessageId 
                ? { ...msg, isDeleted: true } 
                : msg
            )
          );
        }
        break;
      }

      default:
        console.log('Unhandled notification type:', type, payload);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl mb-4">Please log in with Twitch to view your chat</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-xl mb-2 text-center">Chat for {user?.display_name}</h2>
      
      <div className="flex-1 bg-gray-800 rounded-lg p-3 overflow-y-auto mb-2">
        {!connected && (
          <div className="text-yellow-500 mb-2 text-sm">Connecting to Twitch chat...</div>
        )}
        
        {connected && messages.length === 0 && (
          <div className="text-gray-500 text-sm">No messages yet. Start chatting in your Twitch channel!</div>
        )}
        
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-1 text-sm ${msg.isDeleted ? 'text-gray-500 line-through' : 'text-white'}`}
          >
            <span className="font-bold">{msg.username}: </span>
            <span>{msg.text}</span>
            {msg.isDeleted && <span className="text-xs ml-1">(deleted)</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="text-xs text-gray-400 text-center">
        {connected 
          ? `Connected to EventSub (Session: ${sessionId?.substring(0, 8)}...)` 
          : 'Disconnected from EventSub WebSocket'}
      </div>
    </div>
  );
};

export default TestChat; 