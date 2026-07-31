import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { NAV_LINKS, PROFILE } from "@/data/portfolio";
import { assetUrl } from "@/lib/assets";

const LINK_CLASS =
  "font-display font-medium no-underline rounded-full px-[15px] py-[8px] text-muted-portfolio hover:text-white transition-colors";
const LINK_STYLE = { fontSize: 14.5 } as const;

const RESUME_CLASS =
  "font-display font-semibold no-underline rounded-full px-[16px] py-[8px] text-white transition-colors";
const RESUME_STYLE = {
  fontSize: 14.5,
  background: "rgba(47,155,255,0.14)",
  border: "1px solid rgba(93,182,255,0.35)",
} as const;

const MENU_ID = "mobile-nav-menu";

/**
 * Fixed top bar. Section links are plain anchors while on the landing page and
 * router links back to it from anywhere else, so they keep working off-route.
 */
export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/";
  const [open, setOpen] = useState(false);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Shared renderer so desktop and mobile stay in sync.
  const renderLink = (
    l: (typeof NAV_LINKS)[number],
    className: string,
    style: React.CSSProperties,
  ) => {
    if (l.to) {
      return (
        <Link
          key={l.label}
          to={l.to}
          className={className}
          style={style}
          onClick={() => setOpen(false)}
        >
          {l.label}
        </Link>
      );
    }
    if (onLanding) {
      return (
        <a
          key={l.label}
          href={`#${l.section}`}
          className={className}
          style={style}
          onClick={() => setOpen(false)}
        >
          {l.label}
        </a>
      );
    }
    return (
      <Link
        key={l.label}
        to="/"
        hash={l.section}
        className={className}
        style={style}
        onClick={() => setOpen(false)}
      >
        {l.label}
      </Link>
    );
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        padding: "20px clamp(24px,5vw,80px)",
        backdropFilter: "blur(8px)",
        background: "rgba(0,0,5,0.35)",
      }}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Link to="/" hash="home" className="flex items-center gap-3 no-underline">
        <img
          src={assetUrl(PROFILE.logo)}
          alt="Sai logo"
          style={{
            width: 38,
            height: 38,
            borderRadius: "9999px",
            boxShadow: "0 0 16px rgba(47,155,255,0.5)",
          }}
        />
        <span className="font-display font-semibold text-white" style={{ fontSize: 18 }}>
          {PROFILE.name}
          <b className="text-accent-bright">.</b>
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((l) => renderLink(l, LINK_CLASS, LINK_STYLE))}
        <a
          href={assetUrl(PROFILE.resumeUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${RESUME_CLASS} ml-1`}
          style={RESUME_STYLE}
        >
          Résumé
        </a>
      </div>

      {/* Mobile hamburger toggle */}
      <button
        type="button"
        className="md:hidden flex items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={{
          width: 42,
          height: 42,
          background: "rgba(47,155,255,0.14)",
          border: "1px solid rgba(93,182,255,0.35)",
          backdropFilter: "blur(8px)",
        }}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {/* Mobile dropdown sheet */}
      {open && (
        <div
          id={MENU_ID}
          className="md:hidden absolute right-[clamp(24px,5vw,80px)] top-full flex flex-col gap-1"
          style={{
            marginTop: 10,
            padding: 12,
            minWidth: 200,
            borderRadius: 18,
            background: "rgba(0,0,5,0.85)",
            border: "1px solid rgba(93,182,255,0.25)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          {NAV_LINKS.map((l) =>
            renderLink(
              l,
              `${LINK_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright`,
              LINK_STYLE,
            ),
          )}
          <a
            href={assetUrl(PROFILE.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${RESUME_CLASS} mt-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright`}
            style={RESUME_STYLE}
            onClick={() => setOpen(false)}
          >
            Résumé
          </a>
        </div>
      )}
    </motion.nav>
  );
}
