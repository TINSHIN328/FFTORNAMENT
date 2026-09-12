# ZyroBattle - Esports Tournament Platform

> **Compete. Conquer. Become Champion.**

ZyroBattle is a full-stack, production-ready esports tournament management platform built with React, TypeScript, Express, and MySQL.

![ZyroBattle](https://img.shields.io/badge/ZyroBattle-v1.0-6c5ce7?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square)

---

## 🎮 Features

### Players
- 🏆 Browse and join tournaments
- 👥 Create and manage teams
- 📊 View leaderboard and rankings
- 🔔 Real-time notifications
- 📈 Track personal statistics
- 🎯 View match schedules and brackets

### Administrators
- 📋 Create and manage tournaments
- 👤 Manage users (ban/unban, role changes)
- 🏅 Manage matches and results
- 📢 Post announcements
- 📊 Dashboard with platform statistics
- 📝 Audit logging for all admin actions
- 🛡️ Report management system

### Technical
- 🔐 Google OAuth authentication
- 🗄️ MySQL database with migrations
- 📱 Fully responsive design
- ⚡ Optimized performance
- 🔒 Security-first architecture
- 🚀 Railway deployment ready

---

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **Tailwind CSS 4** for styling
- **React Router 6** for navigation
- **Lucide React** for icons
- **Framer Motion** for animations

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **MySQL 2** for database
- **Passport.js** for OAuth
- **Zod** for validation
- **Helmet** for security

### Deployment
- **Railway** compatible
- Environment-based configuration
- Production-ready build pipeline

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- MySQL 8+ (or Railway MySQL)
- Google OAuth credentials

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/zyrobattle.git
cd zyrobattle

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (Railway MySQL)
DATABASE_URL=mysql://user:password@host:port/database
# OR individual variables:
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=zyrobattle

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Session
SESSION_SECRET=generate-a-random-secret-here
```

---

## 🗄️ Database Setup

### Local MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE zyrobattle;"

# Run migrations
npm run migrate

# Seed demo data (optional)
npm run seed
```

### Railway MySQL

1. Create a Railway project
2. Add a MySQL service
3. Copy the `DATABASE_URL` from the MySQL service
4. Add it to your application's environment variables

---

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services > OAuth consent screen**
4. Configure the consent screen (External/Internal)
5. Add scopes: `email`, `profile`, `openid`
6. Navigate to **APIs & Services > Credentials**
7. Click **Create Credentials > OAuth client ID**
8. Application type: **Web application**
9. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
10. Copy the **Client ID** and **Client Secret**
11. Add them to your `.env` file

---

## 🚀 Development

```bash
# Start frontend dev server
npm run dev

# Start backend dev server (in another terminal)
npm run server:dev

# Or start both concurrently
npm run dev:all
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:3001`.

---

## 🏗️ Production Build

```bash
# Build the project
npm run build

# Start production server
npm start
```

The server will serve the built frontend and handle API requests.

---

## 🚂 Railway Deployment

### Step 1: Create Railway Project
1. Go to [Railway](https://railway.app/)
2. Create a new project
3. Add a **MySQL** database service
4. Add a **Web Service** (your app)

### Step 2: Configure Environment Variables
In your Railway service settings, add:

```
DATABASE_URL=<from MySQL service>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://your-app.up.railway.app/api/auth/google/callback
SESSION_SECRET=<random-secret-string>
FRONTEND_URL=https://your-app.up.railway.app
NODE_ENV=production
```

### Step 3: Configure Build
Railway will auto-detect the project. Ensure these settings:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

### Step 4: Deploy
Push to your Git repository connected to Railway, or deploy manually.

---

## 👤 Admin Setup

### First-Time Setup (Browser)
When you first visit the site with no admin account:
1. You'll be redirected to `/admin-setup`
2. Create the admin account (suggested username: **Zohaib**)
3. After creation, you'll be redirected to the admin panel

### Production Setup (CLI)
For Railway/production deployment:

```bash
npm run create-admin
```

This will prompt for:
- Admin name
- Admin email
- Admin username
- Admin password (hashed with bcrypt, never stored in plain text)

### Important Notes
- **No default admin** - you must create one
- **No fake data** - fresh database shows 0 tournaments, 0 users, 0 teams
- **Password is never logged** or stored in plain text
- **Only admin** can create tournaments

---

## 📁 Project Structure

```
zyrobattle/
├── src/                    # Frontend source
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   └── layout/        # Layout components
│   ├── pages/             # Page components
│   ├── store/             # State management
│   ├── types/             # TypeScript types
│   ├── lib/               # Utilities
│   ├── App.tsx            # Main app
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── server/                # Backend source
│   ├── config/            # Configuration
│   ├── database/          # Database connection & migrations
│   ├── middleware/         # Express middleware
│   ├── routes/            # API routes
│   └── index.ts           # Server entry
├── public/                # Static assets
├── .env.example           # Environment template
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
```

---

## 🔒 Security

- Password hashing with bcrypt (production)
- HTTP-only secure cookies
- CSRF protection
- Rate limiting
- SQL injection prevention (parameterized queries)
- XSS protection via Helmet
- Input validation with Zod
- Role-based authorization
- OAuth state validation
- No secrets in frontend code

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Start Google OAuth
- `GET /api/auth/google/callback` - OAuth callback

### Tournaments
- `GET /api/tournaments` - List tournaments
- `GET /api/tournaments/:id` - Get tournament
- `POST /api/tournaments` - Create tournament (admin)
- `POST /api/tournaments/:id/join` - Join tournament
- `POST /api/tournaments/:id/leave` - Leave tournament

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Matches
- `GET /api/matches` - List matches
- `GET /api/matches/:id` - Get match
- `POST /api/matches/:id/result` - Submit result

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `PUT /api/admin/users/:id/ban` - Ban user
- `PUT /api/admin/users/:id/unban` - Unban user
- `DELETE /api/admin/tournaments/:id` - Delete tournament

---

## 📊 Fresh Installation Behavior

When first installed with an empty database:
- **Users:** 0
- **Tournaments:** 0
- **Teams:** 0
- **Matches:** 0
- **Participants:** 0
- **Notifications:** 0

All statistics shown on the website reflect actual database state. No fake numbers, no pre-seeded data.

After admin creates one tournament: **Tournaments = 1**
After 10 users register: **Users = 10**
After 5 teams are created: **Teams = 5**

---

## 🧪 Testing

```bash
npm run test
```

---

## 📄 License

MIT License - feel free to use this project for your own esports platform.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## 💬 Support

- Discord: [Join our server](#)
- Email: support@zyrobattle.com
- Issues: [GitHub Issues](#)

---

**Built with ❤️ for competitive gamers.**

*ZyroBattle - Compete. Conquer. Become Champion.*
