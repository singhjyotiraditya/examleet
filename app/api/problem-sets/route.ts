import { NextRequest } from "next/server";
import * as ProblemSetController from "@/controllers/problemSet.controller";

export const GET = (req: NextRequest) => ProblemSetController.list(req);
export const POST = (req: NextRequest) => ProblemSetController.create(req);
