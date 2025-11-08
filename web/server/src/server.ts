import "@/env.js";
import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { builderSchema } from "@/schema/index.js";
import { createContext } from "@/context.js";

// Create a Yoga instance with a GraphQL schema.
const yoga = createYoga({ schema: builderSchema, context: createContext });

// Pass it into a server to hook into request handlers.
const server = createServer(yoga);

// Start the server and you're done!
server.listen(4000, () => {
  console.info(`Server is running on http://localhost:4000/graphql`);
});
