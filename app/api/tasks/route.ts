import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  category: z.string(),
  matchMode: z.enum(["smart", "race"]).default("smart"),
  complexity: z.string(),
  estimatedHours: z.number().int().positive(),
  suggestedPrice: z.number().int().nonnegative(), // reais
  finalPrice: z.number().int().nonnegative(),     // reais
  briefing: z.string(),
  checklist: z.array(z.object({ text: z.string(), done: z.boolean().default(false) })).optional(),
  maxRevisions: z.number().int().default(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");
    const d = parsed.data;

    const task = await db.task.create({
      data: {
        ownerId: session.userId,
        title: d.title,
        description: d.description,
        category: d.category,
        matchMode: d.matchMode === "race" ? "RACE" : "SMART",
        status: "ABERTA",
        complexity: d.complexity,
        estimatedHours: d.estimatedHours,
        suggestedPrice: d.suggestedPrice * 100,
        finalPrice: d.finalPrice * 100,
        briefing: d.briefing,
        maxRevisions: d.maxRevisions ?? 2,
        checklist: { create: (d.checklist ?? []).map((c, i) => ({ text: c.text, done: c.done, order: i })) },
      },
      select: { id: true },
    });

    return json({ ok: true, id: task.id });
  } catch (e) {
    return serverError(e);
  }
}
