/**
 * @generated SignedSource<<af65cb5c58dd6e61a9033a0865874d88>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type messageItemFragment$data = {
  readonly content: string | null | undefined;
  readonly isRead: boolean | null | undefined;
  readonly replyCount: number;
  readonly senderDisplayName: string | null | undefined;
  readonly " $fragmentType": "messageItemFragment";
};
export type messageItemFragment$key = {
  readonly " $data"?: messageItemFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"messageItemFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "messageItemFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "content",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isRead",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "senderDisplayName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "replyCount",
      "storageKey": null
    }
  ],
  "type": "Message",
  "abstractKey": null
};

(node as any).hash = "fdab5191f9e4deaddd0a5927a833c216";

export default node;
