"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Compass,
  Home,
  ListTodo,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import useStore from "../../store/useStore";

import { authClient } from "../../lib/auth-client";
import type { UserProfileResponse } from "../../types/api";
import Avatar from "../UI/Avatar";
import CreatorModal from "../Feed/CreatorModal";
import { Plus } from "lucide-react";

interface AppShellProps {
  currentUser: UserProfileResponse;
  children: React.ReactNode;
}

const navItems = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/search", label: "Discovery", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ currentUser, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

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
          <div className="stack-inline" style={{ justifyContent: 'space-between', width: '100%' }}>
            {!isCollapsed && (
              <Link href="/feed" className="brand-link">
                <h2>Merewa</h2>
              </Link>
            )}
            <button className="btn" onClick={toggleSidebar} style={{ padding: '0.4rem' }}>
              {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
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
                title={isCollapsed ? item.label : ""}
              >
                <Icon size={18} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
          
          <button 
            className="nav-item plus-creator" 
            onClick={() => setShowCreator(true)}
            style={{ marginTop: 'auto', background: 'var(--accent-green)', color: '#fff', border: 0 }}
          >
            <Plus size={20} />
            {!isCollapsed && <span>Create</span>}
          </button>
        </nav>

        <div className="sidebar-user">
          <Link href={`/profile/${currentUser.user.username}`} className="sidebar-user-card">
            <Avatar src={currentUser.user.avatar_url} alt={currentUser.user.username} className="sidebar-avatar" />
            {!isCollapsed && (
                <div>
                    <strong>{currentUser.user.display_name ?? currentUser.user.username}</strong>
                    <span>@{currentUser.user.username}</span>
                </div>
            )}
          </Link>
        </div>
      </aside>

      <div className="app-stage">
        <header className="app-stage-header">
          <div /> {/* Spacer where name was */}
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
