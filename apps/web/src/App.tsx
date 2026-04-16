import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type VmInput } from "@/lib/api";
import { AdminPage } from "@/pages/AdminPage";
import { AccessPage } from "@/pages/AccessPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InstancesPage } from "@/pages/InstancesPage";
import { LoginPage } from "@/pages/LoginPage";
import { NetworksPage } from "@/pages/NetworksPage";
import { RequestsPage } from "@/pages/RequestsPage";
import { VmCreatePage } from "@/pages/VmCreatePage";
import { VmDetailPage } from "@/pages/VmDetailPage";
import { AppShell } from "@/components/AppShell";
import { type Me, type Session, type User } from "@/types";

type AuthContextValue = {
  session: Session | null;
  me: Me | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthContext");
  }
  return value;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!isAdmin(session?.user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.session.getCurrent().then((current) => {
      if (!active) return;
      setMe(current);
      if (current) {
        setSession({
          token: localStorage.getItem("vm-builder.token") ?? "session-restored",
          user: {
            id: current.id,
            fullName: current.fullName,
            email: current.email,
            role: current.role,
            authSource: current.authSource,
            isActive: current.isActive,
          },
        });
      } else {
        setSession(null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      me,
      signIn: async (email, password) => {
        const next = await api.session.signIn(email, password);
        setSession(next);
        const current = await api.session.getCurrent();
        setMe(current);
        navigate("/", { replace: true });
      },
      signOut: () => {
        api.session.signOut();
        setSession(null);
        setMe(null);
        navigate("/login", { replace: true });
      },
    }),
    [me, navigate, session],
  );

  return (
    <AuthContext.Provider value={value}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="instances" element={<InstancesPage />} />
          <Route path="instances/:vmId" element={<VmDetailPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="networks" element={<NetworksPage />} />
          <Route path="access" element={<AccessPage />} />
          <Route path="create" element={<VmCreatePage />} />
          <Route path="vms/new" element={<Navigate to="/create" replace />} />
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export async function createVm(input: VmInput) {
  return api.vms.create(input);
}

export function isAdmin(user: User | null | undefined) {
  return Boolean(user?.role === "admin");
}
