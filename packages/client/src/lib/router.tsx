import { createRouter as reactRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { store } from "@/lib/store";
import { isAuthenticatedAtom } from "@/lib/atoms/auth";

function createRouter() {
  return reactRouter({
    context: {
      // Read from jotai store synchronously — no network call
      get isAuthenticated() {
        return store.get(isAuthenticatedAtom);
      }
    },
    routeTree,
    scrollRestoration: true,
    notFoundMode: "fuzzy",
    defaultPreload: "intent",

    // This will ensure that the loader is always called when the route is preloaded or visited
    defaultPreloadStaleTime: 0, // @see (link: https://tanstack.com/router/latest/docs/framework/react/guide/preloading#preloading-with-external-libraries)
  });
}

export const router = createRouter();
