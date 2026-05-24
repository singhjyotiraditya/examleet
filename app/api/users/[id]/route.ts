import { NextRequest } from "next/server";
import * as UserController from "@/controllers/user.controller";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return UserController.getUser(req, id);
};
