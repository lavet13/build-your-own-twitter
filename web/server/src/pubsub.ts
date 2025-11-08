import { createPubSub } from "graphql-yoga";

export type PubSubEvents = {
};

export const pubsub = createPubSub<PubSubEvents>();
