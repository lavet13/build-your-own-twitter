import { createRouter as reactRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

function createRouter() {
  return reactRouter({
    context: {},
    routeTree,
    scrollRestoration: true,
    notFoundMode: "fuzzy",
    defaultPreload: "intent",

    // This will ensure that the loader is always called when the route is preloaded or visited
    defaultPreloadStaleTime: 0, // @see (link: https://tanstack.com/router/latest/docs/framework/react/guide/preloading#preloading-with-external-libraries)
  });
}

export const router = createRouter();
