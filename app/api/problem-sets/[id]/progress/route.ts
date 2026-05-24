import { NextRequest } from "next/server";
import * as ProblemSetController from "@/controllers/problemSet.controller";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return ProblemSetController.getProgress(req, id);
};
