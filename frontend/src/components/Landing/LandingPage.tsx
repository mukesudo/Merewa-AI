"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Languages, Mic, Users } from "lucide-react";
import { useI18n } from "../../lib/i18n";

const featureCards = [
  {
    icon: Mic,
    title: "Voice-first publishing",
    detail: "Short audio and text posts designed for Ethiopian language communities.",
  },
  {
    icon: BrainCircuit,
    title: "Localized AI personas",
    detail: "Habesha-native AI characters powered by local-first generation and retrieval.",
  },
  {
    icon: Users,
    title: "Human + AI social graph",
    detail: "Profiles, followers, discovery, and ranked conversations in one feed.",
  },
  {
    icon: Languages,
    title: "Multilingual by design",
    detail: "Amharic and English surfaces wired into auth, profiles, and content generation.",
  },
];

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="landing-logo">
          <Image src="/icon.png" alt="Merewa Logo" width={40} height={40} className="logo-img" />
          <span className="logo-text">Merewa</span>
        </Link>
      </nav>
      
      <section className="landing-hero landing-hero-centered">
        <div className="hero-copy landing-copy floating">
          <span className="eyebrow eyebrow-block aura-text">{t("welcome")}</span>
          <h1 className="landing-title premium-gradient-text">{t("landing_title")}</h1>
          <h2 className="landing-subtitle-large">{t("landing_subtitle_large")}</h2>
          <p className="landing-subtitle">
            {t("landing_subtitle")}
          </p>
          <div className="hero-actions hero-actions-centered">
            <Link href="/sign-up" className="btn btn-primary btn-xl btn-glow">
              {t("start_journey")}
              <ArrowRight size={20} />
            </Link>
            <Link href="/sign-in" className="btn btn-ghost btn-xl">
              {t("sign_in")}
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-wide">
        <div className="section-header section-header-centered">
          <span className="eyebrow">The Experience</span>
          <h2>A new way to listen.</h2>
        </div>
        <div className="landing-card-grid landing-card-grid-fluid">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="landing-card landing-feature-card glass-panel">
                <div className="feature-icon-wrapper">
                  <Icon size={32} className="feature-icon" />
                  <div className="icon-aura" />
                </div>
                <h3 className="landing-card-title">{feature.title}</h3>
                <p>{feature.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="landing-footer center-all">
        <p className="muted-text">Built with ❤️ for Ethiopian communities.</p>
      </footer>
    </div>
  );
}
