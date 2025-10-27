export interface User {
  username?: string;
  email?: string;
  isAdmin?: boolean;
}

export interface Match {
  matchId: string;
  [key: string]: any;
}
