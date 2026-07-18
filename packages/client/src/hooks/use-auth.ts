import { isAuthenticatedAtom, jwtPayloadAtom, setAuthTokenAtom } from "@/lib/atoms/auth";
import { useAtomValue, useSetAtom } from "jotai";
import { router } from "@/lib/router";

// @TODO: https://tanstack.com/router/latest/docs/framework/react/how-to/setup-rbac#3-using-permission-guards
export const useAuth = () => {
  const setToken = useSetAtom(setAuthTokenAtom);
  const payload = useAtomValue(jwtPayloadAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const login = async (search?: { redirect?: string }) => {
     // Token is already set by the server via httpOnly cookie —
    // we just invalidate the router so protected routes re-check
    await router.invalidate();
    await router.navigate({ to: search?.redirect ?? "/" });
  };

  const logout = async () => {
    setToken(null);
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  return {
    // Lightweight auth state — from JWT, no network call
    isAuthenticated,
    userId: payload?.userId ?? null,
    email: payload?.email ?? null,
    login,
    logout,
  };
};
