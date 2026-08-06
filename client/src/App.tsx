import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { MemberAuthProvider, useMemberAuth } from "./context/MemberAuthContext";
import { AdminLayout } from "./components/AdminLayout";
import { MemberLayout } from "./components/MemberLayout";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { BooksPage } from "./pages/admin/BooksPage";
import { ScanPage } from "./pages/admin/ScanPage";
import { MembersPage } from "./pages/admin/MembersPage";
import { LogsPage } from "./pages/admin/LogsPage";
import { MemberLoginPage } from "./pages/member/MemberLoginPage";
import { CataloguePage } from "./pages/member/CataloguePage";
import { MyCardPage } from "./pages/member/MyCardPage";
import { BlogPage } from "./pages/member/BlogPage";
import { BulletinPage } from "./pages/member/BulletinPage";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { email, loading } = useAdminAuth();
  if (loading) return <div className="p-8 text-center text-sm text-ink-muted">Loading…</div>;
  if (!email) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function RequireMember({ children }: { children: ReactNode }) {
  const { name, loading } = useMemberAuth();
  if (loading) return <div className="p-8 text-center text-sm text-ink-muted">Loading…</div>;
  if (!name) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Admin surface */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/*"
        element={
          <RequireAdmin>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminLayout>
          </RequireAdmin>
        }
      />

      {/* Member surface (default) */}
      <Route path="/login" element={<MemberLoginPage />} />
      <Route
        path="/*"
        element={
          <RequireMember>
            <MemberLayout>
              <Routes>
                <Route path="/" element={<CataloguePage />} />
                <Route path="/my-card" element={<MyCardPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/bulletin" element={<BulletinPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MemberLayout>
          </RequireMember>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <MemberAuthProvider>
          <AppRoutes />
        </MemberAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
