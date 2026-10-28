import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "./ContactIcons";

const GITHUB_URL = "https://github.com/shadymansour19";
const LINKEDIN_URL = "https://www.linkedin.com/in/shadymansour19";
const EMAIL = "shadymansour19@gmail.com";
const WHATSAPP_PHONE = "201069360912";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function LinkedinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <path d="M2 9h4v12H2z" />
      <path d="M4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

/**
 * Small "Developed by" credit, shown at the very bottom of every layout
 * (public, admin, and the login page) — same pattern as the `timesheet`
 * project's `credit()` component, translated to this app's React/Tailwind
 * stack. Contact links are the developer's own (not the store's — that's
 * Footer.tsx/ContactWidget), each a circular bordered icon button that
 * picks up the brand color on hover/focus.
 */
export function DeveloperCredit() {
  const { t, i18n } = useTranslation();
  const name = i18n.language.startsWith("ar") ? "شادي منصور" : "Shady Mansour";

  const links: { label: string; href: string; icon: ReactNode }[] = [
    { label: "GitHub", href: GITHUB_URL, icon: <GithubIcon /> },
    { label: "LinkedIn", href: LINKEDIN_URL, icon: <LinkedinIcon /> },
    { label: "Email", href: `mailto:${EMAIL}`, icon: <MailIcon /> },
    { label: "WhatsApp", href: `https://wa.me/${WHATSAPP_PHONE}`, icon: <WhatsAppIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="credit flex flex-col items-center gap-1.5 py-4 text-xs text-neutral-500">
      <p className="font-label">
        {t("credit.developedBy")} <span className="dev-name">{name}</span>
      </p>
      <div className="flex items-center gap-2.5">
        {links.map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-emerald-600 hover:text-emerald-700"
          >
            {icon}
          </a>
        ))}
      </div>
    </div>
  );
}
