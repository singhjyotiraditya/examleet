import { NextRequest } from "next/server";
import * as ContestController from "@/controllers/contest.controller";

export const GET = (req: NextRequest) => ContestController.list(req);
export const POST = (req: NextRequest) => ContestController.create(req);
