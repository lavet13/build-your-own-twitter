import SchemaBuilder from "@pothos/core";
import RelayPlugin from "@pothos/plugin-relay";
import PrismaPlugin from "@pothos/plugin-prisma";

import { prisma } from "@/db";
import type PrismaTypes from "../lib/pothos-prisma-types";
import { getDatamodel } from "../lib/pothos-prisma-types";
import type { Context } from "@/context";

import { DateTimeResolver } from "graphql-scalars";

const builder = new SchemaBuilder<{
  Context: Context;
  PrismaTypes: PrismaTypes;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
  };
}>({
  plugins: [RelayPlugin, PrismaPlugin],
  prisma: {
    client: prisma,
    dmmf: getDatamodel(),
  },
});

builder.addScalarType("DateTime", DateTimeResolver);

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      resolve: () => "world",
    }),
  }),
});

export { builder };
