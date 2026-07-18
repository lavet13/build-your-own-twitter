import { decodeJwt } from "jose";

export type JWTPayload = {
  userId: string;
  email: string;
  exp?: number;
  iat?: number;
};

export const decodeJWTPayload = (token: string): JWTPayload | null => {
  try {
    const payload = decodeJwt<JWTPayload>(token);
    if (!payload.exp) throw new Error("No exp claim");
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Expired");
    return payload;
  } catch {
    return null;
  }
};
