import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BooksPage } from "./pages/BooksPage";
import { ScanPage } from "./pages/ScanPage";
import { MembersPage } from "./pages/MembersPage";
import { LogsPage } from "./pages/LogsPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { email, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-sm text-ink-muted">Loading…</div>;
  if (!email) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
