import { Router, Request, Response } from 'express';
import { getPool } from '../database/index.js';
import { requireAuth, requireAdmin, asyncHandler, logAdminAction } from '../middleware/index.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { getWhatsAppDestination, sendWhatsAppMessage, sendWhatsAppDirectMessage, editWhatsAppMessage, normalizeWhatsAppPhone } from '../whatsapp.js';

// Auth Routes
export const authRouter = Router();

authRouter.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, email, name, username, avatar_url, role, status, bio, created_at, last_login FROM users WHERE id = ?', [req.session!.userId]);
  if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: rows[0] });
}));

authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password, otpVerificationId, otp } = req.body || {};

  console.log('[LOGIN TRACE]', {
    username: String(username || '').trim(),
    hasOtpVerificationId: Boolean(otpVerificationId),
    otpVerificationId: otpVerificationId ? String(otpVerificationId) : null,
    hasOtp: Boolean(otp),
    otpLength: String(otp || '').length
  });
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [String(username || '').trim()]);
  if (!Array.isArray(rows) || rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const user = rows[0] as any;
  if (user.status === 'BANNED') return res.status(403).json({ success: false, message: 'Account is banned' });
  const valid = Boolean(user.password_hash) && await bcrypt.compare(String(password || ''), user.password_hash);
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const needsOtp = Number(user.otp_login_enabled ?? 1) === 1 && Boolean(user.phone_number);
  if (needsOtp && !otpVerificationId) {
    await pool.query('DELETE FROM login_otps WHERE expires_at <= NOW()');
    const [recent] = await pool.query<any[]>('SELECT created_at FROM login_otps WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [user.id]);
    if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60_000) {
      return res.status(429).json({ success:false, message:'Please wait 60 seconds before requesting another OTP.' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const id = uuidv4();
    const hash = await bcrypt.hash(code, 10);
    await pool.query(`INSERT INTO login_otps (id,user_id,phone_number,code_hash,expires_at) VALUES (?,?,?,?,DATE_ADD(NOW(),INTERVAL 10 MINUTE))`, [id,user.id,user.phone_number,hash]);
    try {
      await sendWhatsAppDirectMessage(user.phone_number, `🔐 *ZyroBattle Login Verification*\n\nYour login OTP is: *${code}*\n\nThis code expires in 10 minutes.`);
    } catch (error:any) {
      await pool.query('DELETE FROM login_otps WHERE id=?', [id]);
      return res.status(503).json({ success:false, message:error?.message || 'WhatsApp admin account is not connected.' });
    }
    return res.json({ success:true, requiresOtp:true, verificationId:id, phoneNumber:user.phone_number });
  }

  if (needsOtp) {
    if (!otpVerificationId || !/^\d{6}$/.test(String(otp || ''))) return res.status(400).json({ success:false, message:'Enter the 6-digit OTP.' });
    console.log('[OTP VERIFY TRACE] Looking for OTP:', {
      verificationId: String(otpVerificationId),
      userId: user.id
    });

    const [otpRows] = await pool.query<any[]>(
      'SELECT * FROM login_otps WHERE id=? AND user_id=? AND expires_at > NOW() LIMIT 1',
      [otpVerificationId,user.id]
    );

    console.log('[OTP VERIFY TRACE] Rows found:', otpRows.length);
    const pending=otpRows[0];
    if (!pending) {
      const [expiredRows] = await pool.query<any[]>(
        'SELECT id,verified_at,expires_at FROM login_otps WHERE id=? AND user_id=? LIMIT 1',
        [otpVerificationId,user.id]
      );
      if (!expiredRows.length) {
        return res.status(400).json({ success:false,message:'OTP request not found. Please login again.' });
      }
      if (expiredRows[0].verified_at) {
        return res.status(400).json({ success:false,message:'This OTP has already been used. Please login again.' });
      }
      return res.status(400).json({ success:false,message:'OTP expired. Please request a new OTP.' });
    }
    if (Number(pending.attempts) >= 5) return res.status(429).json({ success:false,message:'Too many incorrect OTP attempts. Please login again.' });
    if (!await bcrypt.compare(String(otp), pending.code_hash)) {
      await pool.query('UPDATE login_otps SET attempts=attempts+1 WHERE id=?',[otpVerificationId]);
      return res.status(400).json({ success:false,message:'Invalid OTP.' });
    }
    await pool.query('UPDATE login_otps SET verified_at=NOW() WHERE id=?',[otpVerificationId]);
    await pool.query('DELETE FROM login_otps WHERE id=?',[otpVerificationId]);
  }

  req.session!.userId = user.id;
  req.session!.userRole = user.role;
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, status:user.status, phone_number:user.phone_number, otp_login_enabled:Number(user.otp_login_enabled ?? 1) === 1 } });
}));

authRouter.post('/request-registration-otp', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, username, password, phoneNumber } = req.body || {};
  const phone = normalizeWhatsAppPhone(String(phoneNumber || ''));
  if (!name?.trim() || !email?.trim() || !username?.trim() || !password || password.length < 6 || !phone) {
    return res.status(400).json({ success: false, message: 'Name, email, username, password (6+ characters) and WhatsApp number are required.' });
  }
  if (!/^92\d{10}$/.test(phone)) return res.status(400).json({ success: false, message: 'Enter a valid Pakistani WhatsApp number, e.g. 03001234567.' });

  const pool = getPool();
  const [existing] = await pool.query<any[]>('SELECT id FROM users WHERE email = ? OR username = ? OR phone_number = ? LIMIT 1', [email.trim(), username.trim(), phone]);
  if (existing.length) return res.status(409).json({ success: false, message: 'Email, username or WhatsApp number is already registered.' });

  const [recent] = await pool.query<any[]>('SELECT created_at FROM registration_otps WHERE phone_number=? ORDER BY created_at DESC LIMIT 1', [phone]);
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60_000) {
    return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting another OTP.' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  await pool.query('DELETE FROM registration_otps WHERE phone_number=? OR expires_at < NOW()', [phone]);
  await pool.query(
    `INSERT INTO registration_otps (id,phone_number,name,email,username,password_hash,code_hash,expires_at)
     VALUES (?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 10 MINUTE))`,
    [id, phone, name.trim(), email.trim(), username.trim(), passwordHash, codeHash]
  );

  const message = `🔐 *ZyroBattle Verification*\n\nYour registration OTP is: *${code}*\n\nThis code expires in 10 minutes.\nIf you did not request this, ignore this message.`;
  try {
    await sendWhatsAppDirectMessage(phone, message);
  } catch (error: any) {
    await pool.query('DELETE FROM registration_otps WHERE id=?', [id]);
    return res.status(503).json({ success: false, message: error?.message || 'WhatsApp admin account is not connected. Please try again later.' });
  }
  res.json({ success: true, message: 'OTP sent to your WhatsApp number.', verificationId: id });
}));

authRouter.post('/verify-registration-otp', asyncHandler(async (req: Request, res: Response) => {
  const { verificationId, otp } = req.body || {};
  if (!verificationId || !/^\d{6}$/.test(String(otp || ''))) return res.status(400).json({ success: false, message: 'Enter the 6-digit OTP.' });
  const pool = getPool();
  const [rows] = await pool.query<any[]>('SELECT * FROM registration_otps WHERE id=? LIMIT 1', [verificationId]);
  if (!rows.length) return res.status(400).json({ success: false, message: 'OTP request not found. Please request a new OTP.' });
  const pending = rows[0];
  if (pending.verified_at) return res.status(400).json({ success: false, message: 'This OTP has already been used.' });

  const [expiryCheck] = await pool.query<any[]>(
    'SELECT id FROM registration_otps WHERE id=? AND expires_at > NOW() LIMIT 1',
    [verificationId]
  );
  if (!expiryCheck.length) {
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }
  if (Number(pending.attempts) >= 5) return res.status(429).json({ success: false, message: 'Too many incorrect OTP attempts. Please request a new OTP.' });

  const valid = await bcrypt.compare(String(otp), pending.code_hash);
  if (!valid) {
    await pool.query('UPDATE registration_otps SET attempts=attempts+1 WHERE id=?', [verificationId]);
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  const [existing] = await pool.query<any[]>('SELECT id FROM users WHERE email=? OR username=? OR phone_number=? LIMIT 1', [pending.email, pending.username, pending.phone_number]);
  if (existing.length) {
    await pool.query('DELETE FROM registration_otps WHERE id=?', [verificationId]);
    return res.status(409).json({ success: false, message: 'Email, username or WhatsApp number is already registered.' });
  }

  const userId = uuidv4();
  await pool.query(
    `INSERT INTO users (id,email,name,username,password_hash,phone_number,status,role) VALUES (?,?,?,?,?,?, 'ACTIVE','USER')`,
    [userId,pending.email,pending.name,pending.username,pending.password_hash,pending.phone_number]
  );
  await pool.query('UPDATE registration_otps SET verified_at=NOW() WHERE id=?', [verificationId]);
  await pool.query('DELETE FROM registration_otps WHERE id=?', [verificationId]);
  req.session!.userId = userId;
  req.session!.userRole = 'USER';
  res.status(201).json({ success:true, data:{ id:userId,email:pending.email,name:pending.name,username:pending.username,phone_number:pending.phone_number,role:'USER' } });
}));

// Legacy direct registration is intentionally disabled so every new account verifies WhatsApp first.
authRouter.post('/register', asyncHandler(async (_req: Request, res: Response) => {
  res.status(410).json({ success:false, message:'WhatsApp verification is required. Request an OTP first.' });
}));

authRouter.get('/admin-exists', asyncHandler(async (_req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = \'ADMIN\'');
  res.json({ success: true, exists: Number((rows as any)[0]?.total || 0) > 0 });
}));

authRouter.post('/register-admin', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password || password.length < 6) return res.status(400).json({ success: false, message: 'Name, email, username and a 6+ character password are required.' });
  const pool = getPool();
  const [admins] = await pool.query('SELECT id FROM users WHERE role = \'ADMIN\' LIMIT 1');
  if (Array.isArray(admins) && admins.length) return res.status(409).json({ success: false, message: 'An administrator already exists.' });
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email, username]);
  if (Array.isArray(existing) && existing.length) return res.status(409).json({ success: false, message: 'Email or username already exists.' });
  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);
  await pool.query('INSERT INTO users (id, email, name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?, \'ADMIN\', \'ACTIVE\')', [id, email, name, username, password_hash]);
  req.session!.userId = id; req.session!.userRole = 'ADMIN';
  res.status(201).json({ success: true, data: { id, email, name, username, role: 'ADMIN' } });
}));

authRouter.post('/logout', (req: Request, res: Response) => {
  req.session?.destroy(() => {});
  res.json({ success: true, message: 'Logged out' });
});

// Google OAuth
authRouter.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !callbackUrl) return res.status(500).json({ success: false, message: 'Google OAuth not configured' });
  const state = uuidv4();
  req.session!.oauthState = state;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get('/google/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ success: false, message: 'No code provided' });
  // Verify state
  if (state !== req.session!.oauthState) return res.status(403).json({ success: false, message: 'Invalid OAuth state' });
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code as string,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenResponse.json();
  // Get user info
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const googleUser = await userResponse.json();
  const pool = getPool();
  // Find or create user
  let [rows] = await pool.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleUser.id, googleUser.email]);
  let user: any;
  if (Array.isArray(rows) && rows.length > 0) {
    user = rows[0];
    if (!user.google_id) {
      await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleUser.id, user.id]);
    }
    await pool.query('UPDATE users SET last_login = NOW(), avatar_url = ? WHERE id = ?', [googleUser.picture, user.id]);
  } else {
    const id = uuidv4();
    const username = googleUser.email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6);
    await pool.query(
      'INSERT INTO users (id, google_id, email, name, username, avatar_url, last_login) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, googleUser.id, googleUser.email, googleUser.name, username, googleUser.picture]
    );
    await pool.query('INSERT INTO oauth_accounts (id, user_id, provider, provider_id) VALUES (UUID(), ?, ?, ?)', [id, 'google', googleUser.id]);
    user = { id, email: googleUser.email, name: googleUser.name, username, role: 'USER' };
  }
  req.session!.userId = user.id;
  req.session!.userRole = user.role;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(frontendUrl + '/dashboard');
}));

// Tournament Routes
export const tournamentRouter = Router();

tournamentRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { search, game, status, page = '1', limit = '12' } = req.query;
  let query = 'SELECT t.*, g.name as game_name, g.icon as game_icon FROM tournaments t LEFT JOIN games g ON t.game_id = g.id WHERE t.status != "DRAFT"';
  const params: any[] = [];
  if (search) { query += ' AND t.name LIKE ?'; params.push(`%${search}%`); }
  if (game) { query += ' AND t.game_id = ?'; params.push(game); }
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  const [rows] = await pool.query(query, params) as any[];
  // Get count
  const [countResult] = await pool.query('SELECT COUNT(*) as total FROM tournaments WHERE status != "DRAFT"') as any;
  // Fetch participant counts for each tournament
  const enrichedRows = await Promise.all(rows.map(async (row: any) => {
    const [participants] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM tournament_participants WHERE tournament_id=?', [row.id]);
    const participantCount = participants[0]?.cnt || 0;
    return { ...row, participant_count: participantCount };
  }));
  res.json({ success: true, data: enrichedRows, total: countResult[0].total, page: Number(page), limit: Number(limit) });
}));

tournamentRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT t.*, g.name as game_name FROM tournaments t LEFT JOIN games g ON t.game_id = g.id WHERE t.id = ?', [req.params.id]);
  if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ success: false, message: 'Tournament not found' });
  
  // Get participant IDs for this tournament
  const [participantRows] = await pool.query<any[]>('SELECT user_id FROM tournament_participants WHERE tournament_id=?', [req.params.id]);
  const participantIds = participantRows.map((p: any) => p.user_id);
  
  // Add participant_ids to the response
  const tournamentWithParticipants = { ...rows[0], participant_ids: participantIds };
  res.json({ success: true, data: tournamentWithParticipants });
}));

// Admin Tournament Routes
export const adminTournamentRouter = Router();

function sqlDateTime(value: unknown, fallback: Date) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
  if (match) return `${match[1]} ${match[2]}:${match[3] || '00'}`;
  return fallback.toISOString().slice(0, 19).replace('T', ' ');
}

function parsePrizeDistribution(value: unknown, prizePool: number, mode: string) {
  let rows: any[] = [];
  if (Array.isArray(value)) rows = value;
  else if (typeof value === 'string') {
    try { rows = JSON.parse(value); } catch { rows = []; }
  }
  if (!rows.length) {
    const count = mode === 'SOLO' ? 10 : 3;
    const weights = mode === 'SOLO'
      ? [0.30,0.20,0.14,0.10,0.07,0.06,0.05,0.04,0.025,0.015]
      : [0.50,0.30,0.20];
    return weights.slice(0,count).map((w, i) => ({ position: i + 1, amount: Math.round(prizePool * w) }));
  }
  return rows.map((r: any) => ({ position: Number(r.position), amount: Number(r.amount) }))
    .filter((r: any) => Number.isInteger(r.position) && r.position > 0 && Number.isFinite(r.amount) && r.amount >= 0)
    .sort((a: any,b: any) => a.position-b.position);
}

function formatTournamentAnnouncement(b: any, distribution: any[]) {
  const mode = String(b.mode || 'SQUAD').toUpperCase();
  const lines = distribution.slice(0, mode === 'SOLO' ? 10 : 3)
    .map((p: any) => `🏅 ${p.position}${p.position === 1 ? 'st' : p.position === 2 ? 'nd' : p.position === 3 ? 'rd' : 'th'}: Rs ${Number(p.amount).toLocaleString('en-PK')}`);
  return [
    '🔥 *ZYRO BATTLE — FREE FIRE TOURNAMENT*',
    '',
    `🏆 *${String(b.name).trim()}*`,
    `🎮 Mode: *${mode}*`,
    `💰 Entry: *Rs ${Number(b.entry_fee || 0).toLocaleString('en-PK')}*`,
    `💎 Prize Pool: *Rs ${Number(b.prize_pool || 0).toLocaleString('en-PK')}*`,
    `👥 Slots: *${Number(b.max_participants || b.max_teams || 0)}*`,
    `📅 Date: *${b.tournament_date || ''}*`,
    `⏰ Time: *${b.match_start_time || ''}*`,
    `🗺️ Map: *${b.map || 'Bermuda'}*`,
    '',
    '*PRIZE DISTRIBUTION*',
    ...lines,
    '',
    '📲 Register on ZyroBattle.',
  ].join('\n');
}

adminTournamentRouter.get('/', requireAuth, requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM tournaments ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}));

adminTournamentRouter.get('/:id/participants', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query<any[]>(`
    SELECT tp.id, tp.tournament_id, tp.user_id, tp.ign, tp.free_fire_uid, tp.player_username,
           tp.teammate1_ign, tp.teammate1_uid, tp.teammate2_ign, tp.teammate2_uid, tp.teammate3_ign, tp.teammate3_uid,
           u.name AS user_name, u.username AS account_username
    FROM tournament_participants tp
    LEFT JOIN users u ON u.id = tp.user_id
    WHERE tp.tournament_id = ?
    ORDER BY tp.registered_at ASC
  `, [req.params.id]);
  res.json({ success: true, data: rows });
}));

adminTournamentRouter.get('/:id/results', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query<any[]>('SELECT * FROM tournament_results WHERE tournament_id=? ORDER BY placement ASC', [req.params.id]);
  res.json({ success: true, data: rows });
}));

adminTournamentRouter.post('/', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const id = uuidv4();
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ success: false, message: 'Tournament name is required.' });

  const mode = ['SOLO','DUO','SQUAD'].includes(String(b.mode).toUpperCase()) ? String(b.mode).toUpperCase() : 'SQUAD';
  const gameId = 'free-fire';
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'free-fire-tournament';
  const slug = `${slugBase}-${Date.now()}`;
  const maxTeams = Math.max(1, Number(b.max_teams ?? b.max_participants ?? (mode === 'SOLO' ? 100 : 32)));
  const playersPerTeam = mode === 'SOLO' ? 1 : mode === 'DUO' ? 2 : 4;
  const maxPlayersPerTeam = playersPerTeam;
  const maxParticipants = Math.max(1, Number(b.max_participants ?? maxTeams));
  const prizePool = Math.max(0, Number(b.prize_pool || 0));
  const entryFee = Math.max(0, Number(b.entry_fee || 0));
  const tournamentDate = sqlDateTime(b.tournament_date, new Date(Date.now()+14*86400000));
  const matchStartTime = sqlDateTime(b.match_start_time, new Date(Date.now()+14*86400000));
  const distribution = parsePrizeDistribution(b.prize_distribution, prizePool, mode);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO tournaments
       (id,name,slug,game_id,description,prize_pool,currency,entry_fee,max_teams,max_players_per_team,
        registration_start,registration_end,tournament_start,region,platform,format,rules,prize_distribution,
        status,created_by,mode,max_participants,tournament_date,match_start_time,timezone,map,match_number,round,
        kill_points,placement_points,room_release_time,room_id,room_password,whatsapp_announcement_sent)
       VALUES (?,?,?,?,?,?, 'PKR', ?,?,?, NOW(), DATE_ADD(NOW(),INTERVAL 7 DAY), ?,?,?,?,?,?, 'DRAFT',?,?,?,?,?,?,?,?,?,?,?,?,?,?,FALSE)`,
      [
        id,name,slug,gameId,String(b.description||''),prizePool,entryFee,maxTeams,maxPlayersPerTeam,
        tournamentDate,String(b.region||'Pakistan'),String(b.platform||'Mobile'),String(b.format||'CUSTOM'),
        String(b.rules||'Standard Free Fire tournament rules apply.'),JSON.stringify(distribution),
        req.session!.userId,mode,maxParticipants,tournamentDate,matchStartTime,String(b.timezone||'Asia/Karachi'),
        String(b.map||'Bermuda'),Number(b.match_number||1),String(b.round||'Round 1'),Number(b.kill_points??1),
        JSON.stringify(b.placement_points||[]),String(b.room_release_time||'IMMEDIATE'),b.room_id||null,b.room_password||null
      ]
    );
    await conn.commit();
  } catch (e: any) {
    await conn.rollback();

    console.error('[TOURNAMENT CREATE SQL ERROR]', {
      message: e?.message,
      code: e?.code,
      errno: e?.errno,
      sqlState: e?.sqlState,
      sqlMessage: e?.sqlMessage,
      sql: e?.sql
    });

    throw e;
  } finally { conn.release(); }

  await logAdminAction(req.session!.userId, 'CREATE_TOURNAMENT', 'tournament', id, { name, mode, prizePool, entryFee });

  let whatsappSent = false;
  const destination = getWhatsAppDestination();
  if (destination) {
    const message = formatTournamentAnnouncement({
      ...b, name, mode, prize_pool: prizePool, entry_fee: entryFee,
      max_participants: maxParticipants, tournament_date: tournamentDate, match_start_time: matchStartTime
    }, distribution);
    try {
      const sendResult = await sendWhatsAppMessage(message, destination.id);
      await pool.query('UPDATE tournaments SET whatsapp_announcement_sent=TRUE WHERE id=?', [id]);
      await pool.query(
        `INSERT INTO whatsapp_messages (id,event_type,tournament_id,tournament_name,message,destination,whatsapp_message_id,status,sent_at)
         VALUES (UUID(),'NEW_TOURNAMENT',?,?,?,?,?, 'SENT',NOW())`,
        [id,name,message,destination.name,sendResult.messageId]
      );
      whatsappSent = true;
    } catch (error: any) {
      try {
        await pool.query(
          `INSERT INTO whatsapp_messages (id,event_type,tournament_id,tournament_name,message,destination,status,error)
           VALUES (UUID(),'NEW_TOURNAMENT',?,?,?,?, 'FAILED',?)`,
          [id,name,message,destination.name,String(error?.message||error)]
        );
      } catch (logError: any) {
        console.warn('[WHATSAPP] Could not save failed announcement log:', logError?.message || logError);
      }
    }
  }

  const [created] = await pool.query<any[]>('SELECT * FROM tournaments WHERE id=?',[id]);
  res.status(201).json({ success:true, data:created[0], whatsappSent });
}));

adminTournamentRouter.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const allowed = new Set([
    'name','description','prize_pool','entry_fee','max_teams','max_players_per_team','format','region','platform',
    'rules','prize_distribution','status','mode','max_participants','tournament_date','match_start_time','timezone',
    'map','match_number','round','kill_points','placement_points','room_release_time','room_id','room_password'
  ]);
  const updates: any = { ...req.body };
  for (const key of Object.keys(updates)) if (!allowed.has(key)) delete updates[key];
  if ('currency' in updates) delete updates.currency;
  if ('prize_distribution' in updates && typeof updates.prize_distribution !== 'string') updates.prize_distribution=JSON.stringify(updates.prize_distribution);
  for (const k of ['prize_pool','entry_fee']) if (k in updates) updates[k]=Math.max(0,Number(updates[k]));
  const keys=Object.keys(updates);
  if (!keys.length) return res.status(400).json({success:false,message:'No valid fields supplied.'});
  const fields=keys.map(k=>`\`${k}\`=?`).join(',');
  await pool.query(`UPDATE tournaments SET ${fields}, currency='PKR' WHERE id=?`,[...keys.map(k=>updates[k]),req.params.id]);
  await logAdminAction(req.session!.userId,'UPDATE_TOURNAMENT','tournament',req.params.id,updates);
  res.json({success:true});
}));

adminTournamentRouter.post('/:id/publish', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool=getPool();
  await pool.query(`UPDATE tournaments SET status='REGISTRATION_OPEN',currency='PKR' WHERE id=?`,[req.params.id]);
  await logAdminAction(req.session!.userId,'PUBLISH_TOURNAMENT','tournament',req.params.id);
  res.json({success:true});
}));

adminTournamentRouter.post('/:id/results', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool=getPool();
  const tournamentId=req.params.id;
  const results=Array.isArray(req.body?.results)?req.body.results:[];
  if (!results.length) return res.status(400).json({success:false,message:'At least one result is required.'});
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing]=await conn.query<any[]>('SELECT COUNT(*) AS c FROM tournament_results WHERE tournament_id=?',[tournamentId]);
    if (Number(existing[0]?.c||0)>0) { await conn.rollback(); return res.status(409).json({success:false,message:'Results are already published for this tournament.'}); }
    const [trows]=await conn.query<any[]>('SELECT mode,prize_pool FROM tournaments WHERE id=?',[tournamentId]);
    if (!trows.length) { await conn.rollback(); return res.status(404).json({success:false,message:'Tournament not found.'}); }
    for (const r of results) {
      const participantType=String(r.participantType||'PLAYER').toUpperCase();
      const participantId=String(r.participantId||'');
      const placement=Number(r.placement);
      const coins=Number(r.coinsAwarded||0);
      const prize=Number(r.prizeRupees||0);
      if (!participantId || !Number.isInteger(placement) || placement<1 || coins<0 || prize<0) continue;
      const [p]=await conn.query<any[]>(`
        SELECT tp.user_id, u.name AS user_name
        FROM tournament_participants tp
        LEFT JOIN users u ON u.id=tp.user_id
        WHERE tp.tournament_id=? AND tp.user_id=? LIMIT 1
      `,[tournamentId,participantId]);
      if (!p.length) continue;
      const name=p[0].user_name||participantId;
      await conn.query(
        `INSERT INTO tournament_results (id,tournament_id,participant_type,participant_id,participant_name,placement,prize_rupees,coins_awarded,created_by)
         VALUES (UUID(),?,?,?,?,?,?,?,?)`,
        [tournamentId,participantType,participantId,name,placement,prize,coins,req.session!.userId]
      );
      if (coins>0) {
        const beneficiary=p[0].user_id || null;
        if (beneficiary) {
          await conn.query('UPDATE users SET coins_balance=coins_balance+? WHERE id=?',[coins,beneficiary]);
          await conn.query(
            `INSERT INTO coin_transactions (id,user_id,type,coins,rupees,status,payment_method,note,reviewed_by,reviewed_at)
             VALUES (UUID(),?, 'ADJUSTMENT', ?, 0, 'COMPLETED', 'TOURNAMENT', ?, ?, NOW())`,
            [beneficiary,coins,`Tournament reward: ${name} — #${placement}`,req.session!.userId]
          );
        }
      }
    }
    await conn.query('UPDATE tournaments SET status="COMPLETED" WHERE id=?',[tournamentId]);
    await conn.commit();
    await logAdminAction(req.session!.userId,'PUBLISH_RESULTS','tournament',tournamentId,{resultsCount:results.length});
    res.json({success:true,message:'Results published and coin rewards credited.'});
  } catch(e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}));

adminTournamentRouter.post('/:id/cancel', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool=getPool();
  await pool.query('UPDATE tournaments SET status="CANCELLED" WHERE id=?',[req.params.id]);
  res.json({success:true});
}));

adminTournamentRouter.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool=getPool();
  await pool.query('DELETE FROM tournaments WHERE id=?',[req.params.id]);
  res.json({success:true});
}));

// Helper function to update WhatsApp tournament announcement with current slot count
async function updateTournamentWhatsAppSlots(pool: any, tournamentId: string) {
  try {
    // Get current participant count
    const [countResult] = await pool.query<any[]>('SELECT COUNT(*) as c FROM tournament_participants WHERE tournament_id=?', [tournamentId]);
    const participantCount = Number(countResult[0]?.c || 0);
    
    // Get tournament details
    const [tRows] = await pool.query<any[]>('SELECT max_participants, name FROM tournaments WHERE id=?', [tournamentId]);
    if (!tRows || tRows.length === 0) return;
    const tournament = tRows[0];
    const maxParticipants = Number(tournament.max_participants || 0);
    const availableSlots = Math.max(0, maxParticipants - participantCount);
    
    // Get the WhatsApp message for this tournament
    const [msgRows] = await pool.query<any[]>('SELECT id, whatsapp_message_id, destination FROM whatsapp_messages WHERE tournament_id=? AND event_type=\'NEW_TOURNAMENT\' ORDER BY sent_at DESC LIMIT 1', [tournamentId]);
    if (!msgRows || msgRows.length === 0 || !msgRows[0].whatsapp_message_id) return;
    
    const whatsappMessageId = msgRows[0].whatsapp_message_id;
    const destination = msgRows[0].destination;
    
    // Build updated message
    const updatedMessage = `🔥 *${tournament.name}* 🔥\n\n📊 Tournament Status Update:\n• Total Slots: ${maxParticipants}\n• Available: ${availableSlots}\n\nRegister now before slots fill up!`;
    
    // Edit the existing WhatsApp message
    await editWhatsAppMessage(whatsappMessageId, updatedMessage, destination);
    
    console.log(`[WHATSAPP] Updated tournament ${tournamentId} slots: ${availableSlots}/${maxParticipants}`);
  } catch (error: any) {
    console.warn('[WHATSAPP] Failed to update tournament slots:', error?.message);
  }
}

// User join/leave - Individual based (no teams required)
tournamentRouter.post('/:id/join', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool=getPool();
  const tournamentId=req.params.id;
  const userId=req.session!.userId;
  
  // Get player info
  const ign=String(req.body?.ign||'').trim();
  const freeFireUid=String(req.body?.freeFireUid||'').trim();
  const playerUsername=String(req.body?.username||'').trim();
  
  // Get teammate info (optional for DUO/SQUAD)
  const teammate1Ign=String(req.body?.teammate1Ign||'').trim() || null;
  const teammate1Uid=String(req.body?.teammate1Uid||'').trim() || null;
  const teammate2Ign=String(req.body?.teammate2Ign||'').trim() || null;
  const teammate2Uid=String(req.body?.teammate2Uid||'').trim() || null;
  const teammate3Ign=String(req.body?.teammate3Ign||'').trim() || null;
  const teammate3Uid=String(req.body?.teammate3Uid||'').trim() || null;
  
  const [trows]=await pool.query<any[]>('SELECT * FROM tournaments WHERE id=?',[tournamentId]);
  const t=trows[0];
  if(!t) return res.status(404).json({success:false,message:'Tournament not found'});
  if(t.status!=='REGISTRATION_OPEN') return res.status(400).json({success:false,message:'Registration is not open'});
  if(!ign || !freeFireUid || !playerUsername) return res.status(400).json({success:false,message:'IGN, Free Fire UID and username are required.'});
  
  // Validate teammate requirements based on mode (all optional for solo queue)
  // SOLO: no teammates needed
  // DUO: up to 1 teammate (optional)
  // SQUAD: up to 3 teammates (optional)
  
  const [existing]=await pool.query<any[]>('SELECT id FROM tournament_participants WHERE tournament_id=? AND user_id=?',[tournamentId,userId]);
  if(existing.length) return res.status(409).json({success:false,message:'Already registered'});
  
  const [count]=await pool.query<any[]>('SELECT COUNT(*) c FROM tournament_participants WHERE tournament_id=?',[tournamentId]);
  if(Number(count[0]?.c||0)>=Number(t.max_participants||32)) return res.status(400).json({success:false,message:'Tournament is full'});
  
  // Check if user has enough coins for entry fee
  const entryFee = Number(t.entry_fee || 0);
  if (entryFee > 0) {
    const [userRows] = await pool.query<any[]>('SELECT coins_balance FROM users WHERE id=?', [userId]);
    const user = userRows[0];
    if (!user || Number(user.coins_balance) < entryFee) {
      return res.status(400).json({success:false,message:'Insufficient coins balance'});
    }
  }
  
  // Insert participant with teammate info
  await pool.query(
    `INSERT INTO tournament_participants (id,tournament_id,user_id,ign,free_fire_uid,player_username,teammate1_ign,teammate1_uid,teammate2_ign,teammate2_uid,teammate3_ign,teammate3_uid)
     VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?)`,
    [tournamentId,userId,ign,freeFireUid,playerUsername,teammate1Ign,teammate1Uid,teammate2Ign,teammate2Uid,teammate3Ign,teammate3Uid]
  );
  
  // Deduct entry fee from user's wallet
  if (entryFee > 0) {
    await pool.query('UPDATE users SET coins_balance = coins_balance - ? WHERE id = ?', [entryFee, userId]);
    await pool.query(
      'INSERT INTO coin_transactions (id, user_id, type, coins, status, note, created_at) VALUES (UUID(), ?, "TOURNAMENT_ENTRY", ?, "COMPLETED", ?, NOW())',
      [userId, entryFee, `Entry fee for tournament: ${t.name}`]
    );
  }
  
  await pool.query('INSERT INTO notifications (id,user_id,type,title,message,link) VALUES (UUID(),?,"TOURNAMENT",?,?,?)',
    [userId,'Registered!',`You joined ${t.name}`,`/tournaments/${tournamentId}`]);
  
  // Update WhatsApp tournament announcement with new slot count
  await updateTournamentWhatsAppSlots(pool, tournamentId);
  
  res.json({success:true,message:'Successfully registered'});
}));

tournamentRouter.post('/:id/leave', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool=getPool();
  const tournamentId=req.params.id;
  await pool.query('DELETE FROM tournament_participants WHERE tournament_id=? AND user_id=?',[tournamentId,req.session!.userId]);
  
  // Update WhatsApp tournament announcement with new slot count after leave
  await updateTournamentWhatsAppSlots(pool, tournamentId);
  
  res.json({success:true});
}));

// Team Routes
export const teamRouter = Router();

teamRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT t.*, u.name as captain_name FROM teams t LEFT JOIN users u ON t.captain_id = u.id WHERE t.status = "ACTIVE" ORDER BY t.wins DESC');
  res.json({ success: true, data: rows });
}));

teamRouter.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const id = uuidv4();
  const { name, tag, description } = req.body;
  await pool.query('INSERT INTO teams (id, name, tag, description, captain_id) VALUES (?, ?, ?, ?, ?)', [id, name, tag, description, req.session!.userId]);
  await pool.query('INSERT INTO team_members (id, team_id, user_id, role) VALUES (UUID(), ?, ?, "CAPTAIN")', [id, req.session!.userId]);
  res.status(201).json({ success: true, data: { id } });
}));

// Match Routes
export const matchRouter = Router();

matchRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { tournament_id } = req.query;
  let query = 'SELECT * FROM matches';
  const params: any[] = [];
  if (tournament_id) { query += ' WHERE tournament_id = ?'; params.push(tournament_id); }
  query += ' ORDER BY scheduled_time ASC';
  const [rows] = await pool.query(query, params);
  res.json({ success: true, data: rows });
}));

matchRouter.post('/:id/result', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { score_a, score_b, winner_id } = req.body;
  await pool.query('UPDATE matches SET score_a = ?, score_b = ?, winner_id = ?, status = "COMPLETED" WHERE id = ?', [score_a, score_b, winner_id, req.params.id]);
  res.json({ success: true, message: 'Result submitted' });
}));

// Notification Routes
export const notificationRouter = Router();

notificationRouter.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.session!.userId]);
  res.json({ success: true, data: rows });
}));

notificationRouter.put('/:id/read', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.session!.userId]);
  res.json({ success: true });
}));

// Leaderboard Routes
export const leaderboardRouter = Router();

leaderboardRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT u.id, u.username, u.avatar_url,
    COUNT(DISTINCT tp.tournament_id) as tournaments_played
    FROM users u
    LEFT JOIN tournament_participants tp ON u.id = tp.user_id
    WHERE u.role = 'USER' AND u.status = 'ACTIVE'
    GROUP BY u.id
    ORDER BY tournaments_played DESC
    LIMIT 100
  `);
  res.json({ success: true, data: rows });
}));

// Admin Routes
export const adminRouter = Router();

adminRouter.get('/stats', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [users] = await pool.query('SELECT COUNT(*) as total FROM users') as any;
  const [activeUsers] = await pool.query('SELECT COUNT(*) as total FROM users WHERE status = "ACTIVE"') as any;
  const [tournaments] = await pool.query('SELECT COUNT(*) as total FROM tournaments') as any;
  const [liveTournaments] = await pool.query('SELECT COUNT(*) as total FROM tournaments WHERE status = "LIVE"') as any;
  const [teams] = await pool.query('SELECT COUNT(*) as total FROM teams') as any;
  const [matches] = await pool.query('SELECT COUNT(*) as total FROM matches') as any;
  const [participants] = await pool.query('SELECT COUNT(*) as total FROM tournament_participants') as any;
  res.json({
    success: true,
    data: {
      totalUsers: users[0].total,
      activeUsers: activeUsers[0].total,
      totalTournaments: tournaments[0].total,
      liveTournaments: liveTournaments[0].total,
      totalTeams: teams[0].total,
      totalMatches: matches[0].total,
      totalParticipants: participants[0].total,
    }
  });
}));

adminRouter.put('/users/:id/ban', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  await pool.query('UPDATE users SET status = "BANNED" WHERE id = ?', [req.params.id]);
  await logAdminAction(req.session!.userId, 'BAN_USER', 'user', req.params.id);
  res.json({ success: true });
}));

adminRouter.put('/users/:id/unban', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  await pool.query('UPDATE users SET status = "ACTIVE" WHERE id = ?', [req.params.id]);
  await logAdminAction(req.session!.userId, 'UNBAN_USER', 'user', req.params.id);
  res.json({ success: true });
}));

// User Routes
export const userRouter = Router();

userRouter.get('/profile', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, email, name, username, avatar_url, bio, role, created_at FROM users WHERE id = ?', [req.session!.userId]);
  res.json({ success: true, data: rows[0] });
}));

userRouter.put('/profile', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { name, username, bio } = req.body;
  await pool.query('UPDATE users SET name = ?, username = ?, bio = ? WHERE id = ?', [name, username, bio, req.session!.userId]);
  res.json({ success: true });
}));

