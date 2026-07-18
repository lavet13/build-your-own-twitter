import { createClient as createWSClient } from "graphql-ws";
import {
  Environment,
  Network,
  Observable,
  RecordSource,
  Store,
  type FetchFunction,
  type GraphQLResponse,
  type RequestParameters,
  type Variables,
} from "relay-runtime";

// Vite replaces import.meta.env.VITE_API_URL at build time.
// In dev: falls back to localhost.
// In prod CI: set via environment variable in the build step.

// HTTP endpoint for queries and mutations
const HTTP_ENDPOINT = import.meta.env.VITE_API_URL ?? "http://localhost:4000/graphql";
const WS_ENDPOINT = import.meta.env.VITE_API_URL ?? "ws://localhost:4000/graphql";

const wsClient = createWSClient({
  url: WS_ENDPOINT,
});

const fetchQuery: FetchFunction = async (request, variables) => {
  const response = await fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

// Subscribe function for subscriptions (using graphql-ws)
const subscribe = (
  operation: RequestParameters,
  variables: Variables,
): Observable<GraphQLResponse> => {
  return Observable.create((sink) => {
    return wsClient.subscribe(
      {
        operationName: operation.name,
        query: operation.text!,
        variables,
      },
      {
        next: (value) => sink.next(value as GraphQLResponse),
        error: (error) => sink.error(error as Error),
        complete: () => sink.complete(),
      },
    );
  });
};

const environment = new Environment({
  network: Network.create(fetchQuery, subscribe),
  store: new Store(new RecordSource()),
});

export { environment };
