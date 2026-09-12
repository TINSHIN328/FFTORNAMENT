import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, Tournament, Team, Match, MatchResult, Notification, Announcement, TeamInvitation, WhatsAppConfig, WhatsAppMessage, WhatsAppNotificationSettings, LeaderboardEntry, AdminLog, TournamentStatus, MatchStatus, TournamentMode, RoomReleaseTime, WhatsAppStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  currentUser: User | null;
  users: User[];
  games: Array<{ id: string; name: string; icon?: string; slug?: string }>;
  reports: any[];
  tournaments: Tournament[];
  teams: Team[];
  matches: Match[];
  matchResults: MatchResult[];
  notifications: Notification[];
  announcements: Announcement[];
  teamInvitations: TeamInvitation[];
  whatsappConfig: WhatsAppConfig;
  whatsappMessages: WhatsAppMessage[];
  whatsappSettings: WhatsAppNotificationSettings;
  adminLogs: AdminLog[];
  isAuthenticated: boolean;
  toasts: Toast[];
  adminSetupComplete: boolean;
  authReady: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

type Action =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'CREATE_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; payload: { id: string; data: Partial<Tournament> } }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'JOIN_TOURNAMENT'; payload: { tournamentId: string; userId: string; teamId?: string } }
  | { type: 'LEAVE_TOURNAMENT'; payload: { tournamentId: string; userId: string } }
  | { type: 'CREATE_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: { id: string; data: Partial<Team> } }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'CREATE_MATCH'; payload: Match }
  | { type: 'UPDATE_MATCH'; payload: { id: string; data: Partial<Match> } }
  | { type: 'ADD_MATCH_RESULT'; payload: MatchResult }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ'; payload: string }
  | { type: 'ADD_ANNOUNCEMENT'; payload: Announcement }
  | { type: 'BAN_USER'; payload: string }
  | { type: 'UNBAN_USER'; payload: string }
  | { type: 'UPDATE_USER_ROLE'; payload: { userId: string; role: User['role'] } }
  | { type: 'REGISTER_USER'; payload: User }
  | { type: 'COMPLETE_ADMIN_SETUP' }
  | { type: 'AUTH_READY' }
  | { type: 'UPDATE_WHATSAPP_CONFIG'; payload: Partial<WhatsAppConfig> }
  | { type: 'ADD_WHATSAPP_MESSAGE'; payload: WhatsAppMessage }
  | { type: 'UPDATE_WHATSAPP_MESSAGE'; payload: { id: string; data: Partial<WhatsAppMessage> } }
  | { type: 'UPDATE_WHATSAPP_SETTINGS'; payload: Partial<WhatsAppNotificationSettings> }
  | { type: 'ADD_ADMIN_LOG'; payload: AdminLog }
  | { type: 'CREATE_INVITATION'; payload: TeamInvitation }
  | { type: 'UPDATE_INVITATION'; payload: { id: string; data: Partial<TeamInvitation> } };

const defaultWhatsAppSettings: WhatsAppNotificationSettings = {
  newTournament: true,
  registrationOpen: true,
  registrationClosing: false,
  tournamentFull: true,
  tournamentStarting: true,
  matchScheduled: false,
  roomDetails: true,
  matchResult: true,
  tournamentCompleted: true,
  winnerAnnouncement: true,
};

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('zyrobattle_state_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        authReady: false,
        toasts: [],
        games: parsed.games || [{ id: 'free-fire', name: 'Free Fire', icon: '🔥', slug: 'free-fire' }],
        reports: parsed.reports || [],
        whatsappConfig: parsed.whatsappConfig || { status: 'DISCONNECTED', connectedAt: null, lastMessageAt: null, phoneNumber: null, destinationName: '', destinationId: '', enabled: false },
        whatsappMessages: parsed.whatsappMessages || [],
        whatsappSettings: parsed.whatsappSettings || defaultWhatsAppSettings,
        adminLogs: parsed.adminLogs || [],
        matchResults: parsed.matchResults || [],
        teamInvitations: parsed.teamInvitations || [],
      };
    }
  } catch (e) { /* ignore */ }
  return {
    currentUser: null,
    users: [],
    games: [{ id: 'free-fire', name: 'Free Fire', icon: '🔥', slug: 'free-fire' }],
    reports: [],
    tournaments: [],
    teams: [],
    matches: [],
    matchResults: [],
    notifications: [],
    announcements: [],
    teamInvitations: [],
    whatsappConfig: { status: 'DISCONNECTED', connectedAt: null, lastMessageAt: null, phoneNumber: null, destinationName: '', destinationId: '', enabled: false },
    whatsappMessages: [],
    whatsappSettings: defaultWhatsAppSettings,
    adminLogs: [],
    isAuthenticated: false,
    toasts: [],
    adminSetupComplete: false,
    authReady: false,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, currentUser: null, isAuthenticated: false };
    case 'REGISTER_USER':
      return { ...state, users: [...state.users, action.payload], currentUser: action.payload, isAuthenticated: true };
    case 'UPDATE_USER':
      return {
        ...state,
        currentUser: state.currentUser ? { ...state.currentUser, ...action.payload } : null,
        users: state.users.map(u => u.id === state.currentUser?.id ? { ...u, ...action.payload } : u)
      };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_TOURNAMENTS':
      return { ...state, tournaments: action.payload };
    case 'CREATE_TOURNAMENT':
      return { ...state, tournaments: [...state.tournaments, action.payload] };
    case 'UPDATE_TOURNAMENT':
      // Handle both formats: {id, data} and full tournament object
      if (action.payload.id && action.payload.data) {
        return { ...state, tournaments: state.tournaments.map(t => t.id === action.payload.id ? { ...t, ...action.payload.data } : t) };
      } else {
        // Full tournament object format
        return { ...state, tournaments: state.tournaments.map(t => t.id === action.payload.id ? action.payload : t) };
      }
    case 'DELETE_TOURNAMENT':
      return { ...state, tournaments: state.tournaments.filter(t => t.id !== action.payload) };
    case 'JOIN_TOURNAMENT': {
      const { tournamentId, userId } = action.payload;
      return {
        ...state,
        tournaments: state.tournaments.map(t => t.id === tournamentId ? {
          ...t,
          participantIds: [...new Set([...t.participantIds, userId])],
        } : t),
      };
    }
    case 'LEAVE_TOURNAMENT': {
      const { tournamentId, userId } = action.payload;
      return {
        ...state,
        tournaments: state.tournaments.map(t => t.id === tournamentId ? {
          ...t,
          participantIds: t.participantIds.filter(id => id !== userId),
        } : t),
      };
    }
    case 'CREATE_TEAM':
      return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM':
      return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? { ...t, ...action.payload.data } : t) };
    case 'DELETE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload) };
    case 'CREATE_MATCH':
      return { ...state, matches: [...state.matches, action.payload] };
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.payload.id ? { ...m, ...action.payload.data } : m) };
    case 'ADD_MATCH_RESULT':
      return { ...state, matchResults: [...state.matchResults, action.payload] };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => n.userId === action.payload ? { ...n, read: true } : n) };
    case 'ADD_ANNOUNCEMENT':
      return { ...state, announcements: [action.payload, ...state.announcements] };
    case 'BAN_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload ? { ...u, status: 'BANNED' as const } : u) };
    case 'UNBAN_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload ? { ...u, status: 'ACTIVE' as const } : u) };
    case 'UPDATE_USER_ROLE':
      return { ...state, users: state.users.map(u => u.id === action.payload.userId ? { ...u, role: action.payload.role } : u) };
    case 'COMPLETE_ADMIN_SETUP':
      return { ...state, adminSetupComplete: true };
    case 'AUTH_READY':
      return { ...state, authReady: true };
    case 'UPDATE_WHATSAPP_CONFIG':
      return { ...state, whatsappConfig: { ...state.whatsappConfig, ...action.payload } };
    case 'ADD_WHATSAPP_MESSAGE':
      return { ...state, whatsappMessages: [action.payload, ...state.whatsappMessages] };
    case 'UPDATE_WHATSAPP_MESSAGE':
      return { ...state, whatsappMessages: state.whatsappMessages.map(m => m.id === action.payload.id ? { ...m, ...action.payload.data } : m) };
    case 'UPDATE_WHATSAPP_SETTINGS':
      return { ...state, whatsappSettings: { ...state.whatsappSettings, ...action.payload } };
    case 'ADD_ADMIN_LOG':
      return { ...state, adminLogs: [action.payload, ...state.adminLogs] };
    case 'CREATE_INVITATION':
      return { ...state, teamInvitations: [...state.teamInvitations, action.payload] };
    case 'UPDATE_INVITATION':
      return { ...state, teamInvitations: state.teamInvitations.map(i => i.id === action.payload.id ? { ...i, ...action.payload.data } : i) };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addToast: (message: string, type: Toast['type']) => void;
  login: (username: string, password: string, otpVerificationId?: string, otp?: string) => Promise<boolean>;
  register: (name: string, email: string, username: string, password: string, freeFireId: string) => Promise<boolean>;
  createAdmin: (name: string, email: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  getTournament: (id: string) => Tournament | undefined;
  getTeam: (id: string) => Team | undefined;
  getMatch: (id: string) => Match | undefined;
  getUser: (id: string) => User | undefined;
  getLeaderboard: (tournamentId?: string) => LeaderboardEntry[];
  hasAdmin: () => boolean;
  addAdminLog: (action: string, targetType: string, targetId: string, metadata?: any) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    const { toasts, ...rest } = state;
    localStorage.setItem('zyrobattle_state_v2', JSON.stringify(rest));
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) { dispatch({ type: 'AUTH_READY' }); return; }
        const json = await response.json();
        if (cancelled || !json?.success || !json.data) { dispatch({ type: 'AUTH_READY' }); return; }
        const u = json.data;
        const user: User = {
          id: u.id, email: u.email || '', name: u.name || '', username: u.username || '',
          freeFireId: u.free_fire_id || '', avatarUrl: u.avatar_url || '', role: u.role,
          status: u.status, bio: u.bio || '', createdAt: u.created_at || '', lastLogin: u.last_login || ''
        };
        dispatch({ type: 'LOGIN', payload: user });
        dispatch({ type: 'AUTH_READY' });
      } catch { dispatch({ type: 'AUTH_READY' }); }
    })();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    if (state.currentUser?.role !== 'ADMIN') return;
    (async () => {
      try {
        const response = await fetch('/api/admin/tournaments', { credentials: 'include' });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json?.success || !Array.isArray(json.data)) return;
        const mapped: Tournament[] = json.data.map((t: any) => ({
          ...t,
          gameId: t.game_id || 'free-fire', game: 'Free Fire',
          bannerUrl: t.banner_url || '', logoUrl: t.logo_url || '',
          maxTeams: Number(t.max_teams || t.max_participants || 32),
          maxPlayersPerTeam: Number(t.max_players_per_team || 4), maxParticipants: Number(t.max_participants || t.max_teams || 32),
          mode: t.mode || 'SQUAD', currency: t.currency || 'USD',
          prizePool: Number(t.prize_pool || 0), entryFee: Number(t.entry_fee || 0),
          registrationStart: t.registration_start || '', registrationEnd: t.registration_end || '',
          tournamentDate: t.tournament_date || t.tournament_start || '', matchStartTime: t.match_start_time || t.tournament_start || '',
          timezone: t.timezone || 'UTC', map: t.map || 'Bermuda', matchNumber: Number(t.match_number || 1), round: t.round || 'Round 1',
          killPoints: Number(t.kill_points || 1), placementPoints: typeof t.placement_points === 'string' ? (JSON.parse(t.placement_points || '[]') || []) : (t.placement_points || []),
          roomReleaseTime: t.room_release_time || 'IMMEDIATE', roomId: t.room_id || '', roomPassword: t.room_password || '',
          rules: t.rules || '', prizeDistribution: typeof t.prize_distribution === 'string' ? (() => { try { return JSON.parse(t.prize_distribution); } catch { return { first: 0, second: 0, third: 0 }; } })() : (t.prize_distribution || { first: 0, second: 0, third: 0 }),
          participantIds: [], whatsappAnnouncementSent: Boolean(t.whatsapp_announcement_sent),
          createdAt: t.created_at || '', createdBy: t.created_by || '',
          slug: t.slug || t.id,
          status: t.status || 'DRAFT', description: t.description || '', region: t.region || 'Global', platform: t.platform || 'Mobile', format: t.format || 'CUSTOM'
        }));
        dispatch({ type: 'SET_TOURNAMENTS', payload: mapped });
      } catch {}
    })();
  }, [state.currentUser?.role]);

  // Load public tournaments for all authenticated users
  useEffect(() => {
    if (!state.isAuthenticated) return;
    (async () => {
      try {
        const response = await fetch('/api/tournaments', { credentials: 'include' });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json?.success || !Array.isArray(json.data)) return;
        const mapped: Tournament[] = json.data.map((t: any) => ({
          ...t,
          gameId: t.game_id || 'free-fire', game: 'Free Fire',
          bannerUrl: t.banner_url || '', logoUrl: t.logo_url || '',
          maxTeams: Number(t.max_teams || t.max_participants || 32),
          maxPlayersPerTeam: Number(t.max_players_per_team || 4), maxParticipants: Number(t.max_participants || t.max_teams || 32),
          mode: t.mode || 'SQUAD', currency: t.currency || 'PKR',
          prizePool: Number(t.prize_pool || 0), entryFee: Number(t.entry_fee || 0),
          registrationStart: t.registration_start || '', registrationEnd: t.registration_end || '',
          tournamentDate: t.tournament_date || t.tournament_start || '', matchStartTime: t.match_start_time || t.tournament_start || '',
          timezone: t.timezone || 'Asia/Karachi', map: t.map || 'Bermuda', matchNumber: Number(t.match_number || 1), round: t.round || 'Round 1',
          killPoints: Number(t.kill_points || 1), placementPoints: typeof t.placement_points === 'string' ? (JSON.parse(t.placement_points || '[]') || []) : (t.placement_points || []),
          roomReleaseTime: t.room_release_time || 'IMMEDIATE', roomId: t.room_id || '', roomPassword: t.room_password || '',
          rules: t.rules || '', prizeDistribution: typeof t.prize_distribution === 'string' ? (() => { try { return JSON.parse(t.prize_distribution); } catch { return { first: 0, second: 0, third: 0 }; } })() : (t.prize_distribution || { first: 0, second: 0, third: 0 }),
          participantIds: t.participant_ids || [], whatsappAnnouncementSent: Boolean(t.whatsapp_announcement_sent),
          createdAt: t.created_at || '', createdBy: t.created_by || '',
          slug: t.slug || t.id,
          status: t.status || 'REGISTRATION_OPEN', description: t.description || '', region: t.region || 'Pakistan', platform: t.platform || 'Mobile', format: t.format || 'CUSTOM'
        }));
        dispatch({ type: 'SET_TOURNAMENTS', payload: mapped });
      } catch {}
    })();
  }, [state.isAuthenticated]);

  const addToast = (message: string, type: Toast['type']) => {
    const id = uuidv4();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
  };

  const hasAdmin = (): boolean => state.users.some(u => u.role === 'ADMIN') || state.adminSetupComplete;

  const addAdminLog = (action: string, targetType: string, targetId: string, metadata?: any) => {
    if (!state.currentUser) return;
    dispatch({ type: 'ADD_ADMIN_LOG', payload: {
      id: uuidv4(), adminId: state.currentUser.id, adminName: state.currentUser.name,
      action, targetType, targetId, metadata, ipAddress: '', createdAt: new Date().toISOString(),
    }});
  };

  const login = async (username: string, password: string, otpVerificationId?: string, otp?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, ...(otpVerificationId ? { otpVerificationId, otp } : {}) }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        addToast(json?.message || 'Invalid username or password.', 'error');
        return false;
      }
      const u = json.data;
      const user: User = {
        id: u.id, email: u.email || '', name: u.name || '', username: u.username || username,
        freeFireId: u.free_fire_id || '', avatarUrl: u.avatar_url || '', role: u.role,
        status: u.status || 'ACTIVE', bio: u.bio || '', createdAt: u.created_at || '', lastLogin: u.last_login || ''
      };
      dispatch({ type: 'LOGIN', payload: user });
      addToast('Welcome back, ' + user.name + '!', 'success');
      return true;
    } catch {
      addToast('Cannot connect to the server/database.', 'error');
      return false;
    }
  };

  const register = async (name: string, email: string, username: string, password: string, freeFireId = ''): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), username: username.trim(), password, freeFireId: freeFireId.trim() }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        addToast(json?.message || 'Registration failed.', 'error');
        return false;
      }
      const u = json.data;
      const user: User = {
        id: u.id, email: u.email || email, name: u.name || name, username: u.username || username,
        freeFireId: u.free_fire_id || freeFireId, avatarUrl: '', role: u.role || 'USER', status: 'ACTIVE',
        bio: '', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString()
      };
      dispatch({ type: 'REGISTER_USER', payload: user });
      addToast('Account created! Welcome to ZyroBattle!', 'success');
      return true;
    } catch {
      addToast('Cannot connect to the server/database.', 'error');
      return false;
    }
  };

  const createAdmin = async (name: string, email: string, username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        addToast(json?.message || 'Admin setup failed.', 'error');
        return false;
      }
      const u = json.data;
      const user: User = { id: u.id, email: u.email, name: u.name, username: u.username, freeFireId: '', avatarUrl: '', role: 'ADMIN', status: 'ACTIVE', bio: 'Platform administrator', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() };
      dispatch({ type: 'REGISTER_USER', payload: user });
      dispatch({ type: 'COMPLETE_ADMIN_SETUP' });
      addToast('Admin account created!', 'success');
      return true;
    } catch {
      addToast('Cannot connect to the server/database.', 'error');
      return false;
    }
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* ignore */ }
    dispatch({ type: 'LOGOUT' });
    addToast('Logged out.', 'info');
  };

  const getTournament = (id: string) => state.tournaments.find(t => t.id === id);
  const getTeam = (id: string) => state.teams.find(t => t.id === id);
  const getMatch = (id: string) => state.matches.find(m => m.id === id);
  const getUser = (id: string) => state.users.find(u => u.id === id);

  const getLeaderboard = (tournamentId?: string): LeaderboardEntry[] => {
    let results = state.matchResults;
    if (tournamentId) results = results.filter(r => r.tournamentId === tournamentId);
    const aggregated = new Map<string, LeaderboardEntry>();
    for (const result of results) {
      const existing = aggregated.get(result.participantId);
      if (existing) {
        existing.kills += result.kills; existing.totalPoints += result.totalPoints; existing.matchesPlayed += 1;
        if (result.placement === 1) existing.championships += 1;
        if (result.placement <= 3) existing.placements += 1;
      } else aggregated.set(result.participantId, {
        rank: 0, participantId: result.participantId, participantName: result.participantName,
        participantType: 'PLAYER', kills: result.kills, placements: result.placement <= 3 ? 1 : 0,
        matchesPlayed: 1, totalPoints: result.totalPoints, championships: result.placement === 1 ? 1 : 0,
        userId: result.participantId, username: result.participantName, points: result.totalPoints, wins: result.placement === 1 ? 1 : 0, losses: result.placement > 1 ? 1 : 0, tournamentsPlayed: 1,
      });
    }
    return Array.from(aggregated.values()).sort((a,b) => b.totalPoints-a.totalPoints || b.kills-a.kills).map((e,i) => ({...e, rank:i+1}));
  };

  return <AppContext.Provider value={{ state, dispatch, addToast, login, register, createAdmin, logout, getTournament, getTeam, getMatch, getUser, getLeaderboard, hasAdmin, addAdminLog }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
