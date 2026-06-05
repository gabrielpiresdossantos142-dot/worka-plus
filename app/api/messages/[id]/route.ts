import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { json, serverError, unauthorized, notFound } from "@/lib/api";

// DELETE = soft delete (deleted=true, text="", attachment=null)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id } = await params;

    const msg = await db.message.findUnique({ where: { id }, select: { fromId: true } });
    if (!msg) return notFound();
    if (msg.fromId !== session.userId) return unauthorized();

    await db.message.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        text: "",
        attachmentUrl: null,
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
      },
    });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
