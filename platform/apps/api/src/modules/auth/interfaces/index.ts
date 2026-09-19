// ============================================================
// AUTH INTERFACES
// ============================================================

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  type?: string;
}

export interface JwtPayloadWithRefreshToken extends JwtPayload {
  refreshToken: string;
}

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}
