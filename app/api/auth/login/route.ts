import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { badRequest, json, serverError } from "@/lib/api";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos");

    const ident = parsed.data.identifier.trim().toLowerCase();
    const user = await db.user.findFirst({
      where: { OR: [{ handle: ident }, { email: ident }] },
    });
    if (!user) return badRequest("Usuário não encontrado");

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return badRequest("Senha incorreta");

    await createSession({ userId: user.id, handle: user.handle });
    return json({ ok: true, userId: user.id, handle: user.handle });
  } catch (e) {
    return serverError(e);
  }
}
