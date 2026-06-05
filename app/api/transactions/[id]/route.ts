import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const schema = z.object({
  status: z.enum(["em_custodia", "liberado", "pago", "reembolsado"]),
  releasedAt: z.number().optional(),
  paidAt: z.number().optional(),
});

const STATUS_MAP: Record<string, string> = {
  em_custodia: "EM_CUSTODIA", liberado: "LIBERADO", pago: "PAGO", reembolsado: "REEMBOLSADO",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Dados inválidos");

    await db.transaction.update({
      where: { id },
      data: {
        status: STATUS_MAP[parsed.data.status] as any,
        releasedAt: parsed.data.releasedAt ? new Date(parsed.data.releasedAt) : undefined,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
      },
    });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
