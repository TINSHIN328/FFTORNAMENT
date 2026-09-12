import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from './database/index.js';
import { requireAuth, requireAdmin, asyncHandler, logAdminAction } from './middleware/index.js';

export const walletRouter = Router();
const COIN_RATE = Number(process.env.COIN_RATE_PKR || 4);
const MIN_WITHDRAWAL = Number(process.env.MIN_WITHDRAWAL_COINS || 50);

function cleanAccount(value: unknown) {
  return String(value || '').replace(/\s+/g, '').trim();
}

walletRouter.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [users] = await pool.query<any[]>('SELECT coins_balance FROM users WHERE id = ?', [req.session!.userId]);
  if (!users.length) return res.status(404).json({ success: false, message: 'User not found.' });
  const [transactions] = await pool.query<any[]>(
    `SELECT id,type,coins,rupees,status,payment_method,transaction_ref,easypaisa_account,note,created_at
     FROM coin_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50`, [req.session!.userId]
  );
  res.json({ success: true, data: { balance: Number(users[0].coins_balance || 0), rate: COIN_RATE, minWithdrawal: MIN_WITHDRAWAL, transactions } });
}));

walletRouter.post('/purchase', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const coins = Number(req.body?.coins);
  const senderName = String(req.body?.senderName || '').trim();
  const account = cleanAccount(req.body?.easypaisaAccount);
  const transactionRef = String(req.body?.transactionRef || '').trim();
  if (!Number.isFinite(coins) || coins <= 0 || coins > 100000) return res.status(400).json({ success: false, message: 'Enter a valid coin amount.' });
  if (!account) return res.status(400).json({ success: false, message: 'Easypaisa sender/account number is required.' });
  if (!transactionRef) return res.status(400).json({ success: false, message: 'Easypaisa transaction reference is required.' });
  const rupees = coins * COIN_RATE;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const txId = uuidv4();
    const purchaseId = uuidv4();
    await conn.query(`INSERT INTO coin_transactions (id,user_id,type,coins,rupees,status,payment_method,transaction_ref,easypaisa_account,note) VALUES (?,?,?,?,?,'PENDING','EASYPAISA',?,?,?)`,
      [txId, req.session!.userId, 'PURCHASE', coins, rupees, transactionRef, account, `Purchase request: ${coins} coins`]);
    await conn.query(`INSERT INTO coin_purchases (id,transaction_id,user_id,coins,rupees,easypaisa_account,sender_name,transaction_ref) VALUES (?,?,?,?,?,?,?,?)`,
      [purchaseId, txId, req.session!.userId, coins, rupees, account, senderName || null, transactionRef]);
    await conn.commit();
    res.status(201).json({ success: true, message: 'Purchase submitted. Admin will verify your Easypaisa payment before coins are added.', data: { id: txId, coins, rupees, status: 'PENDING' } });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

walletRouter.post('/withdraw', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const coins = Number(req.body?.coins);
  const account = cleanAccount(req.body?.easypaisaAccount);
  const accountName = String(req.body?.accountName || '').trim();
  if (!Number.isFinite(coins) || coins < MIN_WITHDRAWAL) return res.status(400).json({ success: false, message: `Minimum withdrawal is ${MIN_WITHDRAWAL} coins.` });
  if (!Number.isInteger(coins)) return res.status(400).json({ success: false, message: 'Withdrawal coins must be a whole number.' });
  if (!account) return res.status(400).json({ success: false, message: 'Easypaisa receiving number is required.' });
  const rupees = coins * COIN_RATE;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [users] = await conn.query<any[]>('SELECT coins_balance FROM users WHERE id=? FOR UPDATE', [req.session!.userId]);
    const balance = Number(users[0]?.coins_balance || 0);
    if (balance < coins) { await conn.rollback(); return res.status(400).json({ success: false, message: `Insufficient balance. You have ${balance} coins.` }); }
    const txId = uuidv4();
    await conn.query('UPDATE users SET coins_balance = coins_balance - ? WHERE id=?', [coins, req.session!.userId]);
    await conn.query(`INSERT INTO coin_transactions (id,user_id,type,coins,rupees,status,payment_method,easypaisa_account,note) VALUES (?,?,?,?,?,'PENDING','EASYPAISA',?,?)`,
      [txId, req.session!.userId, 'WITHDRAWAL', coins, rupees, account, `Withdrawal request for ${coins} coins`]);
    await conn.query(`INSERT INTO coin_withdrawals (id,transaction_id,user_id,coins,rupees,easypaisa_account,account_name) VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), txId, req.session!.userId, coins, rupees, account, accountName || null]);
    await conn.commit();
    res.status(201).json({ success: true, message: `Withdrawal request submitted for Rs ${rupees}.`, data: { id: txId, coins, rupees, status: 'PENDING' } });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

walletRouter.get('/admin/requests', requireAuth, requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query<any[]>(`SELECT ct.*,u.username,u.name,u.email,cp.easypaisa_account AS purchase_account,cp.sender_name,cp.transaction_ref AS purchase_ref,cw.easypaisa_account AS withdrawal_account,cw.account_name
    FROM coin_transactions ct JOIN users u ON u.id=ct.user_id
    LEFT JOIN coin_purchases cp ON cp.transaction_id=ct.id
    LEFT JOIN coin_withdrawals cw ON cw.transaction_id=ct.id
    WHERE ct.status='PENDING' OR (ct.type='WITHDRAWAL' AND ct.status='APPROVED') ORDER BY ct.created_at ASC`);
  res.json({ success: true, data: rows });
}));

walletRouter.post('/admin/:id/review', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const action = String(req.body?.action || '').toUpperCase();
  const note = String(req.body?.note || '').trim();
  if (!['APPROVE','REJECT','PAID'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid review action.' });
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>('SELECT * FROM coin_transactions WHERE id=? FOR UPDATE', [req.params.id]);
    const tx = rows[0];
    if (!tx) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Transaction not found.' }); }
    if (action === 'PAID') {
      if (tx.type !== 'WITHDRAWAL' || !['PENDING','APPROVED'].includes(tx.status)) { await conn.rollback(); return res.status(400).json({ success: false, message: 'This withdrawal cannot be marked paid.' }); }
    } else if (tx.status !== 'PENDING') { await conn.rollback(); return res.status(400).json({ success: false, message: 'This request has already been reviewed.' }); }
    if (tx.type === 'PURCHASE') {
      if (action === 'APPROVE') {
        await conn.query('UPDATE users SET coins_balance=coins_balance+? WHERE id=?', [Number(tx.coins), tx.user_id]);
        await conn.query(`UPDATE coin_transactions SET status='APPROVED',reviewed_by=?,reviewed_at=NOW(),note=? WHERE id=?`, [req.session!.userId, note || 'Easypaisa payment verified.', tx.id]);
        await conn.query(`UPDATE coin_purchases SET status='APPROVED',admin_note=? WHERE transaction_id=?`, [note || null, tx.id]);
      } else {
        await conn.query(`UPDATE coin_transactions SET status='REJECTED',reviewed_by=?,reviewed_at=NOW(),note=? WHERE id=?`, [req.session!.userId, note || 'Purchase rejected.', tx.id]);
        await conn.query(`UPDATE coin_purchases SET status='REJECTED',admin_note=? WHERE transaction_id=?`, [note || null, tx.id]);
      }
    } else if (tx.type === 'WITHDRAWAL') {
      if (action === 'APPROVE' || action === 'PAID') {
        const status = action === 'PAID' ? 'COMPLETED' : 'APPROVED';
        await conn.query(`UPDATE coin_transactions SET status=?,reviewed_by=?,reviewed_at=NOW(),note=? WHERE id=?`, [status, req.session!.userId, note || 'Withdrawal approved.', tx.id]);
        await conn.query(`UPDATE coin_withdrawals SET status=?,admin_note=? WHERE transaction_id=?`, [action === 'PAID' ? 'PAID' : 'APPROVED', note || null, tx.id]);
      } else {
        await conn.query('UPDATE users SET coins_balance=coins_balance+? WHERE id=?', [Number(tx.coins), tx.user_id]);
        await conn.query(`UPDATE coin_transactions SET status='REJECTED',reviewed_by=?,reviewed_at=NOW(),note=? WHERE id=?`, [req.session!.userId, note || 'Withdrawal rejected; coins returned.', tx.id]);
        await conn.query(`UPDATE coin_withdrawals SET status='REJECTED',admin_note=? WHERE transaction_id=?`, [note || null, tx.id]);
      }
    }
    await conn.commit();
    await logAdminAction(req.session!.userId, `COIN_${action}`, 'coin_transaction', tx.id, { type: tx.type, coins: tx.coins });
    res.json({ success: true, message: 'Request reviewed.' });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
