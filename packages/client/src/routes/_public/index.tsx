import { createFileRoute } from "@tanstack/react-router";
import { HomePageContent } from "./-shared";
import { Suspend } from "@/components/suspend";

export const Route = createFileRoute("/_public/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspend>
      <HomePageContent />
    </Suspend>
  );
}
