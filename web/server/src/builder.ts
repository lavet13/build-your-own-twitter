import SchemaBuilder from "@pothos/core"; // type ArgBuilder, // type InputFieldBuilder,
import RelayPlugin from "@pothos/plugin-relay";
import PrismaPlugin from "@pothos/plugin-prisma";
import MocksPlugin from "@pothos/plugin-mocks";

import { prisma } from "@/db";
import type PrismaTypes from "@/lib/pothos-prisma-types";
import { getDatamodel } from "@/lib/pothos-prisma-types";
import type { Context } from "@/types";

import { DateTimeResolver } from "graphql-scalars";

export interface PothosTypes {
  Context: Context;
  PrismaTypes: PrismaTypes;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
  };
}

/*
 * For building helpers (e.g. input fields, args)
 * */
export type TypesWithDefaults =
  PothosSchemaTypes.ExtendDefaultTypes<PothosTypes>;

/**
 * Schema Builder Configuration
 *
 * This file ONLY configures the builder - it does NOT define any schema types.
 * All type definitions should be in src/schema/ files.
 */
const builder = new SchemaBuilder<PothosTypes>({
  plugins: [RelayPlugin, PrismaPlugin, MocksPlugin],
  prisma: {
    client: prisma,
    dmmf: getDatamodel(),
    // warn when not using a query parameter correctly
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn",
  },
});

builder.addScalarType("DateTime", DateTimeResolver);

builder.queryType({});
// builder.mutationType({});
// builder.subscriptionType({});

export { builder };
