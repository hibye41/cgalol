/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { useTwitchAuth } from '../hooks/use-twitch-auth';

// Keep track of active connections globally to prevent duplicates
const activeConnection: {
  socket: WebSocket | null;
  sessionId: string | null;
  userId: string | null;
  subscribed: boolean;
} = {
  socket: null,
  sessionId: null,
  userId: null,
  subscribed: false
};

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

interface FilteredChatProps {
  filteredMessages?: string[];
  onNewMessage?: (message: string) => boolean | void; // Return true to intercept/hide the message
}

const FilteredChat: React.FC<FilteredChatProps> = ({ 
  filteredMessages = [], 
  onNewMessage 
}) => {
  const { isAuthenticated, user, accessToken } = useTwitchAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(Math.random().toString(36).substring(2, 9));

  console.log(`[${instanceId.current}] FilteredChat component rendered`);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle incoming messages from the global WebSocket
  const handleMessage = (data: any) => {
    const { metadata, payload } = data;
    const { message_type } = metadata;

    switch (message_type) {
      case 'session_welcome': {
        const { session } = payload;
        const { id } = session;
        console.log(`[${instanceId.current}] Connected to EventSub with session ID:`, id);
        
        // Store session ID globally
        activeConnection.sessionId = id;
        activeConnection.subscribed = false;
        
        setSessionId(id);
        setConnected(true);
        
        // Subscribe to chat events once we have a session ID
        if (user && !activeConnection.subscribed) {
          subscribeToChat(id, user.id);
          activeConnection.userId = user.id;
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
        
        if (activeConnection.socket) {
          console.log(`[${instanceId.current}] Reconnecting to new WebSocket URL`);
          activeConnection.socket.close();
          
          const newSocket = new WebSocket(reconnectUrl);
          setupWebSocketHandlers(newSocket);
          
          activeConnection.socket = newSocket;
          socketRef.current = newSocket;
        }
        break;
      }

      default:
        console.log(`[${instanceId.current}] Unhandled message type:`, message_type);
    }
  };

  // Setup WebSocket event handlers
  const setupWebSocketHandlers = (socket: WebSocket) => {
    socket.addEventListener('open', () => {
      console.log(`[${instanceId.current}] WebSocket connection opened`);
    });

    socket.addEventListener('close', (event) => {
      console.log(`[${instanceId.current}] WebSocket connection closed:`, event.code);
      
      setConnected(false);
      
      // Only reconnect if this is the active connection
      if (activeConnection.socket === socket) {
        activeConnection.socket = null;
        activeConnection.sessionId = null;
        activeConnection.subscribed = false;
        
        // Reconnect after a short delay
        setTimeout(() => initWebSocket(), 3000);
      }
    });

    socket.addEventListener('error', (error) => {
      console.error(`[${instanceId.current}] WebSocket error:`, error);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (error) {
        console.error(`[${instanceId.current}] Error processing WebSocket message:`, error);
      }
    });
  };

  // Initialize WebSocket connection
  const initWebSocket = () => {
    if (!isAuthenticated || !user || !accessToken) {
      console.log(`[${instanceId.current}] Not authenticated or missing credentials, skipping connection`);
      return;
    }

    // If there's already an active connection, use it
    if (activeConnection.socket && activeConnection.socket.readyState === WebSocket.OPEN) {
      console.log(`[${instanceId.current}] Using existing WebSocket connection`);
      socketRef.current = activeConnection.socket;
      setConnected(true);
      
      if (activeConnection.sessionId) {
        setSessionId(activeConnection.sessionId);
        
        // Make sure we're subscribed
        if (!activeConnection.subscribed && user) {
          subscribeToChat(activeConnection.sessionId, user.id);
        }
      }
      return;
    }

    // Create a new WebSocket connection
    console.log(`[${instanceId.current}] Creating new WebSocket connection`);
    const socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
    setupWebSocketHandlers(socket);
    
    socketRef.current = socket;
    activeConnection.socket = socket;
  };

  useEffect(() => {
    // Initialize connection
    initWebSocket();

    // Cleanup on unmount
    return () => {
      console.log(`[${instanceId.current}] FilteredChat component unmounting`);
      
      // Don't close the connection as other components might be using it
      // Just remove our reference
      socketRef.current = null;
    };
  }, [isAuthenticated, user, accessToken]);

  const subscribeToChat = async (sessionId: string, userId: string) => {
    if (!accessToken) return;
    
    // Prevent duplicate subscriptions
    if (activeConnection.subscribed) {
      console.log(`[${instanceId.current}] Already subscribed to chat events`);
      return;
    }

    try {
      console.log(`[${instanceId.current}] Subscribing to chat events for user:`, userId);
      
      // Subscribe to chat messages
      await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
				method: "POST",
				headers: {
					"Client-ID": import.meta.env.VITE_TWITCH_CLIENT_ID as string,
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					type: "channel.chat.message",
					version: "1",
					condition: {
						broadcaster_user_id: userId,
						user_id: userId,
					},
					transport: {
						method: "websocket",
						session_id: sessionId,
					},
				}),
			});

      // Subscribe to message deletions
      await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
				method: "POST",
				headers: {
					"Client-ID": import.meta.env.VITE_TWITCH_CLIENT_ID as string,
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					type: "channel.chat.message_delete",
					version: "1",
					condition: {
						broadcaster_user_id: userId,
						user_id: userId,
					},
					transport: {
						method: "websocket",
						session_id: sessionId,
					},
				}),
			});

      console.log(`[${instanceId.current}] Successfully subscribed to chat events`);
      activeConnection.subscribed = true;
    } catch (error) {
      console.error(`[${instanceId.current}] Error subscribing to chat events:`, error);
    }
  };

  const handleNotification = (payload: EventSubPayload) => {
    const { subscription, event } = payload;
    const { type } = subscription;

    switch (type) {
      case 'channel.chat.message': {
        const { message_id, chatter_user_name, message } = event;
        
        if (message_id && chatter_user_name && message) {
          console.log(`[${instanceId.current}] Received chat message ID ${message_id}:`, message.text);
          
          // Check if we want to filter this message BEFORE displaying
          let shouldHideMessage = false;
          
          // First check if it's in the filtered messages list
          if (filteredMessages.includes(message.text)) {
            console.log(`[${instanceId.current}] Message ID ${message_id} is in filteredMessages, hiding:`, message.text);
            shouldHideMessage = true;
          }
          
          // Then check with the callback if provided
          if (!shouldHideMessage && onNewMessage) {
            try {
              console.log(`[${instanceId.current}] Checking if message should be intercepted:`, message.text);
              const result = onNewMessage(message.text);
              // If onNewMessage returns true, we should hide this message
              if (result === true) {
                shouldHideMessage = true;
                console.log(`[${instanceId.current}] Message ID ${message_id} intercepted for game use:`, message.text);
              } else {
                console.log(`[${instanceId.current}] Message ID ${message_id} will be displayed in chat:`, message.text);
              }
            } catch (error) {
              console.error(`[${instanceId.current}] Error in onNewMessage callback:`, error);
            }
          } else if (!onNewMessage) {
            console.log(`[${instanceId.current}] No onNewMessage handler provided`);
          }
          
          // Only add to visible messages if we're not hiding it
          if (!shouldHideMessage) {
            // Double check for duplicates by ID
            setMessages(prev => {
              if (prev.some(msg => msg.id === message_id)) {
                console.log(`[${instanceId.current}] Preventing duplicate message ID ${message_id}`);
                return prev;
              }
              
              console.log(`[${instanceId.current}] Adding message ID ${message_id} to visible chat`);
              return [
                ...prev,
                {
                  id: message_id,
                  username: chatter_user_name,
                  text: message.text,
                  isDeleted: false
                }
              ];
            });
          }
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
        console.log(`[${instanceId.current}] Unhandled notification type:`, type);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl mb-4">Please log in with Twitch to view your chat</h2>
      </div>
    );
  }

  // Apply any additional filtered messages
  const displayMessages = messages.filter(msg => 
    !filteredMessages.includes(msg.text)
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 bg-gray-800 rounded-lg p-3 overflow-y-auto mb-2">
        {!connected && (
          <div className="text-yellow-500 mb-2 text-sm">Connecting to Twitch chat...</div>
        )}
        
        {connected && displayMessages.length === 0 && (
          <div className="text-gray-500 text-sm">No messages yet. Start chatting in your Twitch channel!</div>
        )}
        
        {displayMessages.map((msg) => (
          <div 
            key={msg.id} 
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
          ? `Connected to ${user?.display_name}'s chat` 
          : 'Disconnected'}
      </div>
    </div>
  );
};

export default FilteredChat; 