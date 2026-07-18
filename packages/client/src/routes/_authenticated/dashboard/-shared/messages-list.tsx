import { graphql, useLazyLoadQuery } from "react-relay";
import { MessageItem } from "./message-item";
import type { messagesListQuery } from "@/__generated__/messagesListQuery.graphql";

const MessagesQuery = graphql`
  query messagesListQuery($userId: ID!) {
    user(id: $userId) {
      sentMessagesConnection(first: 20) {
        edges {
          node {
            id
            ...messageItemFragment
          }
        }
      }
    }
  }
`;

type MessagesListProps = {
  userId: string;
};

export function MessagesList({ userId }: MessagesListProps) {
  const data = useLazyLoadQuery<messagesListQuery>(MessagesQuery, { userId });

  const edges = data.user?.sentMessagesConnection?.edges ?? [];

  return (
    <ul>
      {edges.map((edge) => {
        if (!edge?.node) return null;
        return (
          <li key={edge.node.id}>
            {/* Pass fragment ref — MessageItem owns its data declaration */}
            <MessageItem message={edge.node} />
          </li>
        );
      })}
    </ul>
  );
}
