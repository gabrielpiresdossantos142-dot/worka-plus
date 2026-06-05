import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { badRequest, conflict, json, serverError } from "@/lib/api";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7"];

const schema = z.object({
  handle: z.string().min(3).max(32).regex(/^[a-z0-9._]+$/),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  type: z.enum(["EMPRESA", "FREELANCER", "AMBOS"]),
  docNumber: z.string(),
  bio: z.string().optional(),
  hourlyRate: z.number().int().optional(), // já em centavos
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");

    const d = parsed.data;
    const docDigits = d.docNumber.replace(/\D/g, "");
    const isCnpj = d.type === "EMPRESA";
    if (docDigits.length !== (isCnpj ? 14 : 11)) {
      return badRequest(`${isCnpj ? "CNPJ" : "CPF"} precisa ter ${isCnpj ? 14 : 11} dígitos`);
    }

    const conflictHit = await db.user.findFirst({
      where: { OR: [
        { handle: d.handle.toLowerCase() },
        { email: d.email.toLowerCase() },
        { docNumber: docDigits },
      ]},
      select: { handle: true, email: true, docNumber: true },
    });
    if (conflictHit) {
      let what = "Dado";
      if (conflictHit.handle === d.handle.toLowerCase()) what = "Handle";
      else if (conflictHit.email === d.email.toLowerCase()) what = "E-mail";
      else if (conflictHit.docNumber === docDigits) what = isCnpj ? "CNPJ" : "CPF";
      return conflict(`${what} já está em uso`);
    }

    const hash = await bcrypt.hash(d.password, 10);
    const user = await db.user.create({
      data: {
        handle: d.handle.toLowerCase(),
        email: d.email.toLowerCase(),
        passwordHash: hash,
        name: d.name.trim(),
        type: d.type,
        bio: d.bio?.trim() || null,
        hourlyRate: d.type !== "EMPRESA" ? (d.hourlyRate ?? null) : null,
        docType: isCnpj ? "CNPJ" : "CPF",
        docNumber: docDigits,
        verified: true,
        verifiedAt: new Date(),
        avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      },
      select: { id: true, handle: true },
    });

    await createSession({ userId: user.id, handle: user.handle });
    return json({ ok: true, userId: user.id, handle: user.handle });
  } catch (e) {
    return serverError(e);
  }
}
