import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const schema = z.object({
  taskId: z.string(),
  fromId: z.string(),
  toId: z.string(),
  gross: z.number().int(),
  fee: z.number().int(),
  net: z.number().int(),
  status: z.enum(["em_custodia", "liberado", "pago", "reembolsado"]).default("em_custodia"),
});

const STATUS_MAP: Record<string, string> = {
  em_custodia: "EM_CUSTODIA", liberado: "LIBERADO", pago: "PAGO", reembolsado: "REEMBOLSADO",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");
    const d = parsed.data;

    const tx = await db.transaction.create({
      data: {
        taskId: d.taskId,
        fromId: d.fromId,
        toId: d.toId,
        gross: d.gross * 100,
        fee: d.fee * 100,
        net: d.net * 100,
        status: STATUS_MAP[d.status] as any,
      },
      select: { id: true },
    });
    return json({ ok: true, id: tx.id });
  } catch (e) {
    return serverError(e);
  }
}
