import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import RealtimeNotifications from './socket';

let notificationService: RealtimeNotifications | null = null;
export const initializeNotificationService = (server: HttpServer): RealtimeNotifications => {
  if (!notificationService) {
    notificationService = new RealtimeNotifications(server);
  }
  return notificationService;
};

export const getNotificationService = (): RealtimeNotifications => {
  if (!notificationService) {
    throw new Error('Notification service not initialized.');
  }
  return notificationService;
};