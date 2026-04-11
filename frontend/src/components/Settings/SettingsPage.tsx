"use client";

import { useState } from "react";

import { authClient } from "../../lib/auth-client";
import { updateCurrentProfile } from "../../lib/api";
import useStore from "../../store/useStore";
import type { UserProfileResponse } from "../../types/api";

interface SettingsPageProps {
  initialProfile: UserProfileResponse;
}

export default function SettingsPage({ initialProfile }: SettingsPageProps) {
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
    <div className="settings-grid">
      <form className="settings-card glass-panel" onSubmit={handleProfileSave}>
        <span className="eyebrow">Profile settings</span>
        <h1>Update your public identity</h1>
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
        <button className="btn btn-primary" type="submit">
          Save profile
        </button>
      </form>

      <form className="settings-card glass-panel" onSubmit={handlePasswordSave}>
        <span className="eyebrow">Security</span>
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
        <button className="btn btn-primary" type="submit">
          Update password
        </button>
      </form>
    </div>
  );
}
