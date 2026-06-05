import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateCode, sendVerificationCode } from "@/lib/email";
import { badRequest, conflict, json, serverError } from "@/lib/api";

const schema = z.object({ email: z.string().email() });

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MS = 60 * 1000;    // 1 código por minuto por email

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Email inválido");
    const email = parsed.data.email.trim().toLowerCase();

    // Email já cadastrado?
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return conflict("Esse email já tem conta. Use o login.");

    // Rate-limit: bloqueia se já mandou nos últimos 60s
    const recent = await db.emailVerification.findFirst({
      where: {
        email,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_MS) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent) return badRequest("Aguarde um minuto antes de pedir outro código.");

    // Gera + grava
    const code = generateCode();
    await db.emailVerification.create({
      data: { email, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });

    // Manda
    const sent = await sendVerificationCode(email, code);
    if (!sent.ok) {
      // Em dev sem Resend, ainda retorna ok mas com flag — pra você ver o código no log
      console.log(`[email send failed] code for ${email} is ${code} (${sent.error})`);
      return badRequest(sent.error ?? "Erro ao enviar email");
    }

    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
