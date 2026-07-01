import { getProfile } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; displayName: string }) => Promise<string>;
  resetPassword: (email: string) => Promise<string>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authParamsFromUrl(url: string) {
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const query = url.includes("?") ? url.split("?")[1]?.split("#")[0] : "";
  const params = new URLSearchParams(hash || query || "");

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    errorCode: params.get("error_code"),
    errorDescription: params.get("error_description")
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(Boolean(supabase));
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const user = session?.user ?? null;

  const refreshProfileForSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setProfile(null);
      return;
    }

    const nextProfile = await getProfile(nextSession.user.id);
    setProfile(nextProfile);
  }, []);

  const createSessionFromUrl = useCallback(
    async (url: string | null) => {
      if (!supabase || !url) {
        return;
      }

      const { accessToken, errorCode, errorDescription, refreshToken } = authParamsFromUrl(url);

      if (errorCode) {
        throw new Error(errorDescription ?? errorCode);
      }

      if (!accessToken || !refreshToken) {
        return;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        throw error;
      }

      setSession(data.session);
      await refreshProfileForSession(data.session);
    },
    [refreshProfileForSession]
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      await refreshProfileForSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      refreshProfileForSession(nextSession).catch(() => setProfile(null));
    });

    Linking.getInitialURL()
      .then((url) => createSessionFromUrl(url))
      .catch(() => undefined);

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      createSessionFromUrl(url).catch(() => undefined);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [createSessionFromUrl, refreshProfileForSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      profile,
      isAdmin: profile?.role === "admin",
      async signIn(email, password) {
        if (!supabase) {
          throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          throw error;
        }
      },
      async signUp({ email, password, displayName }) {
        if (!supabase) {
          throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim()
            },
            emailRedirectTo: Linking.createURL("/")
          }
        });

        if (error) {
          throw error;
        }

        return data.session
          ? "회원가입이 완료되었습니다."
          : "인증 메일을 보냈습니다. 이메일 인증 후 로그인해주세요.";
      },
      async resetPassword(email) {
        if (!supabase) {
          throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Linking.createURL("/reset-password")
        });

        if (error) {
          throw error;
        }

        return "비밀번호 재설정 메일을 보냈습니다.";
      },
      async updatePassword(password) {
        if (!supabase) {
          throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          throw error;
        }
      },
      async signOut() {
        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
      async refreshProfile() {
        await refreshProfileForSession(session);
      }
    }),
    [loading, profile, refreshProfileForSession, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }

  return value;
}
