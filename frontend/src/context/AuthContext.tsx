import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { signIn, signOut, getCurrentUser, fetchAuthSession, signUp, confirmSignUp } from "aws-amplify/auth";

interface AuthUser {
  userId: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
  register: (username: string, email: string, password: string) => Promise<unknown>;
  verifyCode: (username: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const claims = session.tokens?.idToken?.payload;
      setUser({
        userId: currentUser.userId,
        email: (claims?.email as string) ?? "",
        username: currentUser.username,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    await signIn({ username: email, password });
    await checkCurrentUser();
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const getToken = async (): Promise<string> => {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? "";
  };

  const register = async (username: string, email: string, password: string) => {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          preferred_username: username,
        },
      },
    });
    return result;
  };

  const verifyCode = async (username: string, code: string) => {
    await confirmSignUp({
      username,
      confirmationCode: code,
    });
    await checkCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, register, verifyCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
