import { POST as chatPost, OPTIONS as chatOptions } from "@/app/api/chat/route";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Compatibility alias — prefer POST /api/chat. */
export async function POST(request: Request) {
  return chatPost(request);
}

export async function OPTIONS() {
  return chatOptions();
}
