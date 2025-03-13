import { useState, useEffect } from 'react';
import { TWITCH_CLIENT_ID } from '../lib/twitch-config';

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  email?: string;
  profile_image_url?: string;
}

interface TwitchAuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  accessToken: string | null;
  user: TwitchUser | null;
  error: string | null;
}

export const useTwitchAuth = () => {
  // Your Twitch application's client ID
  const CLIENT_ID = TWITCH_CLIENT_ID;
  const REDIRECT_URI = window.location.origin + window.location.pathname;
  const SCOPE = 'user:read:chat';

  const [authState, setAuthState] = useState<TwitchAuthState>({
    isAuthenticated: false,
    isAuthenticating: false,
    accessToken: null,
    user: null,
    error: null,
  });

  // Initialize auth state from URL hash on component mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check if we have a token in the URL hash
      if (window.location.hash) {
        const parsedHash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = parsedHash.get('access_token');
        
        if (accessToken) {
          setAuthState(prev => ({ ...prev, isAuthenticating: true }));
          
          try {
            // Fetch user data with the token
            const response = await fetch('https://api.twitch.tv/helix/users', {
              headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
              setAuthState({
                isAuthenticated: true,
                isAuthenticating: false,
                accessToken,
                user: data.data[0],
                error: null
              });
              
              // Clean up the URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              throw new Error('Failed to get user data');
            }
          } catch (error) {
            setAuthState({
              isAuthenticated: false,
              isAuthenticating: false,
              accessToken: null,
              user: null,
              error: error instanceof Error ? error.message : 'Authentication failed'
            });
          }
        }
      }
    };
    
    checkAuth();
  }, []);

  // Function to initiate the login process
  const login = () => {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${SCOPE}`;
    window.location.href = authUrl;
  };

  // Function to log out
  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      isAuthenticating: false,
      accessToken: null,
      user: null,
      error: null
    });
  };

  return {
    ...authState,
    login,
    logout
  };
}; 