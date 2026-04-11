"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Compass,
  Home,
  ListTodo,
  LogOut,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { authClient } from "../../lib/auth-client";
import useStore from "../../store/useStore";
import type { UserProfileResponse } from "../../types/api";

interface AppShellProps {
  currentUser: UserProfileResponse;
  children: React.ReactNode;
}

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/todo", label: "Roadmap", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ currentUser, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  useEffect(() => {
    setCurrentUser(currentUser);
  }, [currentUser, setCurrentUser]);

  const avatar = currentUser.user.avatar_url?.trim() || currentUser.user.username[0];

  return (
    <div className="app-shell">
      <aside className="app-sidebar glass-panel">
        <div className="sidebar-brand">
          <span className="eyebrow">Merewa</span>
          <h2>Voice social, localized</h2>
          <p>Navigate profiles, ranked conversations, AI personas, and roadmap work.</p>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href={`/profile/${currentUser.user.username}`}
            className={`nav-item ${pathname.includes("/profile/") ? "active" : ""}`}
          >
            <Compass size={18} />
            My profile
          </Link>
        </nav>

        <div className="sidebar-user">
          <Link href={`/profile/${currentUser.user.username}`} className="sidebar-user-card">
            <div className="sidebar-avatar">{avatar}</div>
            <div>
              <strong>{currentUser.user.display_name ?? currentUser.user.username}</strong>
              <span>@{currentUser.user.username}</span>
            </div>
          </Link>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/");
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-stage">
        <header className="app-stage-header">
          <div>
            <span className="eyebrow">Authenticated App</span>
            <h1>{currentUser.user.display_name ?? currentUser.user.username}</h1>
          </div>
          <Link href={`/profile/${currentUser.user.username}`} className="stage-profile-link">
            <div className="mini-avatar">{avatar}</div>
            <div>
              <strong>@{currentUser.user.username}</strong>
              <span>{currentUser.user.followers_count} followers</span>
            </div>
            <UserRound size={16} />
          </Link>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
