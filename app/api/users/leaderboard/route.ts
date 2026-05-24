import { NextRequest } from "next/server";
import * as UserController from "@/controllers/user.controller";

export const GET = (req: NextRequest) => UserController.getLeaderboard(req);
