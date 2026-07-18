import { graphql, useLazyLoadQuery } from "react-relay";
import { Outlet } from "@tanstack/react-router";
import { UserMenu } from "./user-menu";
import type { authenticatedLayoutQuery } from "@/__generated__/authenticatedLayoutQuery.graphql";

// One query at the layout level — all child fragments compose into this
const LayoutQuery = graphql`
  query authenticatedLayoutQuery {
    me {
      # Spread fragments from child components —
      # Relay fetches all of this in one request
      ...userMenuFragment
    }
  }
`;

export function AuthenticatedLayout() {
  const data = useLazyLoadQuery<authenticatedLayoutQuery>(LayoutQuery, {});

  // me is null if the cookie expired between the Jotai check and this render.
  // This is the rare race condition — handle it gracefully.
  if (!data.me) {
    // Token expired between route guard and here — just show a message
    // The auto-refresh plugin should handle this, but defensively:
    return <div>Session expired. Please log in again.</div>;
  }

  return (
    <div className="flex min-h-svh">
      <aside>
        {/* UserMenu receives a fragment ref — not the whole user object */}
        <UserMenu user={data.me} />
      </aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
