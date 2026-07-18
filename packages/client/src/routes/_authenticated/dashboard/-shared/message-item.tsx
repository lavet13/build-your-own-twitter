import { graphql, useFragment } from "react-relay";
import type { messageItemFragment$key } from "@/__generated__/messageItemFragment.graphql";

const MessageItemFragment = graphql`
  fragment messageItemFragment on Message {
    content
    isRead
    senderDisplayName
    replyCount
  }
`;

type MessageItemProps = {
  message: messageItemFragment$key;
};

export function MessageItem({ message }: MessageItemProps) {
  const data = useFragment(MessageItemFragment, message);

  return (
    <div className={data.isRead ? "opacity-60" : ""}>
      <p>{data.content}</p>
      <small>{data.senderDisplayName}</small>
      {data.replyCount > 0 && <span>{data.replyCount} replies</span>}
    </div>
  );
}
