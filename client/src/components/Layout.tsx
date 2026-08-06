import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpenIcon,
  ClockIcon,
  HomeIcon,
  QrCodeIcon,
  UsersIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true, icon: HomeIcon },
  { to: "/books", label: "Books", icon: BookOpenIcon },
  { to: "/scan", label: "Scan", icon: QrCodeIcon },
  { to: "/members", label: "Members", icon: UsersIcon },
  { to: "/logs", label: "Activity", icon: ClockIcon },
];

export function Layout({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth();

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-10 border-b border-border-soft bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-plum">Library</span>
            <nav className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-ink-muted hover:bg-primary-soft/60 hover:text-primary"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <span className="hidden sm:inline">{email}</span>
            <button
              onClick={logout}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 font-medium text-ink hover:bg-primary-soft"
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
