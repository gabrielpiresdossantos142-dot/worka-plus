import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, conflict, json, serverError, unauthorized } from "@/lib/api";

const schema = z.object({
  taskId: z.string(),
  revieweeId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");
    const d = parsed.data;

    if (d.revieweeId === session.userId) return badRequest("Não pode avaliar a si mesmo");

    try {
      const r = await db.review.create({
        data: {
          taskId: d.taskId,
          reviewerId: session.userId,
          revieweeId: d.revieweeId,
          rating: d.rating,
          comment: d.comment,
        },
        select: { id: true },
      });
      return json({ ok: true, id: r.id });
    } catch (e: any) {
      if (e.code === "P2002") return conflict("Você já avaliou esta tarefa");
      throw e;
    }
  } catch (e) {
    return serverError(e);
  }
}
