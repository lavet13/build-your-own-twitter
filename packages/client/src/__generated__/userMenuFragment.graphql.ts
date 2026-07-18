/**
 * @generated SignedSource<<5093ead87ba03ef86609fdbb941fb1f8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type userMenuFragment$data = {
  readonly displayName: string | null | undefined;
  readonly profile: {
    readonly avatar: string | null | undefined;
  } | null | undefined;
  readonly unreadMessageCount: number;
  readonly username: string | null | undefined;
  readonly " $fragmentType": "userMenuFragment";
};
export type userMenuFragment$key = {
  readonly " $data"?: userMenuFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"userMenuFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "userMenuFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "displayName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "username",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "unreadMessageCount",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "Profile",
      "kind": "LinkedField",
      "name": "profile",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "avatar",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "User",
  "abstractKey": null
};

(node as any).hash = "1292407fd7b58269293d05cd28c3d592";

export default node;
