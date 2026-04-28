"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import useStore from "../../store/useStore";
import type { UserProfileResponse } from "../../types/api";
import Avatar from "../UI/Avatar";
import CreatorModal from "../Feed/CreatorModal";

interface AppShellProps {
  currentUser: UserProfileResponse;
  children: React.ReactNode;
}

import { useI18n } from "../../lib/i18n";

const navItems = [
  { href: "/feed", key: "flow", icon: Home },
  { href: "/search", key: "ai_studio", icon: Search },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/admin", key: "admin", icon: ShieldCheck },
];

export default function AppShell({ currentUser, children }: AppShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const activeNavItem = navItems.find((item) => pathname.startsWith(item.href));
  const currentPageLabel =
    activeNavItem ? t(activeNavItem.key) : (pathname.startsWith("/profile") ? "Profile" : "Merewa");

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  useEffect(() => {
    setCurrentUser(currentUser);
  }, [currentUser, setCurrentUser]);

  return (
    <div className="app-shell" data-collapsed={isCollapsed}>
      <aside className="app-sidebar glass-panel">
        <div className="sidebar-brand">
          <Link href="/feed" className="brand-link">
            <h2 className="logo-large">Merewa</h2>
          </Link>
          <button
            className="btn sidebar-toggle-floating"
            onClick={toggleSidebar}
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
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
                title={isCollapsed ? t(item.key) : ""}
              >
                <Icon size={18} />
                {!isCollapsed && <span>{t(item.key)}</span>}
              </Link>
            );
          })}
          
          <button
            className="nav-item nav-item-create"
            onClick={() => setShowCreator(true)}
            type="button"
          >
            <Plus size={20} />
            {!isCollapsed && <span>{t("create")}</span>}
          </button>
        </nav>

        <div className="sidebar-user">
          <Link href={`/profile/${currentUser.user.username}`} className="sidebar-user-card" title={isCollapsed ? currentUser.user.username : ""}>
            <Avatar src={currentUser.user.avatar_url} alt={currentUser.user.username} className="sidebar-avatar" />
            {!isCollapsed && (
                <div className="sidebar-user-info">
                    <strong>{currentUser.user.display_name ?? currentUser.user.username}</strong>
                    <span>@{currentUser.user.username}</span>
                </div>
            )}
          </Link>
        </div>
      </aside>

      <div className="app-stage">
        <header className="app-stage-header">
          <div className="app-stage-spacer">
            <h1>{currentPageLabel}</h1>
          </div>
          <Link href={`/profile/${currentUser.user.username}`} className="stage-profile-link">
            <Avatar src={currentUser.user.avatar_url} alt={currentUser.user.username} className="mini-avatar" />
            <div>
              <strong>@{currentUser.user.username}</strong>
              <span>{currentUser.user.followers_count} followers</span>
            </div>
            <UserRound size={16} />
          </Link>
        </header>
        <div className="app-content">{children}</div>
      </div>

      {showCreator && (
        <CreatorModal 
          onClose={() => setShowCreator(false)} 
          preferredLanguage={currentUser.user.preferred_language} 
        />
      )}
    </div>
  );
}
