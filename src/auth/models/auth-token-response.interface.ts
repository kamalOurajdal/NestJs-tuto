export interface LoginTokenResponse {
  access_token: string;
  refresh_token?: string;
}

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
}
