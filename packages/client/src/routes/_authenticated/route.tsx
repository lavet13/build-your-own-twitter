import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { AuthenticatedLayout } from "./-shared/authenticated-layout";

export const Route = createFileRoute("/_authenticated")({
  // beforeLoad runs before render — synchronous check via context
  beforeLoad({ context, location }) {
    if (!context.isAuthenticated) {
      throw redirect({
        to: "/",
        search: { redirect: location.href },
        replace: true,
      });
    }
  },
  component: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthenticatedLayout />
    </Suspense>
  ),
});
