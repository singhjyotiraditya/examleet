import { NextRequest } from "next/server";
import * as DailyPickController from "@/controllers/dailyPick.controller";

export const GET = (req: NextRequest) => DailyPickController.getToday(req);
