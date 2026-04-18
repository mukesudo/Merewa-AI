"use client";

import { useState } from "react";
import { MonitorSmartphone, MoonStar, SunMedium } from "lucide-react";

import { authClient } from "../../lib/auth-client";
import { updateCurrentProfile, uploadMedia } from "../../lib/api";
import useStore from "../../store/useStore";
import type { UserProfileResponse } from "../../types/api";
import Avatar from "../UI/Avatar";
import { Camera, Loader2 } from "lucide-react";

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setProfileStatus("Uploading new avatar...");

    try {
      const { url } = await uploadMedia(file);
      setProfileForm((prev) => ({ ...prev, avatar_url: url }));
      setProfileStatus("Avatar uploaded. Don't forget to save your profile!");
    } catch (err) {
      setProfileStatus("Avatar upload failed. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
    <div className="settings-page">
      <form className="settings-card settings-card-form glass-panel" onSubmit={handleProfileSave}>
        <div className="settings-heading">
          <span className="eyebrow eyebrow-accent-green">Profile settings</span>
          <h1>Update your public identity</h1>
        </div>
        <div className="field-grid">
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
            <span>Avatar</span>
            <div className="avatar-upload-trigger">
                <Avatar src={profileForm.avatar_url} alt={profileForm.username} className="sidebar-avatar" />
                <label className="avatar-upload-overlay center-all">
                    {isUploadingAvatar ? <Loader2 className="spinner" size={20} /> : <Camera size={20} />}
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarFileChange} 
                        hidden 
                        disabled={isUploadingAvatar}
                    />
                </label>
            </div>
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
        <div className="settings-actions">
          <button className="btn btn-primary btn-pill" type="submit">
            Save profile
          </button>
        </div>
      </form>

      <section className="settings-card glass-panel">
        <span className="eyebrow">Appearance</span>
        <h2>Theme Mode</h2>
        <p className="muted-text">Choose how Merewa looks on your device.</p>

        <div className="theme-switcher" role="tablist" aria-label="Theme mode">
          <button
            className={`theme-option ${theme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
            type="button"
          >
            <SunMedium size={18} />
            <span className="theme-option-copy">
              <strong>Light</strong>
              <small>Warm surfaces and crisp contrast.</small>
            </span>
          </button>
          <button
            className={`theme-option ${theme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
            type="button"
          >
            <MoonStar size={18} />
            <span className="theme-option-copy">
              <strong>Dark</strong>
              <small>Low-glare panels for immersive browsing.</small>
            </span>
          </button>
          <button
            className={`theme-option ${theme === "system" ? "active" : ""}`}
            onClick={() => setTheme("system")}
            type="button"
          >
            <MonitorSmartphone size={18} />
            <span className="theme-option-copy">
              <strong>System</strong>
              <small>Follow your device preference automatically.</small>
            </span>
          </button>
        </div>
      </section>

      <section className="settings-card glass-panel">
        <span className="eyebrow">Profile shortcuts</span>
        <h2>Follow List Links</h2>
        <p className="muted-text">
          Choose whether follower and following list links appear while you browse profiles on this device.
        </p>

        <label className="settings-toggle-row">
          <input
            className="settings-checkbox"
            type="checkbox"
            checked={showFollowLists}
            onChange={(e) => setShowFollowLists(e.target.checked)}
          />
          <span className="settings-toggle-copy">
            <strong>Show follower and following shortcuts</strong>
            <small>When disabled, profile stats stay visible but list routes are hidden locally.</small>
          </span>
        </label>
      </section>

      <form className="settings-card settings-card-form glass-panel" onSubmit={handlePasswordSave}>
        <span className="eyebrow eyebrow-accent-red">Security</span>
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
        <div className="settings-actions">
          <button className="btn btn-primary btn-pill" type="submit">
            Update password
          </button>
        </div>
      </form>

      <section className="settings-card glass-panel">
        <span className="eyebrow">Session</span>
        <h2>Account Operations</h2>
        <p className="muted-text">Safely sign out of your current Merewa session.</p>

        <button
          className="btn btn-danger btn-block"
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
