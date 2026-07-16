export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly user: AuthUser;
}
