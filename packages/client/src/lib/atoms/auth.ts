import { atom } from "jotai";
import { atomWithCookie } from "@/lib/atom";
import { decodeJWTPayload } from "@/lib/jwt";

// Raw cookie-backed atom — single source of truth for the token
const rawTokenAtom = atomWithCookie<string | null>("accessToken", null);

// Write-only — validates before storing
export const setAuthTokenAtom = atom(
  null,
  (_get, set, token: string | null) => {
    if (token) {
      const payload = decodeJWTPayload(token);
      if (!payload) {
        set(rawTokenAtom, null);
        return;
      }
    }
    set(rawTokenAtom, token);
  }
);

// Derived — decoded payload or null
export const jwtPayloadAtom = atom((get) => {
  const token = get(rawTokenAtom);
  if (!token) return null;
  return decodeJWTPayload(token);
});

// Derived — simple boolean for route guards
export const isAuthenticatedAtom = atom((get) => !!get(jwtPayloadAtom));
