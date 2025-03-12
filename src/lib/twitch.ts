// Twitch EventSub WebSocket client
type EventCallback = (data: any) => void;

interface TwitchEventSubSocket {
  on: (event: string, callback: EventCallback) => void;
  disconnect: () => void;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
}

// EventSub WebSocket client implementation
export class TwitchEventSub {
  private socket: WebSocket | null = null;
  private sessionId: string = '';
  private eventCallbacks: Record<string, EventCallback[]> = {};
  private keepaliveTimeout: number = 0;
  private keepaliveTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private clientId: string;
  private accessToken: string = '';
  private userId: string = '';

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  // Initialize the connection with an access token
  public init(accessToken: string): Promise<TwitchEventSubSocket> {
    this.accessToken = accessToken;
    return this.getUserInfo()
      .then(user => {
        this.userId = user.id;
        return this.connect();
      })
      .then(() => {
        return {
          on: this.on.bind(this),
          disconnect: this.disconnect.bind(this)
        };
      });
  }

  // Get user info from Twitch API
  private getUserInfo(): Promise<TwitchUser> {
    return fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data.data || data.data.length === 0) {
        throw new Error('No user data returned');
      }
      return data.data[0];
    });
  }

  // Connect to EventSub WebSocket
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
      };
      
      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
        
        // If we receive a welcome message, resolve the promise
        if (message.metadata.message_type === 'session_welcome') {
          resolve();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        this.handleReconnect();
      };
    });
  }

  // Handle incoming WebSocket messages
  private handleMessage(message: any): void {
    const { metadata, payload } = message;
    const messageType = metadata.message_type;
    
    switch (messageType) {
      case 'session_welcome':
        this.sessionId = payload.session.id;
        this.keepaliveTimeout = payload.session.keepalive_timeout_seconds;
        this.setupKeepaliveTimer();
        this.triggerCallbacks('connected', this.sessionId);
        break;
        
      case 'session_keepalive':
        this.triggerCallbacks('session_keepalive', null);
        break;
        
      case 'notification':
        const eventType = metadata.subscription_type;
        this.triggerCallbacks(eventType, message);
        break;
        
      case 'session_reconnect':
        this.reconnectToNewWebsocket(payload.session.reconnect_url);
        break;
        
      case 'revocation':
        this.triggerCallbacks('revocation', message);
        break;
    }
  }

  // Set up keepalive timer
  private setupKeepaliveTimer(): void {
    if (this.keepaliveTimer) {
      window.clearTimeout(this.keepaliveTimer);
    }
    
    // Set timeout for 1.5x the keepalive timeout
    this.keepaliveTimer = window.setTimeout(() => {
      this.triggerCallbacks('session_silenced', null);
      this.reconnect();
    }, this.keepaliveTimeout * 1500);
  }

  // Reconnect to a new WebSocket URL
  private reconnectToNewWebsocket(url: string): void {
    if (this.socket) {
      this.socket.onclose = null; // Prevent the normal onclose handler
      this.socket.close();
    }
    
    this.socket = new WebSocket(url);
    
    this.socket.onopen = () => {
      console.log('Reconnected to new WebSocket');
      this.reconnectAttempts = 0;
    };
    
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error after reconnect:', error);
    };
    
    this.socket.onclose = (event) => {
      console.log(`WebSocket closed after reconnect: ${event.code} - ${event.reason}`);
      this.handleReconnect();
    };
  }

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.keepaliveTimer) {
      window.clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached');
      this.triggerCallbacks('max_reconnect_attempts', null);
    }
  }

  // Reconnect to the WebSocket
  private reconnect(): void {
    this.connect().catch(error => {
      console.error('Failed to reconnect:', error);
    });
  }

  // Register an event callback
  public on(event: string, callback: EventCallback): void {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    
    this.eventCallbacks[event].push(callback);
  }

  // Trigger callbacks for an event
  private triggerCallbacks(event: string, data: any): void {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  // Subscribe to a Twitch EventSub topic
  public subscribe(type: string, version: string, condition: any): Promise<void> {
    return fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        version,
        condition,
        transport: {
          method: 'websocket',
          session_id: this.sessionId
        }
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to subscribe to ${type}: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`Subscribed to ${type}`, data);
    });
  }

  // Subscribe to chat messages for a broadcaster
  public subscribeToChatMessages(broadcasterUserId: string): Promise<void> {
    return this.subscribe('channel.chat.message', '1', {
      broadcaster_user_id: broadcasterUserId,
      user_id: this.userId
    });
  }

  // Disconnect the WebSocket
  public disconnect(): void {
    if (this.keepaliveTimer) {
      window.clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Helper function to get Twitch auth URL
export function getTwitchAuthUrl(clientId: string, redirectUri: string): string {
  return `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=user:read:chat`;
}

// Helper function to parse access token from URL hash
export function parseAccessToken(): string | null {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
} 