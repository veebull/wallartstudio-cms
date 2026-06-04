import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin requires auth
    // one
    if (pathname.startsWith("/admin") && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (
          pathname.startsWith("/admin") ||
          pathname.startsWith("/api/articles") ||
          pathname.startsWith("/api/agent") ||
          pathname.startsWith("/api/analytics") ||
          pathname.startsWith("/api/templates")
        ) {
          return !!token;
        }
        return true;
      },
    },
  },
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/articles/:path*",
    "/api/agent/:path*",
    "/api/analytics/:path*",
    "/api/templates/:path*",
  ],
};
