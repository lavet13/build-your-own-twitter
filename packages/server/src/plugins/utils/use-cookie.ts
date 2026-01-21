import type { CookieListItem } from "@whatwg-node/cookie-store";

export const cookieOpts = (
  expires: CookieListItem["expires"]
): CookieListItem => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  domain: process.env.NODE_ENV === "production" ? process.env.DOMAIN : null,
  expires,
});
