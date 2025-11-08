import "../lib/env.js";
import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "@/schema/index.js";
import { createContext } from "@/context.js";

// Create a Yoga instance with a GraphQL schema.
const yoga = createYoga({ schema, context: createContext });

// Pass it into a server to hook into request handlers.
const server = createServer(yoga);

const PORT = process.env.PORT || 4000;

// Start the server and you're done!
server.listen(4000, () => {
  console.info(`Server is running on http://localhost:${PORT}/graphql`);
});
