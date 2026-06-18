import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as api from "../api";
import { ApiError } from "../api/client";
import { User } from "../types";

const TOKEN_KEY = "gamgee_token";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (input: {
    username: string;
    password: string;
    name: string;
    email: string;
    gender: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Run an authenticated call, signing out automatically on 401. */
  withAuth: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a persisted session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          const me = await api.getMe(saved);
          setToken(saved);
          setUser(me);
        }
      } catch {
        // Stale/invalid token — drop it and fall through to the auth screen.
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const t = await api.login(username, password);
    const me = await api.getMe(t);
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    setToken(t);
    setUser(me);
  }, []);

  const signUp = useCallback<AuthState["signUp"]>(async (input) => {
    await api.register(input);
    // Backend issues no token on register, so log in immediately afterwards.
    const t = await api.login(input.username, input.password);
    const me = await api.getMe(t);
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    setToken(t);
    setUser(me);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const withAuth = useCallback<AuthState["withAuth"]>(
    async (fn) => {
      if (!token) throw new ApiError(401, "Not signed in");
      try {
        return await fn(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
        }
        throw err;
      }
    },
    [token, signOut],
  );

  const value = useMemo<AuthState>(
    () => ({ token, user, loading, signIn, signUp, signOut, withAuth }),
    [token, user, loading, signIn, signUp, signOut, withAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
