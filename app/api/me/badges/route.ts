import { NextRequest } from "next/server";
import * as BadgeController from "@/controllers/badge.controller";

export const GET = (req: NextRequest) => BadgeController.getMyBadges(req);
