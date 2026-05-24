import { NextRequest } from "next/server";
import * as UserController from "@/controllers/user.controller";

export const GET = (req: NextRequest) => UserController.getMe(req);
export const PATCH = (req: NextRequest) => UserController.updateMe(req);
