import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { MessagesList } from "./-shared/messages-list";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { userId } = useAuth(); // just the ID from JWT — no network call

  return (
    <Suspense fallback={<div>Loading messages...</div>}>
      <MessagesList userId={userId!} />
    </Suspense>
  );
}
