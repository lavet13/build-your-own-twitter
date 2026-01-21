import type { PubSub, YogaInitialContext } from "graphql-yoga";
import { pubSub, type PubSubEvents } from "@/pubsub";

export interface Context extends YogaInitialContext {
  pubSub: PubSub<PubSubEvents>;

  // just store the raw token, we don't actually have to verify it
  accessToken: string | null;
}

export async function createContext(
  initialContext: YogaInitialContext
): Promise<Context> {
  const accessTokenCookie = await initialContext.request.cookieStore?.get({
    name: "accessToken",
  });

  return {
    ...initialContext,
    pubSub,
    accessToken: accessTokenCookie?.value || null,
  };
}
