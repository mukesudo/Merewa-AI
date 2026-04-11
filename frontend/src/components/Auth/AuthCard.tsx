"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  GitPullRequest,
  Globe,
  KeyRound,
  Mail,
  UserRound,
} from "lucide-react";

import { authClient } from "../../lib/auth-client";

type Mode = "sign-in" | "sign-up";
type SignInMethod = "email" | "username";

const providers = [
  {
    id: "google",
    label: "Continue with Google",
    enabled: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    enabled: Boolean(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID),
  },
] as const;

interface AuthCardProps {
  mode: Mode;
}

export default function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const enabledProviders = providers.filter((provider) => provider.enabled);

  const [signInMethod, setSignInMethod] = useState<SignInMethod>("email");
  const [formState, setFormState] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    preferredLanguage: "am",
  });
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    void authClient.getSession().then((result) => {
      if (active && result.data?.user) {
        router.replace("/feed");
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  const title = useMemo(
    () =>
      mode === "sign-in"
        ? "Return to your voice-first feed"
        : "Create your Merewa identity",
    [mode],
  );

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const checkUsername = async () => {
    if (!formState.username.trim()) {
      setUsernameStatus("Choose a username to continue.");
      return;
    }
    const result = await authClient.isUsernameAvailable({
      username: formState.username.trim(),
    });
    if (result.error) {
      setUsernameStatus(result.error.message ?? "Could not validate username.");
      return;
    }
    setUsernameStatus(
      result.data?.available
        ? "Username is available."
        : "That username is already taken.",
    );
  };

  const handleEmailSignIn = async () => {
    const result = await authClient.signIn.email({
      email: formState.email,
      password: formState.password,
      callbackURL: "/feed",
      rememberMe: true,
    });
    if (result.error) {
      throw new Error(result.error.message ?? "Sign-in failed.");
    }
    router.push("/feed");
  };

  const handleUsernameSignIn = async () => {
    const result = await authClient.signIn.username({
      username: formState.username,
      password: formState.password,
      callbackURL: "/feed",
      rememberMe: true,
    });
    if (result.error) {
      throw new Error(result.error.message ?? "Username sign-in failed.");
    }
    router.push("/feed");
  };

  const handleSignUp = async () => {
    const availability = await authClient.isUsernameAvailable({
      username: formState.username.trim(),
    });
    if (availability.data?.available === false) {
      throw new Error("That username is already taken.");
    }
    const result = await authClient.signUp.email({
      name: formState.name,
      email: formState.email,
      password: formState.password,
      username: formState.username,
      preferredLanguage: formState.preferredLanguage,
      callbackURL: "/feed",
    });
    if (result.error) {
      throw new Error(result.error.message ?? "Sign-up failed.");
    }
    router.push("/feed");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-up") {
        await handleSignUp();
      } else if (signInMethod === "email") {
        await handleEmailSignIn();
      } else {
        await handleUsernameSignIn();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocial = async (provider: "google" | "github") => {
    setStatus(null);
    const result = await authClient.signIn.social({
      provider,
      callbackURL: "/feed",
    });
    if (result.error) {
      setStatus(result.error.message ?? `${provider} sign-in failed.`);
    }
  };

  return (
    <section className="auth-card glass-panel">
      <div className="auth-copy">
        <span className="eyebrow">Authentication</span>
        <h1>{title}</h1>
        <p>
          Better Auth powers email, username, and social sign-in while the
          FastAPI backend handles profiles, feed ranking, AI, and followers.
        </p>
      </div>

      {enabledProviders.length ? (
        <div className="auth-socials">
          {enabledProviders.map((provider) => (
            <button
              key={provider.id}
              className="auth-social"
              onClick={() => void handleSocial(provider.id)}
              type="button"
            >
              {provider.id === "google" ? (
                <Globe size={18} />
              ) : (
                <GitPullRequest size={18} />
              )}
              {provider.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-text">
          Social sign-in appears automatically when Google or GitHub client IDs
          are configured.
        </p>
      )}

      <div className="auth-divider">
        <span>or use credentials</span>
      </div>

      {mode === "sign-in" ? (
        <div className="auth-switcher">
          <button
            className={`auth-switch ${signInMethod === "email" ? "active" : ""}`}
            type="button"
            onClick={() => setSignInMethod("email")}
          >
            <Mail size={16} />
            Email
          </button>
          <button
            className={`auth-switch ${signInMethod === "username" ? "active" : ""}`}
            type="button"
            onClick={() => setSignInMethod("username")}
          >
            <UserRound size={16} />
            Username
          </button>
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <>
            <label className="field">
              <span>Name</span>
              <input
                required
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Selamawit Mekonnen"
              />
            </label>
            <label className="field">
              <span>Username</span>
              <div className="stack-inline">
                <input
                  required
                  value={formState.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  placeholder="selam_voice"
                />
                <button className="btn" type="button" onClick={() => void checkUsername()}>
                  Check
                </button>
              </div>
              {usernameStatus ? <small>{usernameStatus}</small> : null}
            </label>
          </>
        ) : null}

        {mode === "sign-in" && signInMethod === "username" ? (
          <label className="field">
            <span>Username</span>
            <input
              required
              value={formState.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="selam_voice"
            />
          </label>
        ) : (
          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              value={formState.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
            />
          </label>
        )}

        <label className="field">
          <span>Password</span>
          <input
            required
            type="password"
            minLength={8}
            value={formState.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Minimum 8 characters"
          />
        </label>

        {mode === "sign-up" ? (
          <label className="field">
            <span>Preferred language</span>
            <select
              value={formState.preferredLanguage}
              onChange={(event) =>
                updateField("preferredLanguage", event.target.value)
              }
            >
              <option value="am">Amharic</option>
              <option value="en">English</option>
            </select>
          </label>
        ) : null}

        {status ? <p className="status-banner error">{status}</p> : null}

        <button className="btn btn-primary auth-submit" type="submit" disabled={isSubmitting}>
          <KeyRound size={16} />
          {isSubmitting
            ? "Working..."
            : mode === "sign-in"
              ? "Enter Merewa"
              : "Create account"}
          <ArrowRight size={16} />
        </button>
      </form>

      <p className="auth-footer">
        {mode === "sign-in" ? "Need an account?" : "Already have an account?"}{" "}
        <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"}>
          {mode === "sign-in" ? "Sign up" : "Sign in"}
        </Link>
      </p>
    </section>
  );
}
