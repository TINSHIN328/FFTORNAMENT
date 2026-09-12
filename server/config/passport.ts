import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getPool } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';

export function initializePassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT id, email, name, username, role FROM users WHERE id = ?', [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        done(null, rows[0]);
      } else {
        done(new Error('User not found'), null);
      }
    } catch (error) {
      done(error, null);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const pool = getPool();
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;

        if (!email) return done(new Error('No email from Google'), undefined);

        // Check if user exists by Google ID
        let [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
        
        if (Array.isArray(rows) && rows.length > 0) {
          // User exists, update last login
          const user = rows[0] as any;
          await pool.query('UPDATE users SET last_login = NOW(), avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
          return done(null, user);
        }

        // Check if user exists by email
        [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (Array.isArray(rows) && rows.length > 0) {
          // Link Google account to existing user
          const user = rows[0] as any;
          await pool.query('UPDATE users SET google_id = ?, last_login = NOW() WHERE id = ?', [googleId, user.id]);
          return done(null, user);
        }

        // Create new user
        const id = uuidv4();
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6);
        await pool.query(
          'INSERT INTO users (id, google_id, email, name, username, avatar_url, last_login) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [id, googleId, email, name, username, avatarUrl]
        );

        const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return done(null, (newUser as any)[0]);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }));
  }
}
