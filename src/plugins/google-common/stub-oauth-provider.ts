import type { OAuthTokenProvider } from "./oauth-token-provider.js";

/**
 * Stub that throws a clear error when OAuth is not yet configured.
 * Replace with OAuthManagerAdapter once the OAuth2 infrastructure is merged.
 */
export class StubOAuthProvider implements OAuthTokenProvider {
  async getAccessToken(_userId: string, _scopes: string[]): Promise<string> {
    throw new Error(
      "OAuth not configured. Google account connection is required for this feature. " +
        "Please connect your Google account in Settings to use Gmail and Calendar."
    );
  }
}
