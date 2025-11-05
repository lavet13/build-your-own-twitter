import SchemaBuilder from "@pothos/core";
// import RelayPlugin from "@pothos/plugin-relay";
// import PrismaPlugin from "@pothos/plugin-prisma";

const builder = new SchemaBuilder({});

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      resolve: () => "world",
    }),
  }),
});

export { builder };
