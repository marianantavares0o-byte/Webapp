import { NextResponse } from "next/server";
import { authenticate, authCookieName, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!(await authenticate(email, password))) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    const session = await createSession(email);
    const response = NextResponse.json({ ok: true });

    response.cookies.set(authCookieName, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Não foi possível realizar o login." },
      { status: 400 },
    );
  }
}
