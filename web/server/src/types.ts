import type { PubSub, YogaInitialContext } from "graphql-yoga";
import { pubSub, type PubSubEvents } from "@/pubsub";

export interface Context extends YogaInitialContext {
  pubSub: PubSub<PubSubEvents>;
}

export async function createContext(
  initialContext: YogaInitialContext
): Promise<Context> {
  return {
    ...initialContext,
    pubSub,
  };
}
