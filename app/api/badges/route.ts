import { NextRequest } from "next/server";
import * as BadgeController from "@/controllers/badge.controller";

export const GET = (req: NextRequest) => BadgeController.listAll(req);
export const POST = (req: NextRequest) => BadgeController.create(req);
