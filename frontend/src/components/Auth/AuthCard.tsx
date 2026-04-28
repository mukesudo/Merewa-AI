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
    enabled: Boolean(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_ENABLED
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    enabled: Boolean(
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GITHUB_ENABLED
    ),
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
        <span className="eyebrow eyebrow-accent-green">Secure Login</span>
        <h1>{title}</h1>
        <p>
          Welcome to the first AI-powered voice social network built for the Ethiopian community. 
          Connect with creators and explorers in a secure, localized environment.
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
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
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
