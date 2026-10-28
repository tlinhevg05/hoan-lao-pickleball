import { handle, json, siteData } from "@/lib/server";
export async function GET() {
  return handle(async () => json(await siteData()));
}
