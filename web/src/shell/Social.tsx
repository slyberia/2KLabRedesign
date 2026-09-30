import type { ReactNode } from "react";
import { EXT_DESC_ID } from "./links";

// NBA2KLab's official accounts. Simple line icons drawn here (not the platforms' logo files),
// each with a visible name for screen readers and a tooltip.
export const YOUTUBE_URL = "https://www.youtube.com/@2KLabs";

const ICON = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const SOCIAL: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: "YouTube",
    href: YOUTUBE_URL,
    icon: <svg {...ICON}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" /></svg>,
  },
  {
    name: "Twitter",
    href: "https://twitter.com/NBA2kLab",
    icon: <svg {...ICON}><path d="M4 4l16 16M20 4L4 20" /></svg>,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@nba2klabyt",
    icon: <svg {...ICON}><path d="M13.5 3.5v11a3.5 3.5 0 1 1-3.5-3.5" /><path d="M13.5 3.5c.6 2.6 2.4 4.2 5 4.5" /></svg>,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/nba2klabyt",
    icon: <svg {...ICON}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" /></svg>,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/NBA2KLab",
    icon: <svg {...ICON}><path d="M14.5 21v-8h2.7l.4-3.2h-3.1V7.9c0-.9.3-1.6 1.6-1.6h1.6V3.5a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.3H8.6V13h2.7v8" /></svg>,
  },
];

export function SocialLinks() {
  return (
    <ul className="sh-social" aria-label="NBA2KLab on social media">
      {SOCIAL.map((s) => (
        <li key={s.name}>
          <a href={s.href} target="_blank" rel="noopener" title={s.name} aria-describedby={EXT_DESC_ID}>
            <span aria-hidden="true">{s.icon}</span>
            <span className="sh-sr">NBA2KLab on {s.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
