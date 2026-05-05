import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { signIn, signOut, getCurrentUser, fetchAuthSession } from "aws-amplify/auth";

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
