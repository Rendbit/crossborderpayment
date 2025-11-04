import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

interface NotificationMessage {
  event: string;
  data: any;
  timestamp: string;
  id: string;
}

interface EmitOptions {
  storeOffline?: boolean;
  deliverToAllDevices?: boolean;
}

interface IdentifiedResponse {
  success: boolean;
  message: string;
  hasPendingMessages: boolean;
  connectedDevices: number;
}

class RealtimeNotifications {
  private connectedClients: Map<string, Set<Socket>>;
  private offlineMessages: Map<string, NotificationMessage[]>;
  private io: Server;

  constructor(server: HttpServer) {
    this.connectedClients = new Map();
    this.offlineMessages = new Map();
    
    this.io = new Server(server, {
      cors: {
        origin: "*",
      }
    });
    
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      socket.on('identify', (userId: string) => {
        this.handleClientIdentification(socket, userId);
      });
      socket.on('disconnect', (reason: string) => {
        console.log(`Client ${socket.id} disconnected: ${reason}`);
        this.handleClientDisconnection(socket);
      });
      socket.on('logout', () => {
        console.log(`Client ${socket.id} logged out voluntarily`);
        this.handleClientDisconnection(socket);
      });
    });
  }

  private handleClientIdentification(socket: Socket, userId: string): void {
    if (!userId) {
      socket.emit('error', { message: 'User ID is required' });
      socket.disconnect();
      return;
    }

    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, new Set());
    }
    
    const userSockets = this.connectedClients.get(userId)!;
    userSockets.add(socket);
    
    // Store userId in socket for easy reference
    (socket as any).userId = userId;
    
    console.log(`User ${userId} identified with socket ${socket.id}. Total devices: ${userSockets.size}`);
    
    // Send pending offline messages if any
    this.deliverOfflineMessages(userId, socket);
    
    const response: IdentifiedResponse = {
      success: true,
      message: 'Successfully identified',
      hasPendingMessages: this.offlineMessages.has(userId),
      connectedDevices: userSockets.size
    };
    
    socket.emit('identified', response);
  }

  private deliverOfflineMessages(userId: string, socket: Socket): void {
    if (this.offlineMessages.has(userId)) {
      const pendingMessages = this.offlineMessages.get(userId)!;
      console.log(
        `Delivering ${pendingMessages.length} pending messages to user ${userId} on socket ${socket.id}`
      );
      
      // Send all pending messages to this specific socket (device)
      pendingMessages.forEach((message: NotificationMessage) => {
        socket.emit('notification', message);
      });

      // Clear offline messages for this user since they've been delivered to at least one device
      this.offlineMessages.delete(userId);
      console.log(`Cleared offline messages for user ${userId} after delivery to socket ${socket.id}`);
    }
  }

  private handleClientDisconnection(socket: Socket): void {
    const userId = (socket as any).userId;
    if (!userId) {
      console.log(`Socket ${socket.id} disconnected without identification`);
      return;
    }

    const userSockets = this.connectedClients.get(userId);
    
    if (userSockets) {
      userSockets.delete(socket);
      
      if (userSockets.size === 0) {
        this.connectedClients.delete(userId);
        console.log(`All sockets disconnected for user ${userId}. User is now offline.`);
      } else {
        console.log(`Socket disconnected for user ${userId}. Remaining devices: ${userSockets.size}`);
      }
    }
    
    // Clear the userId from socket
    delete (socket as any).userId;
  }

  /**
   * Emit notification to one or multiple users
   * @param userIds - Single user ID or array of user IDs
   * @param event - Event name
   * @param data - Data to send
   * @param options - Additional options
   */
  public emit(userIds: string | string[], event: string, data: any, options: EmitOptions = {}): void {
    const { storeOffline = true, deliverToAllDevices = true } = options;
    
    // Convert single userId to array for uniform processing
    const targetUserIds: string[] = Array.isArray(userIds) ? userIds : [userIds];
    
    const message: NotificationMessage = {
      event,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateMessageId()
    };

    targetUserIds.forEach((userId: string) => {
      this.sendToUser(userId, message, storeOffline, deliverToAllDevices);
    });
  }

  private sendToUser(userId: string, message: NotificationMessage, storeOffline: boolean, deliverToAllDevices: boolean): void {
    const userSockets = this.connectedClients.get(userId);
    
    if (userSockets && userSockets.size > 0) {
      console.log(`Sending message to user ${userId} on ${userSockets.size} device(s)`);
      
      if (deliverToAllDevices) {
        userSockets.forEach((socket: Socket) => {
          socket.emit('notification', message);
        });
      } else {
        // Send to only one device (first available)
        const socket = Array.from(userSockets)[0];
        socket.emit('notification', message);
      }
    } else if (storeOffline) {
      // User is offline - store message for later delivery
      this.storeOfflineMessage(userId, message);
      console.log(`User ${userId} is offline. Message stored for later delivery.`);
    } else {
      console.log(`User ${userId} is offline and storeOffline is false. Message not stored.`);
    }
  }

  private storeOfflineMessage(userId: string, message: NotificationMessage): void {
    if (!this.offlineMessages.has(userId)) {
      this.offlineMessages.set(userId, []);
    }
    
    const userMessages = this.offlineMessages.get(userId)!;
    userMessages.push(message);
    
    // Optional: Limit stored messages per user to prevent memory issues
    const MAX_OFFLINE_MESSAGES = 100;
    if (userMessages.length > MAX_OFFLINE_MESSAGES) {
      userMessages.splice(0, userMessages.length - MAX_OFFLINE_MESSAGES);
      console.log(`Offline message limit reached for user ${userId}. Oldest messages removed.`);
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear offline messages for a user when they're no longer needed
   * Useful when user explicitly marks messages as read on all devices
   */
  public clearOfflineMessages(userId: string): number {
    if (this.offlineMessages.has(userId)) {
      const count = this.offlineMessages.get(userId)!.length;
      this.offlineMessages.delete(userId);
      console.log(`Cleared ${count} offline messages for user ${userId}`);
      return count;
    }
    return 0;
  }

  /**
   * Get online users count
   */
  public getOnlineUsersCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Check if a specific user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.connectedClients.has(userId) && this.connectedClients.get(userId)!.size > 0;
  }

  /**
   * Get number of connected devices for a user
   */
  public getUserDeviceCount(userId: string): number {
    return this.connectedClients.has(userId) ? this.connectedClients.get(userId)!.size : 0;
  }

  /**
   * Get pending messages count for a user
   */
  public getPendingMessagesCount(userId: string): number {
    return this.offlineMessages.has(userId) ? this.offlineMessages.get(userId)!.length : 0;
  }

  /**
   * Get all connected user IDs
   */
  public getConnectedUserIds(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Force disconnect all sockets for a user (useful for logout from all devices)
   */
  public disconnectUser(userId: string): void {
    const userSockets = this.connectedClients.get(userId);
    if (userSockets) {
      userSockets.forEach((socket: Socket) => {
        socket.disconnect();
      });
      this.connectedClients.delete(userId);
      console.log(`Disconnected all devices for user ${userId}`);
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): Server {
    return this.io;
  }
}

export default RealtimeNotifications;