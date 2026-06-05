import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().optional(),
  bio: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  avatarColor: z.string().optional(),
  hourlyRate: z.number().int().nullable().optional(), // em reais (vamos *100)
  type: z.enum(["empresa", "freelancer", "ambos"]).optional(),
  skills: z.array(z.string()).optional(),
  experiences: z.array(z.object({
    id: z.string().optional(),
    role: z.string(),
    company: z.string(),
    start: z.string(),
    end: z.string(),
  })).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos");
    const d = parsed.data;

    const data: any = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.bio !== undefined) data.bio = d.bio;
    if (d.companyName !== undefined) data.companyName = d.companyName;
    if (d.avatarUrl !== undefined) data.avatarUrl = d.avatarUrl;
    if (d.bannerUrl !== undefined) data.bannerUrl = d.bannerUrl;
    if (d.avatarColor !== undefined) data.avatarColor = d.avatarColor;
    if (d.hourlyRate !== undefined) data.hourlyRate = d.hourlyRate ? d.hourlyRate * 100 : null;
    if (d.type !== undefined) data.type = d.type.toUpperCase() as any;

    if (d.skills !== undefined) {
      await db.skill.deleteMany({ where: { userId: session.userId } });
      data.skills = { create: d.skills.map((name) => ({ name })) };
    }
    if (d.experiences !== undefined) {
      await db.experience.deleteMany({ where: { userId: session.userId } });
      data.experiences = {
        create: d.experiences.map((e, i) => ({
          role: e.role, company: e.company, startDate: e.start, endDate: e.end, order: i,
        })),
      };
    }

    const updated = await db.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, handle: true },
    });
    return json({ ok: true, user: updated });
  } catch (e) {
    return serverError(e);
  }
}
