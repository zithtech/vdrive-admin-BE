import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import { logger } from '../shared/logger';
import { AuthRepository } from '../modules/auth/auth.repository';

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

  const internalNsp = io.of('/internal');

  // ✅ Auth middleware for internal namespace — runs before connection
  internalNsp.use((socket, next) => {
    if (socket.handshake.auth.token === process.env.INTERNAL_SERVICE_SECRET) {
      next();
    } else {
      logger.warn(`Internal namespace connection rejected: Invalid token. ID: ${socket.id}`);
      next(new Error('Unauthorized'));
    }
  });

  internalNsp.on('connection', (socket) => {
    logger.info(`✅ User Backend connected via /internal. Socket ID: ${socket.id}`);

    // ✅ User backend notifies admin of a new trip
    socket.on('NEW_TRIP', (tripData) => {
      logger.info('New trip received from User Backend, forwarding to admin UI:', tripData);
      // ✅ Forward to all sockets in the 'admin' room
      if (io) {
        io.to('admin').emit('ADMIN_NEW_TRIP_ALERT', tripData);
      }
    });
    socket.on('NEW_USER_CREATED', (userData) => {
      logger.info('New user created received from User Backend, forwarding to admin UI:', userData);
      // ✅ Forward to all sockets in the 'admin' room
      if (io) {
        io.to('admin').emit('ADMIN_NEW_USER_CREATED', userData);
      }
    });

    // ✅ User backend notifies admin of a new order
    socket.on('NEW_ORDER', (data) => {
      logger.info('New order received from User Backend:', data);
      if (io) {
        io.to('admin').emit('ADMIN_NEW_ORDER_ALERT', data);
      }
    });

    // ✅ User backend notifies admin of a trip acceptance
    socket.on('TRIP_ACCEPTED', (data) => {
      logger.info('Trip accepted, forwarding to admin UI:', data);
      if (io) {
        io.to('admin').emit('ADMIN_TRIP_ACCEPTED', data);
      }
    });

    // ✅ User backend notifies admin of a general trip status update
    socket.on('TRIP_STATUS_UPDATE', (data) => {
      logger.info('Trip status updated, forwarding to admin UI:', data);
      if (io) {
        io.to('admin').emit('ADMIN_TRIP_STATUS_UPDATE', data);
      }
    });

    // ✅ User backend notifies admin of trip verification request
    socket.on('TRIP_VERIFICATION_REQUESTED', (data) => {
      logger.info('Trip verification requested, forwarding to admin UI:', data);
      if (io) {
        io.to('admin').emit('ADMIN_TRIP_VERIFICATION_REQUESTED', data);
      }
    });

    // ✅ User backend notifies admin of trip verification approved
    socket.on('TRIP_VERIFICATION_APPROVED', (data) => {
      logger.info('Trip verification approved, forwarding to admin UI:', data);
      if (io) {
        io.to('admin').emit('ADMIN_TRIP_VERIFICATION_APPROVED', data);
      }
    });

    // ✅ User backend notifies admin of trip verification rejected
    socket.on('TRIP_VERIFICATION_REJECTED', (data) => {
      logger.info('Trip verification rejected, forwarding to admin UI:', data);
      if (io) {
        io.to('admin').emit('ADMIN_TRIP_VERIFICATION_REJECTED', data);
      }
    });

    // ✅ User backend notifies admin of a driver location update
    socket.on('DRIVER_LOCATION_UPDATE', (data) => {
      if (io) {
        io.to('admin').emit('ADMIN_DRIVER_LOCATION', data);
      }
    });

    // ✅ Support Ticket Handlers from User-Driver-API
    socket.on('AGENT_REQUESTED', (ticketData) => {
      logger.info('New agent request received from User Backend:', ticketData);
      if (io) {
        // Notify all admins about the new ticket
        io.to('admin').emit('ADMIN_SUPPORT_TICKET_ALERT', ticketData);
      }
    });

    socket.on('SUPPORT_TICKET_CLOSED', (data) => {
      logger.info('Support ticket closed by driver:', data);
      if (io) {
        const { ticketId } = data;
        // Notify the specific ticket room and all admins
        io.to(`support_ticket_${ticketId}`).emit('TICKET_STATUS_UPDATE', { ticketId, status: 'closed' });
        io.to('admin').emit('ADMIN_SUPPORT_TICKET_CLOSED', data);
      }
    });

    socket.on('SUPPORT_MESSAGE_FROM_DRIVER', (messageData) => {
      logger.info('New support message from driver received:', messageData);
      if (io) {
        const { ticketId } = messageData;
        // Broadcast to all admins in the ticket room
        io.to(`support_ticket_${ticketId}`).emit('receiveSupportMessage', messageData);
        // Also notify general admin room for a sidebar update/notification
        io.to('admin').emit('ADMIN_SUPPORT_MESSAGE_NOTIFICATION', messageData);
      }
    });

    // ✅ Generic request/response from user backend
    socket.on('request', (data, callback) => {
      callback({ status: 'received', data });
    });

    socket.on('disconnect', (reason) => {
      logger.warn(`User Backend disconnected from /internal. Reason: ${reason}`);
    });
  });

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

  // Internal namespace for service-to-service communication (e.g., from vDrive-User-Driver-API)
  const internalNamespace = io.of('/internal');
  internalNamespace.use((socket: Socket, next: (err?: any) => void) => {
    const token = socket.handshake.auth.token;
    if (token && token === config.internalServiceSecret) {
      next();
    } else {
      logger.warn(`Internal socket connection rejected: Invalid or missing token. ID: ${socket.id}`);
      next(new Error('Authentication failed: Invalid internal token'));
    }
  });

  internalNamespace.on('connection', (socket: Socket) => {
    logger.info(`🔌 Internal service socket connected: ${socket.id}`);

    // Listen for events from internal services
    socket.on('driver_event', (data: any) => {
      logger.info('Received driver event via internal socket:', data);
      // You can broadcast this to all admin users if needed
      io?.emit('driver_event', { ...data, timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(`❌ Internal service socket disconnected: ${socket.id}. Reason: ${reason}`);
    });
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
    socket.on("JOIN_ADMIN_ROOM", () => {
      socket.join("admin");

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

    socket.on('sendSupportMessage', async (data: { ticketId: string; senderId: string; senderType: string; message: string }) => {
      const { ticketId, senderId, senderType, message } = data;
      const room = `support_ticket_${ticketId}`;

      try {
        // 1. Broadcast to other admin sockets in the same room
        socket.to(room).emit('receiveSupportMessage', {
          ...data,
          id: Date.now().toString(), // Temporary ID for immediate feedback
          created_at: new Date().toISOString()
        });

        // 2. Notify User Backend via /internal namespace
        const internalNsp = io?.of('/internal');
        internalNsp?.emit('SUPPORT_MESSAGE_FROM_ADMIN', data);

        logger.info(`📬 Forwarded support message for ticket ${ticketId} to User Backend`);
      } catch (err) {
        logger.error(`Failed to handle sendSupportMessage: ${err}`);
      }
    });

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

export const notifyUserBackend = (event: string, data: any) => {
  if (!io) return;
  const internalNsp = io.of('/internal');
  logger.info(`Notifying User Backend: event='${event}'`);
  internalNsp.emit(event, data);
};