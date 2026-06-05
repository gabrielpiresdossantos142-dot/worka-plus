import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const sendSchema = z.object({
  conversationId: z.string(),
  text: z.string().optional(),
  attachment: z.object({
    dataUrl: z.string(),
    name: z.string(),
    mime: z.string(),
    size: z.number(),
  }).optional(),
});

// POST /api/messages — envia mensagem
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = sendSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");
    const { conversationId, text, attachment } = parsed.data;
    if (!text && !attachment) return badRequest("Mensagem vazia");

    // Verifica se o user é participante
    const part = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: session.userId } },
    });
    if (!part) return unauthorized();

    const msg = await db.message.create({
      data: {
        conversationId,
        fromId: session.userId,
        text: text ?? "",
        attachmentUrl: attachment?.dataUrl ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentMime: attachment?.mime ?? null,
        attachmentSize: attachment?.size ?? null,
        read: false,
      },
      select: { id: true, createdAt: true },
    });

    // Atualiza lastMessage e lastAt na conversa
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: attachment ? `📎 ${attachment.name}` : (text ?? ""),
        lastAt: msg.createdAt,
      },
    });

    return json({ ok: true, id: msg.id, createdAt: msg.createdAt.getTime() });
  } catch (e) {
    return serverError(e);
  }
}

const markReadSchema = z.object({ conversationId: z.string() });

// PATCH /api/messages — mark all received as read in a conversation
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = markReadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");

    await db.message.updateMany({
      where: {
        conversationId: parsed.data.conversationId,
        fromId: { not: session.userId },
        read: false,
      },
      data: { read: true },
    });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
