import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/auth";

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
export function unauthorized() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}
export function notFound(msg = "Não encontrado") {
  return NextResponse.json({ error: msg }, { status: 404 });
}
export function conflict(msg: string) {
  return NextResponse.json({ error: msg }, { status: 409 });
}
export function serverError(e: unknown) {
  console.error(e);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

export async function requireSession(): Promise<Session | NextResponse> {
  const s = await getSession();
  if (!s) return unauthorized();
  return s;
}

// Maps Prisma Decimal/BigInt to plain JSON. Mostly a passthrough since we use Int for money.
export function json<T>(data: T) {
  return NextResponse.json(data);
}
