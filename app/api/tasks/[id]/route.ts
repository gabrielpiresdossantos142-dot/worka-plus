import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized, notFound } from "@/lib/api";

const STATUS_MAP: Record<string, string> = {
  rascunho: "RASCUNHO", aberta: "ABERTA", em_andamento: "EM_ANDAMENTO",
  em_revisao: "EM_REVISAO", concluida: "CONCLUIDA", cancelada: "CANCELADA",
};
const DELIV_STATUS: Record<string, string> = {
  aguardando_aprovacao: "AGUARDANDO",
  aprovada: "APROVADA",
  revisao_solicitada: "REVISAO_SOLICITADA",
};

const patchSchema = z.object({
  status: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  finalPrice: z.number().int().optional(),
  completedAt: z.number().optional(),
  // Full-replacement diffs (otimização: enviamos arrays inteiros, server troca)
  checklist: z.array(z.object({ id: z.string().optional(), text: z.string(), done: z.boolean() })).optional(),
  deliveries: z.array(z.any()).optional(),
  questions: z.array(z.any()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id } = await params;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return notFound();
    // owner OR assignee can patch
    if (existing.ownerId !== session.userId && existing.assigneeId !== session.userId) {
      return unauthorized();
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos");
    const d = parsed.data;

    const data: any = {};
    if (d.status && STATUS_MAP[d.status]) data.status = STATUS_MAP[d.status];
    if (d.assigneeId !== undefined) data.assigneeId = d.assigneeId;
    if (d.finalPrice !== undefined) data.finalPrice = d.finalPrice * 100;
    if (d.completedAt !== undefined) data.completedAt = new Date(d.completedAt);

    await db.task.update({ where: { id }, data });

    // Checklist: replace fully (PATCH-as-PUT for nested arrays — simples e suficiente p/ MVP)
    if (d.checklist) {
      await db.checklistItem.deleteMany({ where: { taskId: id } });
      await db.checklistItem.createMany({
        data: d.checklist.map((c, i) => ({ taskId: id, text: c.text, done: c.done, order: i })),
      });
    }

    // Deliveries: replace fully
    if (d.deliveries) {
      await db.deliveryFile.deleteMany({ where: { delivery: { taskId: id } } });
      await db.delivery.deleteMany({ where: { taskId: id } });
      for (const del of d.deliveries) {
        await db.delivery.create({
          data: {
            taskId: id,
            version: del.version,
            summary: del.summary,
            status: DELIV_STATUS[del.status] as any ?? "AGUARDANDO",
            revisionNote: del.revisionNote ?? null,
            createdAt: del.createdAt ? new Date(del.createdAt) : undefined,
            decidedAt: del.decidedAt ? new Date(del.decidedAt) : null,
            files: { create: (del.files ?? []).map((f: any) => ({
              name: f.name, mime: f.mime, size: f.size, url: f.dataUrl ?? f.url ?? "",
            })) },
          },
        });
      }
    }

    // Questions: replace fully
    if (d.questions) {
      await db.question.deleteMany({ where: { taskId: id } });
      for (const q of d.questions) {
        await db.question.create({
          data: {
            taskId: id, askerId: q.askerId, text: q.text,
            answer: q.answer ?? null, isPublic: !!q.isPublic,
            createdAt: q.createdAt ? new Date(q.createdAt) : undefined,
            answeredAt: q.answeredAt ? new Date(q.answeredAt) : null,
          },
        });
      }
    }

    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
