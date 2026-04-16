import type { Plugin } from "graphql-yoga";
import { deleteAuthTokens, refreshTokens, setAuthTokensInCookies } from "@/auth/utils";
import { decodeJwt } from "jose";

export const useAutoRefreshTokens = (): Plugin => ({
  // https://the-guild.dev/graphql/yoga-server/docs/features/envelop-plugins#onrequestparse
  async onRequestParse({ request }) {
    // Skip CORS preflight (OPTIONS never has cookies anyway)
    if (request.method === "OPTIONS") return;

    if (new URL(request.url).pathname !== "/graphql") return;

    // very cheap filter no cookies header - definitely no tokens
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return;

    // even stricter our tokens aren't mentioned at all
    if (
      !cookieHeader.includes("accessToken") &&
      !cookieHeader.includes("refreshToken")
    ) {
      return;
    }

    const cookieStore = request.cookieStore;
    if (!cookieStore) return;

    // Get current tokens
    const [accessTokenCookie, refreshTokenCookie] = await Promise.all([
      cookieStore.get("accessToken"),
      cookieStore.get("refreshToken"),
    ]);

    const accessToken = accessTokenCookie?.value;
    const refreshToken = refreshTokenCookie?.value;

    // No refresh token nothing we can do
    if (!refreshToken) {
      if (accessToken) await cookieStore.delete("accessToken");
      return;
    }

    // Case 1: No access token at all → try refresh anyway (common after browser restart)
    // Case 2: Access token exists → check if expired
    let shouldRefresh = !accessToken;

    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload.exp) {
        // exp is in seconds, Date.now() is in milliseconds
        const isExpired = payload.exp * 1000 < Date.now();
        shouldRefresh = isExpired;
      } else {
        // No exp claim? Treat as expired / invalid
        shouldRefresh = true;
      }
    }

    if (!shouldRefresh) {
      return; // access token looks fine, continue
    }

    // ────────────────────────────────────────────────
    // At this point we decided it's worth trying refresh
    // ────────────────────────────────────────────────

    console.log(`[AutoRefresh] Access token missing/expired → refreshing`);

    const result = await refreshTokens(refreshToken);

    if (result.success && result.accessToken && result.refreshToken) {
      // Set new tokens in cookies
      await setAuthTokensInCookies(cookieStore, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      console.log(`[AutoRefresh] Success`);
    } else {
      console.warn(`[AutoRefresh] Failed: ${result.error}`);

      // Important: clean up both tokens
      await deleteAuthTokens(cookieStore);
    }
  },
});
