import { io, Socket } from 'socket.io-client';

interface NotificationMessage {
  event: string;
  data: any;
  timestamp: string;
  id: string;
}

interface IdentifiedResponse {
  success: boolean;
  message: string;
  hasPendingMessages: boolean;
  connectedDevices: number;
}

class NotificationClient {
  private socket: Socket;
  private userId: string;

  constructor(serverUrl: string, userId: string) {
    this.socket = io(serverUrl);
    this.userId = userId;
    this.setupEventHandlers();
    this.identify();
  }

  private identify(): void {
    this.socket.emit('identify', this.userId);
  }

  private setupEventHandlers(): void {
    this.socket.on('identified', (data: IdentifiedResponse) => {
      console.log('Successfully identified with server', data);
    });

    this.socket.on('notification', (message: NotificationMessage) => {
      console.log('Received notification:', message);
      this.handleNotification(message);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  private handleNotification(message: NotificationMessage): void {
    // Implement your notification handling logic
    switch (message.event) {
      case 'new_message':
        this.showMessageNotification(message.data);
        break;
      case 'group_notification':
        this.showGroupNotification(message.data);
        break;
      default:
        console.log('Unknown notification type:', message.event);
    }
  }

  private showMessageNotification(data: any): void {
    // Show browser notification or update UI
    if (Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.content,
        icon: '/notification-icon.png'
      });
    }
  }

  private showGroupNotification(data: any): void {
    // Handle group notifications
    console.log('Group notification:', data);
  }

  // Voluntary logout
  public logout(): void {
    this.socket.emit('logout');
    this.socket.disconnect();
  }

  // Reconnect with same user ID
  public reconnect(): void {
    if (this.socket.disconnected) {
      this.socket.connect();
      this.identify();
    }
  }

  // Get socket instance if needed
  public getSocket(): Socket {
    return this.socket;
  }
}

// Usage
const notificationClient = new NotificationClient('http://localhost:3000', 'user123');