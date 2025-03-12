import { useState, useEffect, useCallback } from 'react';
import { TwitchEventSub, parseAccessToken } from '../lib/twitch';
import { ChatMessageData, ChatMessageFragment } from '../components/ChatMessage';

interface UseTwitchChatOptions {
  clientId: string;
  redirectUri: string;
}

interface UseTwitchChatResult {
  messages: ChatMessageData[];
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

export function useTwitchChat({ clientId, redirectUri }: UseTwitchChatOptions): UseTwitchChatResult {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [eventSub, setEventSub] = useState<TwitchEventSub | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize EventSub client
  useEffect(() => {
    if (clientId) {
      const client = new TwitchEventSub(clientId);
      setEventSub(client);
    }
  }, [clientId]);

  // Check for access token in URL hash on mount
  useEffect(() => {
    // Check for errors in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorDescription = urlParams.get('error_description');
    const error = urlParams.get('error');
    
    if (error && errorDescription) {
      setError(`Authentication error: ${error} - ${errorDescription}`);
      return;
    }
    
    // Check for access token in hash
    const token = parseAccessToken();
    if (token) {
      console.log('Found access token in URL hash');
      setAccessToken(token);
      setIsAuthenticated(true);
      
      // Clear the hash from the URL to prevent token leakage
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Connect to Twitch chat when authenticated
  useEffect(() => {
    if (eventSub && accessToken && isAuthenticated) {
      setError(null);
      console.log('Initializing EventSub with access token');
      
      eventSub.init(accessToken)
        .then((socket) => {
          console.log('EventSub initialized successfully');
          setIsConnected(true);
          
          // Get user info to subscribe to their own chat
          fetch('https://api.twitch.tv/helix/users', {
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${accessToken}`
            }
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to get user info: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (data.data && data.data.length > 0) {
              const user = data.data[0];
              console.log('User info retrieved:', user.display_name);
              setUserId(user.id);
              
              // Subscribe to chat messages for the user's channel
              return eventSub.subscribeToChatMessages(user.id);
            } else {
              throw new Error('Failed to get user info');
            }
          })
          .catch(err => {
            console.error('Error subscribing to chat:', err);
            setError(`Failed to subscribe to chat: ${err.message}`);
          });
          
          // Listen for chat messages
          socket.on('channel.chat.message', (data) => {
            const { payload } = data;
            const { event } = payload;
            
            const {
              broadcaster_user_name,
              chatter_user_name,
              message_id,
              message,
              color
            } = event;
            
            const newMessage: ChatMessageData = {
              id: message_id,
              broadcaster_name: broadcaster_user_name,
              chatter_name: chatter_user_name,
              message: {
                text: message.text,
                fragments: message.fragments as ChatMessageFragment[]
              },
              is_action: false, // Twitch EventSub doesn't provide this info directly
              color: color,
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, newMessage]);
          });
        })
        .catch(err => {
          console.error('Error connecting to Twitch:', err);
          setError(`Failed to connect to Twitch: ${err.message}`);
          setIsConnected(false);
        });
      
      return () => {
        if (eventSub) {
          eventSub.disconnect();
          setIsConnected(false);
        }
      };
    }
  }, [eventSub, accessToken, isAuthenticated, clientId]);

  // Login function
  const login = useCallback(() => {
    if (!clientId) {
      setError('Client ID is not configured');
      return;
    }
    
    console.log(`Redirecting to Twitch auth with redirect URI: ${redirectUri}`);
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=user:read:chat`;
    window.location.href = authUrl;
  }, [clientId, redirectUri]);

  // Logout function
  const logout = useCallback(() => {
    setAccessToken(null);
    setIsAuthenticated(false);
    setIsConnected(false);
    setMessages([]);
    
    if (eventSub) {
      eventSub.disconnect();
    }
  }, [eventSub]);

  return {
    messages,
    isConnected,
    isAuthenticated,
    error,
    login,
    logout
  };
} 