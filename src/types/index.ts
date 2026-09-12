export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'SUSPENDED';

export type TournamentMode = 'SOLO' | 'DUO' | 'SQUAD';
export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS' | 'LEAGUE' | 'CUSTOM';
export type TournamentStatus = 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'FULL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type MatchStatus = 'SCHEDULED' | 'UPCOMING' | 'ROOM_READY' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type TeamStatus = 'ACTIVE' | 'DISBANDED' | 'INACTIVE' | 'PENDING';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type ReportStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';
export type NotificationType = 'TOURNAMENT' | 'MATCH' | 'TEAM' | 'SYSTEM' | 'RESULT' | 'ROOM' | 'PAYMENT';
export type WhatsAppStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_REQUIRED' | 'CONNECTED' | 'ERROR';
export type WhatsAppMessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
export type RoomReleaseTime = 'IMMEDIATE' | '15_MIN' | '30_MIN' | '1_HOUR';

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  freeFireId: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
  bio: string;
  createdAt: string;
  lastLogin: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logo: string;
  description: string;
  captainId: string;
  memberIds: string[];
  requiredSize: number; // 2 for Duo, 4 for Squad
  wins: number;
  losses: number;
  totalPoints: number;
  createdAt: string;
  status: TeamStatus;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedBy: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string;
  logoUrl: string;
  // Legacy/UI compatibility fields
  gameId: string;
  platform: string;
  region: string;
  format: TournamentFormat;
  maxPlayersPerTeam: number;
  game: string;
  mode: TournamentMode; // SOLO, DUO, SQUAD
  entryFee: number;
  currency: string;
  maxParticipants: number; // max players/teams
  maxTeams: number;
  prizePool: number;
  prizeDistribution: {
    first: number;
    second: number;
    third: number;
    others?: { position: number; amount: number }[];
  };
  registrationStart: string;
  registrationEnd: string;
  tournamentDate: string;
  matchStartTime: string;
  timezone: string;
  // Free Fire specific
  map: string;
  matchNumber: number;
  round: string;
  killPoints: number;
  placementPoints: { position: number; points: number }[];
  roomReleaseTime: RoomReleaseTime;
  roomId: string;
  roomPassword: string;
  rules: string;
  status: TournamentStatus;
  participantIds: string[];
  teamIds: string[];
  whatsappAnnouncementSent: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  matchNumber: number;
  round: string;
  map: string;
  scheduledTime: string;
  roomId: string;
  roomPassword: string;
  status: MatchStatus;
  // Legacy/UI compatibility fields
  teamAId?: string;
  teamBId?: string;
  teamAName?: string;
  teamBName?: string;
  roundName?: string;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  createdAt: string;
}

export interface MatchResult {
  id: string;
  matchId: string;
  tournamentId: string;
  participantId: string; // user or team
  participantName: string;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  submittedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  tournamentId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface WhatsAppConfig {
  status: WhatsAppStatus;
  connectedAt: string | null;
  lastMessageAt: string | null;
  phoneNumber: string | null;
  destinationName: string;
  destinationId: string;
  enabled: boolean;
}

export interface WhatsAppMessage {
  id: string;
  eventType: string;
  tournamentId: string;
  tournamentName: string;
  message: string;
  destination: string;
  status: WhatsAppMessageStatus;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface WhatsAppNotificationSettings {
  newTournament: boolean;
  registrationOpen: boolean;
  registrationClosing: boolean;
  tournamentFull: boolean;
  tournamentStarting: boolean;
  matchScheduled: boolean;
  roomDetails: boolean;
  matchResult: boolean;
  tournamentCompleted: boolean;
  winnerAnnouncement: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  participantName: string;
  participantType: 'PLAYER' | 'TEAM';
  kills: number;
  placements: number;
  matchesPlayed: number;
  totalPoints: number;
  championships: number;
  // Legacy/UI compatibility fields
  userId: string;
  username: string;
  points: number;
  wins: number;
  losses: number;
  tournamentsPlayed: number;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: any;
  ipAddress: string;
  createdAt: string;
}
