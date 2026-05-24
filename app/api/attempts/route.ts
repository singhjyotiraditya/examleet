import { NextRequest } from "next/server";
import * as AttemptController from "@/controllers/attempt.controller";

export const GET = (req: NextRequest) => AttemptController.getMyAttempts(req);
export const POST = (req: NextRequest) => AttemptController.submit(req);
