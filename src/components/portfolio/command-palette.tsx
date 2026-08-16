"use client";

import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Camera,
  Copy,
  ExternalLink,
  FileText,
  FolderGit2,
  Gamepad2,
  Github,
  HeartHandshake,
  Home,
  Linkedin,
  Mail,
  Palette,
  PenLine,
  Sparkles,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CONSOLE_CODE_WORD, KEYS } from "@/data/achievements";
import { NAV_LINKS, PROFILE, PROJECTS, SOCIALS, type NavLink } from "@/data/portfolio";
import { trackMember, unlock } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
import { claimKeyboardWarrior, setPaletteOpen, usePaletteOpen } from "@/lib/command-palette";

// Shared cmdk item styling to match the site's cosmic accent language.
const ITEM_CLASS =
  "font-display cursor-pointer gap-3 rounded-lg text-muted-portfolio " +
  "data-[selected=true]:bg-[var(--portfolio-surface-2)] data-[selected=true]:text-[var(--portfolio-ink)]";

const GROUP_CLASS =
  "[&_[cmdk-group-heading]]:font-display [&_[cmdk-group-heading]]:text-[var(--portfolio-accent-bright)] " +
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 " +
  "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold " +
  "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider";

// Icon per nav label, falling back to a neutral glyph. Every label reachable from
// NAV_LINKS needs an entry, children included: the lookup below falls back to
// ExternalLink, which would silently mislabel an internal route as off-site.
const NAV_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  About: User,
  Experience: Briefcase,
  Projects: FolderGit2,
  Contact: Mail,
  "Beyond the Code": Palette,
  Photography: Camera,
  Blog: PenLine,
  Gaming: Gamepad2,
  Volunteering: HeartHandshake,
};

/**
 * NAV_LINKS flattened to one palette entry per destination.
 *
 * The bar collapses "Beyond the Code"'s children into a dropdown to stay six items
 * wide; the palette has the opposite problem and no width at all, so each child
 * gets to be its own searchable row — typing "gallery" should land on the gallery,
 * not on the hub it used to live in. The parent stays too: /hobbies is a real page
 * and NAV_LINKS is the only thing on the site that links to it.
 */
const NAV_DESTINATIONS: NavLink[] = NAV_LINKS.flatMap((link) => [link, ...(link.children ?? [])]);

// Icon per social label.
const SOCIAL_ICONS: Record<string, LucideIcon> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Email: Mail,
};

/** Open an external URL in a new tab without leaking the opener reference. */
function openInNewTab(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * ⌘K / Ctrl+K command palette: navigation, project, and quick-action commands.
 *
 * CODE-SPLIT. This module pulls in cmdk, the Radix dialog and a dozen icons, so
 * it is loaded on demand — `routes/__root.tsx` renders it behind `React.lazy`
 * once the palette is first opened, and nothing here is on the critical path of
 * any route. The pieces that must survive that (the ⌘K listener, the open state,
 * `openCommandPalette()`, and the Keyboard Warrior input flags) live eagerly in
 * lib/command-palette.ts; see the file header there for why each one has to.
 *
 * Consequently the open state is READ from that store rather than owned here:
 * the keypress that opens the palette happens before this component exists, and
 * it must not be lost while the chunk is in flight.
 */
export function CommandPalette() {
  const open = usePaletteOpen();
  // Controlled so the console easter-egg item can require an exact match rather
  // than surfacing under cmdk's fuzzy scoring.
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/";
  const prefersReduced = useReducedMotion();
  const scrollBehavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";

  // Clear the search on every open so a stale query (including the easter-egg
  // word) doesn't persist. The "opened the palette" achievement is unlocked by
  // the eager store instead, so it still fires when the palette is opened and
  // closed again before this chunk has finished loading.
  useEffect(() => {
    if (!open) return;
    setSearch("");
  }, [open]);

  // Close the palette, then run the selected action. The Keyboard Warrior check
  // reads flags maintained by the eager listener, which has been watching every
  // keydown and pointerdown since the root mounted — not just since this chunk
  // arrived, which would let a click made during the fetch go unnoticed.
  const runAction = (fn: () => void) => {
    claimKeyboardWarrior();
    setPaletteOpen(false);
    fn();
  };

  // Landing anchors scroll smoothly in place; off-route we route home + hash.
  const goToSection = (section: string) => {
    if (onLanding) {
      document.getElementById(section)?.scrollIntoView({ behavior: scrollBehavior });
    } else {
      navigate({ to: "/", hash: section });
    }
  };

  const copyEmail = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard unavailable");
      return;
    }
    navigator.clipboard
      .writeText(PROFILE.email)
      .then(() => {
        unlock("copy-that");
        toast.success("Email copied to clipboard");
      })
      .catch(() => toast.error("Couldn't copy email"));
  };

  return (
    <Dialog open={open} onOpenChange={setPaletteOpen}>
      <DialogContent
        className="max-w-[640px] gap-0 overflow-hidden p-0"
        style={{
          background: "var(--portfolio-sheet)",
          border: "1px solid var(--portfolio-border-strong)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 16px 60px var(--portfolio-shadow)",
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command className="bg-transparent text-ink [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-[var(--portfolio-border)]">
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search…"
            className="font-display text-ink placeholder:text-[var(--portfolio-muted)]"
          />
          <CommandList className="max-h-[360px] px-1 pb-2">
            <CommandEmpty className="font-display py-8 text-center text-sm text-muted-portfolio">
              No results found.
            </CommandEmpty>

            <CommandGroup heading="Navigate" className={GROUP_CLASS}>
              {NAV_DESTINATIONS.map((link) => {
                const Icon = NAV_ICONS[link.label] ?? ExternalLink;
                // The bare path as well as the routed one, so "gallery" scores as
                // a prefix match rather than having to fuzzy past the leading "/".
                const keywords = [
                  link.label,
                  link.section,
                  link.to,
                  link.to?.replace(/^\//, ""),
                ].filter((v): v is string => Boolean(v));
                return (
                  <CommandItem
                    key={link.label}
                    value={`nav ${keywords.join(" ")}`}
                    keywords={keywords}
                    className={ITEM_CLASS}
                    onSelect={() =>
                      runAction(() => {
                        if (link.to) {
                          navigate({ to: link.to });
                        } else if (link.section) {
                          goToSection(link.section);
                        }
                      })
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>{link.label}</span>
                  </CommandItem>
                );
              })}

              {/* Not in NAV_LINKS, and no longer in the nav at all — the trophy
                  button was pulled from the bar and the sheet. This row, the
                  "See all achievements" link on an unlock toast, and the URL are
                  what /achievements is reachable by now, so it stays. */}
              <CommandItem
                value="nav achievements trophies badges"
                keywords={["achievements", "trophies", "badges"]}
                className={ITEM_CLASS}
                onSelect={() => runAction(() => navigate({ to: "/achievements" }))}
              >
                <Trophy aria-hidden="true" />
                <span>Achievements</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="my-1 bg-[var(--portfolio-border)]" />

            <CommandGroup heading="Projects" className={GROUP_CLASS}>
              {PROJECTS.map((project) => (
                <CommandItem
                  key={project.title}
                  value={`project ${project.title}`}
                  keywords={project.tech}
                  className={ITEM_CLASS}
                  onSelect={() => runAction(() => openInNewTab(assetUrl(project.link)))}
                >
                  <FolderGit2 aria-hidden="true" />
                  <span>{project.title}</span>
                  <ExternalLink className="ml-auto opacity-50" aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-1 bg-[var(--portfolio-border)]" />

            {/* The console easter egg. Rendered only on an exact match so cmdk's
                fuzzy scoring can't surface it to someone who just typed "s". */}
            {search.trim().toLowerCase() === CONSOLE_CODE_WORD && (
              <CommandGroup heading="???" className={GROUP_CLASS}>
                <CommandItem
                  value={CONSOLE_CODE_WORD}
                  className={ITEM_CLASS}
                  onSelect={() => runAction(() => unlock("inspector-gadget"))}
                >
                  <Sparkles aria-hidden="true" />
                  <span>Claim your badge</span>
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="Actions" className={GROUP_CLASS}>
              <CommandItem
                value="open résumé resume cv"
                className={ITEM_CLASS}
                onSelect={() =>
                  runAction(() => {
                    unlock("paper-trail");
                    openInNewTab(assetUrl(PROFILE.resumeUrl));
                  })
                }
              >
                <FileText aria-hidden="true" />
                <span>Open Résumé</span>
                <ExternalLink className="ml-auto opacity-50" aria-hidden="true" />
              </CommandItem>

              <CommandItem
                value="copy email address"
                keywords={[PROFILE.email]}
                className={ITEM_CLASS}
                onSelect={() => runAction(copyEmail)}
              >
                <Copy aria-hidden="true" />
                <span>Copy email</span>
                <span className="ml-auto text-xs text-muted-portfolio">{PROFILE.email}</span>
              </CommandItem>

              {SOCIALS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label] ?? ExternalLink;
                const isMailto = social.href.startsWith("mailto:");
                return (
                  <CommandItem
                    key={social.label}
                    value={`social ${social.label}`}
                    className={ITEM_CLASS}
                    onSelect={() =>
                      runAction(() => {
                        trackMember(KEYS.socials, social.label);
                        if (isMailto) {
                          window.location.href = social.href;
                        } else {
                          openInNewTab(social.href);
                        }
                      })
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>{social.label}</span>
                    {!isMailto && (
                      <ExternalLink className="ml-auto opacity-50" aria-hidden="true" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
