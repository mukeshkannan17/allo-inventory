import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("allo_user_id");
  response.cookies.delete("allo_user_name");
  return response;
}