import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import { logger } from '../shared/logger';
import { AuthRepository } from '../modules/auth/auth.repository';
import { notifyUserBackend } from '../shared/eventBus';

interface AuthToken {
  id: string;
  role?: string;
  [key: string]: any;
}

let io: Server | null = null;

// Map to store userId -> Set of socketIds
const userSocketMap = new Map<string, Set<string>>();

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Configure this based on your env/requirements
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // NOTE: Events from the user backend now arrive via Redis pub/sub
  // (initUserEventSubscriber in shared/eventBus.ts), not a Socket.IO `/internal`
  // namespace. The old bridge has been removed.

  // Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn(`Socket connection rejected: No token provided. ID: ${socket.id}`);
        return next(new Error('Authentication failed: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as AuthToken;

      // Fetch full user details to get the name
      const user = await AuthRepository.getUserProfileById(decoded.id);

      if (!user) {
        logger.warn(`Socket connection rejected: User not found. ID: ${socket.id}`);
        return next(new Error('Authentication failed: User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      logger.warn(`Socket connection rejected: Invalid token. ID: ${socket.id}`);
      return next(new Error('Authentication failed: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userName = socket.data.user?.name || 'Unknown';
    const userId = socket.data.user?.id || 'Unknown';

    // Add to user map
    if (userId !== 'Unknown') {
      if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set());
      }
      userSocketMap.get(userId)?.add(socket.id);
    }

    // Join admin sockets to a dedicated room based on role
    socket.on('JOIN_ADMIN_ROOM', () => {
      socket.join('admin');

      logger.info(`🔐 Admin socket ${socket.id} joined admin room`);
    });

    logger.info(`🔌 Socket connected: ${socket.id} (User: ${userName} | ID: ${userId})`);

    socket.on('disconnect', (reason) => {
      // Remove from user map
      if (userId !== 'Unknown') {
        const userSockets = userSocketMap.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            userSocketMap.delete(userId);
          }
        }
      }
      logger.info(`❌ Socket disconnected: ${socket.id} (User: ${userName}). Reason: ${reason}`);
    });

    // ✅ SUPPORT TICKET HANDLERS
    socket.on('joinSupportTicket', ({ ticketId }) => {
      const room = `support_ticket_${ticketId}`;
      socket.join(room);
      logger.info(`🎧 Admin ${userName} joined support room: ${room}`);
    });

    socket.on(
      'sendSupportMessage',
      async (data: { ticketId: string; senderId: string; senderType: string; message: string }) => {
        console.log('Received support message via socket:', data);
        const { ticketId, senderId, senderType, message } = data;
        const room = `support_ticket_${ticketId}`;

        try {
          // 1. Broadcast to other admin sockets in the same room
          socket.to(room).emit('receiveSupportMessage', {
            ...data,
            id: Date.now().toString(), // Temporary ID for immediate feedback
            created_at: new Date().toISOString(),
          });

          // 2. Notify User Backend via Redis pub/sub
          notifyUserBackend('SUPPORT_MESSAGE_FROM_ADMIN', data);

          logger.info(`📬 Forwarded support message for ticket ${ticketId} to User Backend`);
        } catch (err) {
          logger.error(`Failed to handle sendSupportMessage: ${err}`);
        }
      }
    );

    socket.on('error', (error) => {
      logger.error(`Socket error (${socket.id}):`, error);
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

/**
 * Send a message to a specific user (all their active sockets).
 * @param userId - The ID of the user to send the message to.
 * @param event - The event name.
 * @param data - The data to send.
 */
export const sendToUser = (userId: string, event: string, data: any) => {
  if (!io) return;

  const socketIds = userSocketMap.get(userId);
  if (socketIds && socketIds.size > 0) {
    logger.info(`Sending '${event}' to User ${userId} (${socketIds.size} active sockets)`);
    socketIds.forEach((socketId) => {
      io?.to(socketId).emit(event, data);
    });
  } else {
    logger.warn(`Attempted to send '${event}' to User ${userId}, but no active sockets found.`);
  }
};

/**
 * Send a message to a specific socket ID.
 * @param socketId - The specific socket ID.
 * @param event - The event name.
 * @param data - The data to send.
 */
export const sendToSocket = (socketId: string, event: string, data: any) => {
  if (!io) return;
  logger.info(`Sending '${event}' to Socket ${socketId}`);
  io.to(socketId).emit(event, data);
};

// notifyUserBackend now lives in shared/eventBus.ts (Redis pub/sub); it is
// imported above for the in-process support-message forwarding.
