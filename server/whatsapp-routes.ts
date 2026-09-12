import { Router, Request, Response } from 'express';
import { getPool } from './database/index.js';
import { requireAuth, requireAdmin, asyncHandler } from './middleware/index.js';
import { getWhatsAppDestination, getWhatsAppStatus, listWhatsAppChats, selectWhatsAppDestination, sendWhatsAppMessage, startWhatsApp, disconnectWhatsApp } from './whatsapp.js';

export const whatsappRouter = Router();
whatsappRouter.use(requireAuth, requireAdmin);

whatsappRouter.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query<any[]>('SELECT destination_id,destination_name,destination_type FROM whatsapp_config WHERE id=1');
  const saved = rows[0];
  const data = getWhatsAppStatus();
  if (!data.destination && saved?.destination_id) data.destination = { id: saved.destination_id, name: saved.destination_name, type: saved.destination_type, unreadCount: 0 } as any;
  res.json({ success: true, data });
}));

whatsappRouter.post('/connect', asyncHandler(async (_req: Request, res: Response) => {
  await startWhatsApp();
  res.json({ success: true, data: getWhatsAppStatus() });
}));

whatsappRouter.post('/disconnect', asyncHandler(async (req: Request, res: Response) => {
  await disconnectWhatsApp(Boolean(req.body?.logout));
  res.json({ success: true, data: getWhatsAppStatus() });
}));

whatsappRouter.get('/chats', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await listWhatsAppChats() });
}));

whatsappRouter.post('/destination', asyncHandler(async (req: Request, res: Response) => {
  const { id, name, type } = req.body || {};
  if (!id || !name || !['GROUP', 'CHANNEL', 'CHAT'].includes(type)) return res.status(400).json({ success: false, message: 'Valid destination is required.' });
  selectWhatsAppDestination({ id, name, type, unreadCount: 0 });
  const pool = getPool();
  await pool.query('UPDATE whatsapp_config SET destination_id=?,destination_name=?,destination_type=?,enabled=TRUE WHERE id=1', [id,name,type]);
  res.json({ success: true, data: getWhatsAppDestination() });
}));

whatsappRouter.post('/send', asyncHandler(async (req: Request, res: Response) => {
  const { message, destinationId } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required.' });
  const result = await sendWhatsAppMessage(message.trim(), destinationId);
  res.json({ success: true, data: result });
}));
