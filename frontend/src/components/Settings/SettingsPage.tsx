"use client";

import { useState } from "react";

import { authClient } from "../../lib/auth-client";
import { updateCurrentProfile } from "../../lib/api";
import useStore from "../../store/useStore";
import type { UserProfileResponse } from "../../types/api";
import Avatar from "../UI/Avatar";

interface SettingsPageProps {
  initialProfile: UserProfileResponse;
}

export default function SettingsPage({ initialProfile }: SettingsPageProps) {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const showFollowLists = useStore((state) => state.showFollowLists);
  const setShowFollowLists = useStore((state) => state.setShowFollowLists);
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  const [profileForm, setProfileForm] = useState({
    username: initialProfile.user.username,
    display_name: initialProfile.user.display_name ?? "",
    bio: initialProfile.user.bio ?? "",
    preferred_language: initialProfile.user.preferred_language,
    avatar_url: initialProfile.user.avatar_url ?? "",
    location: initialProfile.user.location ?? "",
    website: initialProfile.user.website ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileStatus(null);

    try {
      const authResult = await authClient.updateUser({
        name: profileForm.display_name,
        image: profileForm.avatar_url || null,
        username: profileForm.username,
        preferredLanguage: profileForm.preferred_language,
        bio: profileForm.bio,
        location: profileForm.location,
        website: profileForm.website,
      });
      if (authResult.error) {
        throw new Error(authResult.error.message ?? "Could not update auth profile.");
      }

      const nextProfile = await updateCurrentProfile(profileForm);
      setCurrentUser(nextProfile);
      setProfileStatus("Profile updated across Better Auth and the FastAPI profile store.");
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Could not save profile.");
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordStatus(null);
    try {
      const result = await authClient.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not change password.");
      }
      setPasswordStatus("Password updated and other sessions were revoked.");
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : "Could not change password.");
    }
  };

  return (
    <div className="settings-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <form className="settings-card glass-panel" onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', borderRadius: '1.5rem' }}>
        <span className="eyebrow" style={{ color: 'var(--accent-green)' }}>Profile settings</span>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Update your public identity</h1>
        <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <label className="field">
            <span>Username</span>
            <input
              value={profileForm.username}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Display name</span>
            <input
              value={profileForm.display_name}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  display_name: event.target.value,
                }))
              }
            />
          </label>
          <div className="field">
            <span>Avatar preview</span>
            <Avatar src={profileForm.avatar_url} alt={profileForm.username} className="sidebar-avatar" />
          </div>
          <label className="field">
            <span>Avatar URL</span>
            <input
              value={profileForm.avatar_url}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  avatar_url: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Preferred language</span>
            <select
              value={profileForm.preferred_language}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  preferred_language: event.target.value,
                }))
              }
            >
              <option value="am">Amharic</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            <span>Location</span>
            <input
              value={profileForm.location}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Website</span>
            <input
              value={profileForm.website}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  website: event.target.value,
                }))
              }
            />
          </label>
          <label className="field full">
            <span>Bio</span>
            <textarea
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              rows={5}
            />
          </label>
        </div>
        {profileStatus ? <p className="status-banner">{profileStatus}</p> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-primary" type="submit" style={{ padding: '0.8rem 2rem', borderRadius: '2rem', fontSize: '1.1rem' }}>
            Save profile
          </button>
        </div>
      </form>

      <section className="settings-card glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <span className="eyebrow">Appearance</span>
        <h2>Theme Mode</h2>
        <p className="muted-text">Choose how Merewa looks on your device.</p>
        
        <div className="auth-switcher" style={{ marginTop: '1.2rem' }}>
          <button 
            className={`auth-switch ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            type="button"
          >
            Light
          </button>
          <button 
            className={`auth-switch ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            type="button"
          >
            Dark
          </button>
          <button 
            className={`auth-switch ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
            type="button"
            style={{ gridColumn: 'span 2' }}
          >
            Use System Setting
          </button>
        </div>
      </section>

      <section className="settings-card glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <span className="eyebrow">Privacy</span>
        <h2>Profile Visibility</h2>
        <p className="muted-text">Control what information others see on your profile.</p>
        
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <input 
            type="checkbox" 
            checked={showFollowLists} 
            onChange={(e) => setShowFollowLists(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>Show followers and following lists on my profile</span>
        </label>
      </section>

      <form className="settings-card glass-panel" onSubmit={handlePasswordSave} style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <span className="eyebrow" style={{ color: 'var(--accent-red)' }}>Security</span>
        <h2>Change password</h2>
        <label className="field">
          <span>Current password</span>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            minLength={8}
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
          />
        </label>
        {passwordStatus ? <p className="status-banner">{passwordStatus}</p> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-primary" type="submit" style={{ padding: '0.8rem 2rem', borderRadius: '2rem', fontSize: '1.1rem' }}>
            Update password
          </button>
        </div>
      </form>

      <section className="settings-card glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <span className="eyebrow">Session</span>
        <h2>Account Operations</h2>
        <p className="muted-text">Safely sign out of your current Merewa session.</p>
        
        <button 
          className="btn btn-primary" 
          style={{ background: 'var(--accent-red)', marginTop: '1.2rem', width: '100%' }}
          onClick={async () => {
            await authClient.signOut();
            window.location.href = "/";
          }}
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
