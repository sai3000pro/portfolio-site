import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { NAV_LINKS, PROFILE } from "@/data/portfolio";
import { assetUrl } from "@/lib/assets";

const LINK_CLASS =
  "font-display font-medium no-underline rounded-full px-[15px] py-[8px] text-muted-portfolio hover:text-white transition-colors";
const LINK_STYLE = { fontSize: 14.5 } as const;

/**
 * Fixed top bar. Section links are plain anchors while on the landing page and
 * router links back to it from anywhere else, so they keep working off-route.
 */
export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/";

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
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((l) =>
          l.to ? (
            <Link key={l.label} to={l.to} className={LINK_CLASS} style={LINK_STYLE}>
              {l.label}
            </Link>
          ) : onLanding ? (
            <a key={l.label} href={`#${l.section}`} className={LINK_CLASS} style={LINK_STYLE}>
              {l.label}
            </a>
          ) : (
            <Link key={l.label} to="/" hash={l.section} className={LINK_CLASS} style={LINK_STYLE}>
              {l.label}
            </Link>
          ),
        )}
        <a
          href={assetUrl(PROFILE.resumeUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display font-semibold no-underline rounded-full px-[16px] py-[8px] text-white ml-1 transition-colors"
          style={{
            fontSize: 14.5,
            background: "rgba(47,155,255,0.14)",
            border: "1px solid rgba(93,182,255,0.35)",
          }}
        >
          Résumé
        </a>
      </div>
    </motion.nav>
  );
}
