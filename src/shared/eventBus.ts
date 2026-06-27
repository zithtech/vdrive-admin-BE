import { Server } from 'socket.io';
import { logger } from './logger';
import { getRedisClient, getSubClient } from './redis';

/**
 * Backend ↔ backend event bus over Redis pub/sub.
 *
 * Replaces the old Socket.IO `/internal` bridge between admin-BE and user-BE.
 *  - `admin_be:to_user`  : admin-BE publishes  → user-BE subscribes
 *  - `user_be:to_admin`  : user-BE  publishes  → admin-BE subscribes (this file)
 *
 * Messages are enveloped as { event, data, ts }. Plain pub/sub is fire-and-forget
 * (at-most-once) — fine for the notification-style events carried here.
 */
export const CHANNEL_TO_USER = 'admin_be:to_user';
export const CHANNEL_TO_ADMIN = 'user_be:to_admin';

interface BusMessage {
  event: string;
  data: any;
  ts: number;
}

/**
 * Publish an event to the user backend. Drop-in replacement for the old
 * socket-based notifyUserBackend(event, data) — same signature, same call sites.
 */
export const notifyUserBackend = (event: string, data: any): void => {
  try {
    const payload: BusMessage = { event, data, ts: Date.now() };
    // PUBLISH runs on the main command client (publishing does NOT switch a
    // connection into subscriber mode — only SUBSCRIBE does).
    getRedisClient().publish(CHANNEL_TO_USER, JSON.stringify(payload));
    logger.info(`[bus] → user-BE: ${event}`);
  } catch (err) {
    logger.error(`[bus] Failed to publish '${event}' to user backend:`, err);
  }
};

/**
 * Subscribe to events coming FROM the user backend and forward them to the
 * admin UI (admin room / support-ticket rooms). Reproduces the handlers that
 * used to live in the `/internal` Socket.IO namespace.
 */
export const initUserEventSubscriber = (io: Server): void => {
  let sub;
  try {
    sub = getSubClient();
  } catch (err) {
    logger.error('[bus] Cannot init user event subscriber — Redis subClient unavailable:', err);
    return;
  }

  sub.subscribe(CHANNEL_TO_ADMIN, (err) => {
    if (err) {
      logger.error(`[bus] Failed to subscribe to ${CHANNEL_TO_ADMIN}:`, err.message);
      return;
    }
    logger.info(`✅ [bus] Subscribed to ${CHANNEL_TO_ADMIN} (events from user backend)`);
  });

  sub.on('message', (channel, raw) => {
    if (channel !== CHANNEL_TO_ADMIN) return;

    let msg: BusMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      logger.error(`[bus] Dropping malformed message on ${channel}: ${raw}`);
      return;
    }

    const { event, data } = msg;
    try {
      dispatchToAdmin(io, event, data);
    } catch (err) {
      logger.error(`[bus] Error dispatching '${event}' to admin UI:`, err);
    }
  });
};

const dispatchToAdmin = (io: Server, event: string, data: any): void => {
  switch (event) {
    case 'NEW_TRIP':
      io.to('admin').emit('ADMIN_NEW_TRIP_ALERT', data);
      break;
    case 'NEW_USER_CREATED':
      io.to('admin').emit('ADMIN_NEW_USER_CREATED', data);
      break;
    case 'NEW_ORDER':
      io.to('admin').emit('ADMIN_NEW_ORDER_ALERT', data);
      break;
    case 'TRIP_ACCEPTED':
      io.to('admin').emit('ADMIN_TRIP_ACCEPTED', data);
      break;
    case 'TRIP_STATUS_UPDATE':
      io.to('admin').emit('ADMIN_TRIP_STATUS_UPDATE', data);
      break;
    case 'TRIP_VERIFICATION_REQUESTED':
      io.to('admin').emit('ADMIN_TRIP_VERIFICATION_REQUESTED', data);
      break;
    case 'TRIP_VERIFICATION_APPROVED':
      io.to('admin').emit('ADMIN_TRIP_VERIFICATION_APPROVED', data);
      break;
    case 'TRIP_VERIFICATION_REJECTED':
      io.to('admin').emit('ADMIN_TRIP_VERIFICATION_REJECTED', data);
      break;
    case 'DRIVER_LOCATION_UPDATE':
      io.to('admin').emit('ADMIN_DRIVER_LOCATION', data);
      break;
    // Previously published to driver_status_channel with no subscriber — now wired.
    case 'DRIVER_STATUS_UPDATE':
      io.to('admin').emit('ADMIN_DRIVER_STATUS', data);
      break;
    case 'AGENT_REQUESTED':
      io.to('admin').emit('ADMIN_SUPPORT_TICKET_ALERT', data);
      break;
    case 'USER_AGENT_REQUESTED':
      io.to('admin').emit('ADMIN_SUPPORT_USER_TICKET_ALERT', data);
      break;
    case 'SUPPORT_TICKET_CLOSED':
      io.to(`support_ticket_${data?.ticketId}`).emit('TICKET_STATUS_UPDATE', {
        ticketId: data?.ticketId,
        status: 'closed',
      });
      io.to('admin').emit('ADMIN_SUPPORT_TICKET_CLOSED', data);
      break;
    case 'USER_SUPPORT_TICKET_CLOSED':
      io.to(`support_ticket_${data?.ticketId}`).emit('TICKET_STATUS_UPDATE', {
        ticketId: data?.ticketId,
        status: 'closed',
      });
      io.to('admin').emit('ADMIN_USER_SUPPORT_TICKET_CLOSED', data);
      break;
    case 'SUPPORT_MESSAGE_FROM_DRIVER':
      io.to(`support_ticket_${data?.ticketId}`).emit('receiveSupportMessage', data);
      io.to('admin').emit('ADMIN_SUPPORT_MESSAGE_NOTIFICATION', data);
      break;
    case 'SUPPORT_MESSAGE_FROM_USER':
      io.to(`support_ticket_${data?.ticketId}`).emit('receiveSupportMessage', data);
      io.to('admin').emit('ADMIN_USER_SUPPORT_MESSAGE_NOTIFICATION', data);
      break;
    case 'driver_event':
      io.emit('driver_event', { ...data, timestamp: new Date().toISOString() });
      break;
    default:
      logger.warn(`[bus] Unhandled event from user backend: '${event}'`);
  }
};
