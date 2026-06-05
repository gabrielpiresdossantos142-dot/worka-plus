import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const schema = z.object({
  otherUserId: z.string(),
});

// POST /api/conversations — cria uma conversa entre o user logado e otherUserId
// (ou retorna a existente se já houver entre os dois)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("otherUserId obrigatório");
    if (parsed.data.otherUserId === session.userId) return badRequest("Não pode conversar consigo mesmo");

    // Procura conversa existente
    const existing = await db.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: session.userId } } },
          { participants: { some: { userId: parsed.data.otherUserId } } },
        ],
      },
      select: { id: true },
    });
    if (existing) return json({ ok: true, id: existing.id, existing: true });

    const conv = await db.conversation.create({
      data: {
        lastMessage: "",
        participants: {
          create: [{ userId: session.userId }, { userId: parsed.data.otherUserId }],
        },
      },
      select: { id: true },
    });
    return json({ ok: true, id: conv.id });
  } catch (e) {
    return serverError(e);
  }
}
