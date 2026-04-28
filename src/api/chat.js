/**
 * VUMA Store — Chat API
 * Chat rooms, messages, support tickets
 */

import { get, post, del } from './client';
import { API } from '../utils/constants';

export const chatAPI = {

  // ══════════════════════════════════════════════════
  // CHAT ROOMS
  // ══════════════════════════════════════════════════

  /**
   * Get all my chat rooms
   */
  getRooms: () => get(API.CHAT_ROOMS),

  /**
   * Create or get chat room
   * data = {
   *   room_type: 'customer_support' | 'customer_vendor',
   *   vendor_id,           // for customer_vendor
   *   related_order_id,    // optional
   *   related_product_id,  // optional
   *   initial_message      // optional
   * }
   */
  createRoom: (data) =>
    post(API.CHAT_ROOM_CREATE, {
      room_type: data.room_type || 'customer_support',
      vendor_id: data.vendor_id || undefined,
      related_order_id: data.related_order_id || undefined,
      related_product_id:
        data.related_product_id || undefined,
      initial_message: data.initial_message || '',
    }),

  /**
   * Get chat room detail
   */
  getRoomDetail: (roomId) =>
    get(API.CHAT_ROOM_DETAIL(roomId)),

  /**
   * Get message history for a room
   */
  getMessages: (roomId, { before = '', limit = 50 } = {}) => {
    const params = { limit };
    if (before) params.before = before;
    return get(API.CHAT_ROOM_MESSAGES(roomId), params);
  },

  /**
   * Send message (HTTP fallback — use WebSocket for real-time)
   */
  sendMessage: (roomId, content, messageType = 'text') =>
    post(API.CHAT_ROOM_SEND(roomId), {
      content,
      message_type: messageType,
    }),

  /**
   * Close chat room
   */
  closeRoom: (roomId) =>
    post(`/chat/rooms/${roomId}/close/`),

  // ══════════════════════════════════════════════════
  // SUPPORT TICKETS
  // ══════════════════════════════════════════════════

  /**
   * Get my support tickets
   */
  getTickets: ({ status = '' } = {}) => {
    const params = {};
    if (status) params.status = status;
    return get(API.SUPPORT_TICKETS, params);
  },

  /**
   * Create support ticket
   * data = {
   *   subject, category, description,
   *   priority, related_order_id
   * }
   */
  createTicket: (data) =>
    post(API.SUPPORT_TICKET_CREATE, {
      subject: data.subject,
      category: data.category || 'general',
      description: data.description,
      priority: data.priority || 'medium',
      related_order_id: data.related_order_id || undefined,
    }),

  /**
   * Close ticket
   */
  closeTicket: (ticketId) =>
    post(`/chat/tickets/${ticketId}/close/`),

  // ══════════════════════════════════════════════════
  // WEBSOCKET HELPERS
  // ══════════════════════════════════════════════════

  /**
   * Build WebSocket URL for a room
   */
  getWebSocketUrl: (roomId, accessToken) =>
    `${API.WS_CHAT(roomId)}?token=${accessToken}`,
};