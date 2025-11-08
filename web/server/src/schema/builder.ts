import SchemaBuilder from "@pothos/core";
import RelayPlugin from "@pothos/plugin-relay";
import PrismaPlugin from "@pothos/plugin-prisma";

import { prisma } from "@/db.js";
import type PrismaTypes from "../../lib/pothos-prisma-types.js";
import type { Context } from "@/context.js";

const builder = new SchemaBuilder<{
  Context: Context;
  PrismaTypes: PrismaTypes;
}>({
  plugins: [RelayPlugin, PrismaPlugin],
  prisma: {
    client: prisma,
  },
});

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      resolve: () => "world",
    }),
  }),
});

export { builder };
