/**
 * @generated SignedSource<<6b47e5587e17a533caba98fa5c149c2e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type userAvatarFragment$data = {
  readonly displayName: string | null | undefined;
  readonly profile: {
    readonly avatar: string | null | undefined;
  } | null | undefined;
  readonly username: string | null | undefined;
  readonly " $fragmentType": "userAvatarFragment";
};
export type userAvatarFragment$key = {
  readonly " $data"?: userAvatarFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"userAvatarFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "userAvatarFragment",
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

(node as any).hash = "21b2d24b153b7c592be1ced8733b7986";

export default node;
