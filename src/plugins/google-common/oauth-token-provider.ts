/**
 * Interface for obtaining OAuth2 access tokens for Google APIs.
 * Gmail and Calendar plugins depend on this to authenticate requests.
 *
 * Replace StubOAuthProvider with a real adapter once OAuth2 infrastructure is ready.
 */
export interface OAuthTokenProvider {
  getAccessToken(userId: string, scopes: string[]): Promise<string>;
}
