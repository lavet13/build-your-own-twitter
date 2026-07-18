/**
 * @generated SignedSource<<91ce3290519d07b2c6fc98f4a0061e8e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type authenticatedLayoutQuery$variables = Record<PropertyKey, never>;
export type authenticatedLayoutQuery$data = {
  readonly me: {
    readonly " $fragmentSpreads": FragmentRefs<"userMenuFragment">;
  } | null | undefined;
};
export type authenticatedLayoutQuery = {
  response: authenticatedLayoutQuery$data;
  variables: authenticatedLayoutQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "authenticatedLayoutQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "User",
        "kind": "LinkedField",
        "name": "me",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "userMenuFragment"
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "authenticatedLayoutQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "User",
        "kind": "LinkedField",
        "name": "me",
        "plural": false,
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
              },
              (v0/*: any*/)
            ],
            "storageKey": null
          },
          (v0/*: any*/)
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "85ac43e6c11f8bc71fedeef8bcc0fe9f",
    "id": null,
    "metadata": {},
    "name": "authenticatedLayoutQuery",
    "operationKind": "query",
    "text": "query authenticatedLayoutQuery {\n  me {\n    ...userMenuFragment\n    id\n  }\n}\n\nfragment userMenuFragment on User {\n  displayName\n  username\n  unreadMessageCount\n  profile {\n    avatar\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "896092427adf4a567c353b342857c301";

export default node;
