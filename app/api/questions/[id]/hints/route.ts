import { NextRequest } from "next/server";
import * as QuestionController from "@/controllers/question.controller";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return QuestionController.getHints(req, id);
};
