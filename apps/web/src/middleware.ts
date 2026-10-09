import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (/^\/catalogo\/(modelos|receitas)(?:\/|$)/.test(request.nextUrl.pathname)) {
    const destination = new URL("/pagina-nao-encontrada", request.url);
    destination.host = request.headers.get("host") ?? destination.host;
    return NextResponse.redirect(destination);
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
