import path from "node:path";
import { config } from "dotenv";

config();

export default {
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
};
