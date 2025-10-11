import * as React from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NProgress } from "@/components/nprogress";

export const Route = createRootRoute({
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
