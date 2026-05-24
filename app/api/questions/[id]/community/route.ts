import { NextRequest } from "next/server";
import * as CommunityController from "@/controllers/community.controller";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return CommunityController.listNotes(req, id);
};

export const POST = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  return CommunityController.createNote(req, id);
};
