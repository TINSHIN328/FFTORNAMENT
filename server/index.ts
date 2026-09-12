import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { connectDatabase, verifyConnection, runMigrations, seedDatabase } from './database/index.js';
import { initializePassport } from './config/passport.js';
import {
  authRouter,
  tournamentRouter,
  adminTournamentRouter,
  teamRouter,
  matchRouter,
  notificationRouter,
  leaderboardRouter,
  adminRouter,
  userRouter,
} from './routes/index.js';
import { whatsappRouter } from './whatsapp-routes.js';
import { walletRouter } from './wallet-routes.js';
import { startWhatsApp } from './whatsapp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
const cookieSecure = frontendUrl.startsWith('https://') || process.env.COOKIE_SECURE === 'true';

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/whatsapp/status' || req.path === '/whatsapp/chats',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: cookieSecure,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: cookieSecure ? 'none' : 'lax',
  },
}));

// Passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/tournaments', tournamentRouter);
app.use('/api/admin/tournaments', adminTournamentRouter);
app.use('/api/teams', teamRouter);
app.use('/api/matches', matchRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/wallet', walletRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', req.method, req.originalUrl, err.message);
    console.error('[ERROR STACK]', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Start server
async function start() {
  console.log('[SERVER] Starting ZyroBattle...');
  
  try {
    await connectDatabase();
    await verifyConnection();
    console.log('[DB] Connected successfully');
    await runMigrations();
    await seedDatabase();
    if (process.env.WHATSAPP_AUTO_CONNECT !== 'false') {
      startWhatsApp().catch((error) => console.warn('[WHATSAPP] Auto-connect failed:', error instanceof Error ? error.message : error));
    }
  } catch (error) {
    console.error('[DB] Database initialization failed:', (error as Error).message);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] ZyroBattle running on 0.0.0.0:${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

export default app;
