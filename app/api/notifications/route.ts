import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const schema = z.object({
  userId: z.string(),
  text: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");

    const n = await db.notification.create({
      data: {
        userId: parsed.data.userId,
        text: parsed.data.text,
      },
      select: { id: true },
    });
    return json({ ok: true, id: n.id });
  } catch (e) {
    return serverError(e);
  }
}

const markSchema = z.object({ ids: z.array(z.string()).optional() });

// PATCH /api/notifications — marca como lidas (todas do user, ou só os ids passados)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = markSchema.safeParse(await req.json().catch(() => ({})));
    const where: any = { userId: session.userId, read: false };
    if (parsed.success && parsed.data.ids?.length) where.id = { in: parsed.data.ids };
    await db.notification.updateMany({ where, data: { read: true } });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
