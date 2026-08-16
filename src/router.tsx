import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Smooth cross-route transitions via the native View Transitions API.
    // TanStack Router (v1.168+) wraps navigations in document.startViewTransition
    // when this is enabled, and silently no-ops in browsers that lack the API,
    // so it degrades gracefully. Reduced-motion is honored via CSS (see note in
    // the task report) rather than disabling transitions outright.
    defaultViewTransition: true,
  });

  return router;
};
