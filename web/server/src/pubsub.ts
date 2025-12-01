import { createPubSub } from "graphql-yoga";

export type PubSubEvents = {
  COUNT_INCREMENT: [number];
};

export const pubSub = createPubSub<PubSubEvents>();
