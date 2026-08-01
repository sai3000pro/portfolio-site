"use client";

import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Copy,
  ExternalLink,
  FileText,
  FolderGit2,
  Github,
  Home,
  Linkedin,
  Mail,
  Palette,
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
import { NAV_LINKS, PROFILE, PROJECTS, SOCIALS } from "@/data/portfolio";
import { assetUrl } from "@/lib/assets";

/**
 * Custom window event other components dispatch to open the palette. Kept as a
 * plain DOM event so no extra state library / provider is needed.
 */
const OPEN_EVENT = "portfolio:open-palette";

/**
 * Programmatically open the command palette from anywhere (e.g. a nav button).
 * SSR-safe: no-ops when there is no window.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

// Shared cmdk item styling to match the site's cosmic accent language.
const ITEM_CLASS =
  "font-display cursor-pointer gap-3 rounded-lg text-muted-portfolio " +
  "data-[selected=true]:bg-[rgba(47,155,255,0.14)] data-[selected=true]:text-white";

const GROUP_CLASS =
  "[&_[cmdk-group-heading]]:font-display [&_[cmdk-group-heading]]:text-accent-bright " +
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 " +
  "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold " +
  "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider";

// Icon per nav label, falling back to a neutral glyph.
const NAV_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  About: User,
  Experience: Briefcase,
  Projects: FolderGit2,
  Contact: Mail,
  Hobbies: Palette,
};

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
 * ⌘K / Ctrl+K command palette. Owns its open state, listens for the toggle
 * shortcut and the {@link OPEN_EVENT} custom event, and runs navigation,
 * project, and quick-action commands. Rendered under SSR/prerender, so every
 * window/document access lives inside effects or event handlers.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/";
  const prefersReduced = useReducedMotion();
  const scrollBehavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";

  // ⌘K / Ctrl+K toggles, Escape closes. Registered once on the client.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Let other components open the palette via a custom window event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Close the palette, then run the selected action.
  const runAction = (fn: () => void) => {
    setOpen(false);
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
      .then(() => toast.success("Email copied to clipboard"))
      .catch(() => toast.error("Couldn't copy email"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[640px] gap-0 overflow-hidden p-0"
        style={{
          background: "rgba(0,0,5,0.85)",
          border: "1px solid rgba(93,182,255,0.25)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 16px 60px rgba(0,0,0,0.55)",
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command className="bg-transparent text-white [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-[rgba(93,182,255,0.18)]">
          <CommandInput
            placeholder="Type a command or search…"
            className="font-display text-white placeholder:text-muted-portfolio"
          />
          <CommandList className="max-h-[360px] px-1 pb-2">
            <CommandEmpty className="font-display py-8 text-center text-sm text-muted-portfolio">
              No results found.
            </CommandEmpty>

            <CommandGroup heading="Navigate" className={GROUP_CLASS}>
              {NAV_LINKS.map((link) => {
                const Icon = NAV_ICONS[link.label] ?? ExternalLink;
                const keywords = [link.label, link.section, link.to].filter((v): v is string =>
                  Boolean(v),
                );
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
            </CommandGroup>

            <CommandSeparator className="my-1 bg-[rgba(93,182,255,0.15)]" />

            <CommandGroup heading="Projects" className={GROUP_CLASS}>
              {PROJECTS.map((project) => (
                <CommandItem
                  key={project.title}
                  value={`project ${project.title}`}
                  keywords={project.tech}
                  className={ITEM_CLASS}
                  onSelect={() => runAction(() => openInNewTab(project.link))}
                >
                  <FolderGit2 aria-hidden="true" />
                  <span>{project.title}</span>
                  <ExternalLink className="ml-auto opacity-50" aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-1 bg-[rgba(93,182,255,0.15)]" />

            <CommandGroup heading="Actions" className={GROUP_CLASS}>
              <CommandItem
                value="open résumé resume cv"
                className={ITEM_CLASS}
                onSelect={() => runAction(() => openInNewTab(assetUrl(PROFILE.resumeUrl)))}
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
