import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Session refresh middleware (Next 16 convention)
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images and the PDF stream (token-authorized).
    "/((?!_next/static|_next/image|favicon.ico|api/pdf/stream|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)",
  ],
};
