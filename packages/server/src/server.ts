import "@/env";
import { createServer } from "node:http";
import { Socket } from "node:net";
import { createYoga } from "graphql-yoga";
import { schema } from "@/schema";
import { createContext } from "@/types";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";

const yoga = createYoga({
  schema: schema,
  context: createContext,
  plugins: [process.env.NODE_ENV === "production" && useDisableIntrospection()],
  graphiql: {
    subscriptionsProtocol: "WS",
  },
});

const server = createServer(yoga);

const wss = new WebSocketServer({
  server,
  path: yoga.graphqlEndpoint,
});

useServer(
  {
    execute: (args: any) => args.execute(args),
    subscribe: (args: any) => args.subscribe(args),
    onSubscribe: async (ctx, _id, params) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } =
        yoga.getEnveloped({
          ...ctx,
          req: ctx.extra.request,
          socket: ctx.extra.socket,
          params,
        });

      const args = {
        schema,
        operationName: params.operationName,
        document: parse(params.query),
        variableValues: params.variables,
        contextValue: await contextFactory(),
        execute,
        subscribe,
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;
      return args;
    },
  },
  wss
);

// Track connections for graceful shutdown
const sockets = new Set<Socket>();
server.on("connection", (socket) => {
  sockets.add(socket);
  server.once("close", () => sockets.delete(socket));
});

server.listen(4000, () => {
  console.info(`Server is running on http://localhost:4000/graphql`);
  console.info(`WebSocket subscriptions on ws://localhost:4000/graphql`);
});

process.on("SIGTERM", () => {
  console.info("SIGTERM signal received: closing HTTP server");
  for (const socket of sockets) {
    socket.destroy();
    sockets.delete(socket);
  }
  server.close(() => {
    console.info("HTTP server closed");
    process.exit(0);
  });
});
