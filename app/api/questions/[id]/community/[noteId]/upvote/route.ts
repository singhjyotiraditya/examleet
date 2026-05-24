import { NextRequest } from "next/server";
import * as CommunityController from "@/controllers/community.controller";

type Params = { params: Promise<{ noteId: string }> };

export const POST = async (req: NextRequest, { params }: Params) => {
  const { noteId } = await params;
  return CommunityController.upvoteNote(req, noteId);
};
