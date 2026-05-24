import { NextRequest } from "next/server";
import * as ContestController from "@/controllers/contest.controller";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return ContestController.getMyRegistration(req, id);
};

export const POST = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return ContestController.register(req, id);
};

export const DELETE = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return ContestController.unregister(req, id);
};
