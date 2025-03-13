import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  email?: string;
  profile_image_url?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  accessToken: string | null;
  user: TwitchUser | null;
  error: string | null;
}

// Create a persistent atom for auth state
export const authStateAtom = atomWithStorage<AuthState>('twitch_auth_state', {
  isAuthenticated: false,
  isAuthenticating: false,
  accessToken: null,
  user: null,
  error: null,
});

// Atom for login function
export const loginAtom = atom(
  null,
  () => {
    // Use the root URL as the redirect URI to ensure it works with our router
    const REDIRECT_URI = window.location.origin + '/';
    const SCOPE = 'user:read:chat';
    
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${import.meta.env.VITE_TWITCH_CLIENT_ID as string}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${SCOPE}`;
    window.location.href = authUrl;
  }
);

// Atom for logout function
export const logoutAtom = atom(
  null,
  (_, set) => {
    set(authStateAtom, {
      isAuthenticated: false,
      isAuthenticating: false,
      accessToken: null,
      user: null,
      error: null,
    });
  }
);

// Atom for checking auth from URL hash
export const checkAuthAtom = atom(
  null,
  async (_, set) => {
    // Check if we have a token in the URL hash
    if (window.location.hash) {
      const parsedHash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = parsedHash.get('access_token');
      
      if (accessToken) {
        set(authStateAtom, prev => ({ 
          ...prev, 
          isAuthenticating: true, 
          accessToken 
        }));
        
        try {
          // Fetch user data with the token
          const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
              'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID as string,
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          const data = await response.json();
          
          if (data.data && data.data.length > 0) {
            set(authStateAtom, {
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
          set(authStateAtom, {
            isAuthenticated: false,
            isAuthenticating: false,
            accessToken: null,
            user: null,
            error: error instanceof Error ? error.message : 'Authentication failed'
          });
        }
      }
    }
  }
); 