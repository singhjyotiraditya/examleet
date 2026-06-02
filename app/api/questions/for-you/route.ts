import { NextRequest } from "next/server";
import * as QuestionController from "@/controllers/question.controller";

export const GET = (req: NextRequest) => QuestionController.getForYou(req);
