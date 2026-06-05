import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, json, serverError } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");
    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.replace(/\D/g, "");

    // Procura o código mais recente desse email que não venceu nem foi usado
    const v = await db.emailVerification.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!v) return badRequest("Código expirado ou não solicitado. Peça outro.");

    if (v.attempts >= MAX_ATTEMPTS) {
      return badRequest("Muitas tentativas erradas. Peça outro código.");
    }

    if (v.code !== code) {
      await db.emailVerification.update({
        where: { id: v.id },
        data: { attempts: v.attempts + 1 },
      });
      return badRequest("Código incorreto");
    }

    // Marca como usado
    await db.emailVerification.update({
      where: { id: v.id },
      data: { usedAt: new Date() },
    });

    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
