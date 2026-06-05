/**
 * /api/bootstrap — chamado ao abrir o app.
 * Devolve TODOS os dados que o app legado guardava no localStorage.
 *
 * Sem sessão: devolve só `users` público (pra tela de login renderizar).
 * Com sessão: devolve também tudo relacionado ao user logado.
 */
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { json, serverError } from "@/lib/api";

// Converte os modelos do Postgres pro formato que o app legado espera
// (camelCase, datas como timestamp number, money em centavos vira reais inteiros).
function userOut(u: any) {
  return {
    id: u.id,
    handle: u.handle,
    email: u.email,
    name: u.name,
    type: u.type.toLowerCase(),
    companyName: u.companyName ?? null,
    bio: u.bio ?? "",
    avatarUrl: u.avatarUrl ?? null,
    bannerUrl: u.bannerUrl ?? null,
    avatarColor: u.avatarColor,
    hourlyRate: u.hourlyRate ? Math.round(u.hourlyRate / 100) : null,
    skills: u.skills?.map((s: any) => s.name) ?? [],
    experiences: u.experiences?.map((e: any) => ({
      id: e.id, role: e.role, company: e.company, start: e.startDate, end: e.endDate,
    })) ?? [],
    docType: u.docType?.toLowerCase() ?? null,
    docNumber: u.docNumber ?? null,
    verified: u.verified,
    verifiedAt: u.verifiedAt?.getTime(),
    isSeed: u.isSeed,
    createdAt: u.createdAt.getTime(),
  };
}

function taskOut(t: any) {
  return {
    id: t.id,
    ownerId: t.ownerId,
    assigneeId: t.assigneeId,
    title: t.title,
    description: t.description,
    category: t.category,
    matchMode: t.matchMode === "RACE" ? "race" : "smart",
    status: t.status.toLowerCase(),
    complexity: t.complexity,
    estimatedHours: t.estimatedHours,
    suggestedPrice: Math.round(t.suggestedPrice / 100),
    finalPrice: Math.round(t.finalPrice / 100),
    briefing: t.briefing,
    maxRevisions: t.maxRevisions,
    checklist: t.checklist?.map((c: any) => ({
      id: c.id, text: c.text, done: c.done,
    })) ?? [],
    deliveries: t.deliveries?.map((d: any) => ({
      id: d.id, version: d.version, summary: d.summary,
      status: d.status.toLowerCase().replace("_solicitada", "_solicitada"),
      revisionNote: d.revisionNote,
      files: d.files?.map((f: any) => ({
        name: f.name, mime: f.mime, size: f.size, dataUrl: f.url,
      })) ?? [],
      createdAt: d.createdAt.getTime(),
      decidedAt: d.decidedAt?.getTime(),
    })) ?? [],
    questions: t.questions?.map((q: any) => ({
      id: q.id, askerId: q.askerId, text: q.text, answer: q.answer,
      isPublic: q.isPublic, createdAt: q.createdAt.getTime(),
      answeredAt: q.answeredAt?.getTime(),
    })) ?? [],
    proposals: [],
    createdAt: t.createdAt.getTime(),
    completedAt: t.completedAt?.getTime(),
  };
}

function reviewOut(r: any) {
  return {
    id: r.id, taskId: r.taskId, reviewerId: r.reviewerId, revieweeId: r.revieweeId,
    rating: r.rating, comment: r.comment, createdAt: r.createdAt.getTime(),
  };
}

function txOut(t: any) {
  return {
    id: t.id, taskId: t.taskId, fromId: t.fromId, toId: t.toId,
    gross: Math.round(t.gross / 100),
    fee: Math.round(t.fee / 100),
    net: Math.round(t.net / 100),
    status: t.status.toLowerCase(),
    createdAt: t.createdAt.getTime(),
    releasedAt: t.releasedAt?.getTime(),
    paidAt: t.paidAt?.getTime(),
  };
}

function notifOut(n: any) {
  return {
    id: n.id, userId: n.userId, text: n.text, read: n.read,
    createdAt: n.createdAt.getTime(),
  };
}

function convOut(c: any) {
  return {
    id: c.id,
    participants: c.participants.map((p: any) => p.userId),
    lastMessage: c.lastMessage ?? "",
    lastAt: c.lastAt.getTime(),
    createdAt: c.createdAt.getTime(),
    messages: c.messages.map((m: any) => ({
      id: m.id, fromId: m.fromId, text: m.text,
      attachment: m.attachmentUrl ? {
        dataUrl: m.attachmentUrl,
        name: m.attachmentName,
        mime: m.attachmentMime,
        size: m.attachmentSize,
      } : undefined,
      read: m.read, deleted: m.deleted,
      deletedAt: m.deletedAt?.getTime(),
      createdAt: m.createdAt.getTime(),
    })),
  };
}

export async function GET() {
  try {
    const session = await getSession();

    const users = await db.user.findMany({
      include: { skills: true, experiences: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    if (!session) {
      // Sem login — só devolve usuários (pra Login mostrar demos)
      return json({
        currentUserId: null,
        users: users.map(userOut),
        tasks: [], reviews: [], transactions: [], notifications: [], conversations: [],
      });
    }

    const [tasks, reviews, transactions, notifications, conversations] = await Promise.all([
      db.task.findMany({
        include: { checklist: { orderBy: { order: "asc" } }, deliveries: { include: { files: true } }, questions: true },
        orderBy: { createdAt: "desc" },
      }),
      db.review.findMany(),
      db.transaction.findMany({
        where: { OR: [{ fromId: session.userId }, { toId: session.userId }] },
      }),
      db.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
      }),
      db.conversation.findMany({
        where: { participants: { some: { userId: session.userId } } },
        include: {
          participants: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { lastAt: "desc" },
      }),
    ]);

    return json({
      currentUserId: session.userId,
      users: users.map(userOut),
      tasks: tasks.map(taskOut),
      reviews: reviews.map(reviewOut),
      transactions: transactions.map(txOut),
      notifications: notifications.map(notifOut),
      conversations: conversations.map(convOut),
    });
  } catch (e) {
    return serverError(e);
  }
}
