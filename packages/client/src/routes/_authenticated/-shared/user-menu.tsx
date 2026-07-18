import { graphql, useFragment } from "react-relay";
import type { userMenuFragment$key } from "@/__generated__/userMenuFragment.graphql";
import { useAuth } from "@/hooks/use-auth";

const UserMenuFragment = graphql`
  fragment userMenuFragment on User {
    displayName
    username
    unreadMessageCount
    profile {
      avatar
    }
  }
`;

type UserMenuProps = {
  user: userMenuFragment$key;
};

export function UserMenu({ user }: UserMenuProps) {
  // Rich profile data from Relay
  const data = useFragment(UserMenuFragment, user);

  // Auth actions from Jotai — logout doesn't need Relay
  const { logout } = useAuth();

  return (
    <nav>
      <div className="flex items-center gap-2">
        {data.profile?.avatar && (
          <img src={data.profile.avatar} alt="" width={32} height={32} />
        )}
        <span>{data.displayName ?? data.username}</span>
        {data.unreadMessageCount > 0 && (
          <span className="badge">{data.unreadMessageCount}</span>
        )}
      </div>
      <button onClick={() => logout()}>Logout</button>
    </nav>
  );
}
