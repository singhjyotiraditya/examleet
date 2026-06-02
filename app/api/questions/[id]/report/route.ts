import { NextRequest } from "next/server";
import * as QuestionController from "@/controllers/question.controller";

type Params = { params: Promise<{ id: string }> };

export const POST = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return QuestionController.report(req, id);
};
