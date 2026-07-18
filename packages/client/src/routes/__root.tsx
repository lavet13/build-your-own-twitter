import * as React from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NProgress } from "@/components/nprogress";

type RouterContext = {
  isAuthenticated: boolean;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <HeadContent />
      <NProgress />
      <Outlet />
      <Scripts />
      <TanStackRouterDevtools position="bottom-right" initialIsOpen={false} />
    </React.Fragment>
  );
}
