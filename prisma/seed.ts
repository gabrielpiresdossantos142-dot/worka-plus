/**
 * Seed inicial — 6 usuários demo + 1 tarefa concluída + reviews + conversa.
 * Roda só uma vez (idempotente via `isSeed`).
 * Senha pra todos: demo123
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Worka+ database (Supabase Postgres)…");

  const existing = await prisma.user.count({ where: { isSeed: true } });
  if (existing > 0) {
    console.log(`   ↩ ${existing} seed users already present — skipping`);
    return;
  }

  const passwordHash = await bcrypt.hash("demo123", 10);

  const ana = await prisma.user.create({
    data: {
      handle: "ana.dev", email: "ana@worka.plus", passwordHash, name: "Ana Martins",
      type: "FREELANCER", bio: "Desenvolvedora full-stack. React, Node, TypeScript.",
      avatarColor: "#6366f1", hourlyRate: 18000,
      docType: "CPF", docNumber: "11111111111", verified: true, verifiedAt: new Date(), isSeed: true,
      skills: { create: [{ name: "React" }, { name: "Node.js" }, { name: "TypeScript" }, { name: "PostgreSQL" }] },
      experiences: { create: [{ role: "Tech Lead", company: "Acme Co.", startDate: "2022", endDate: "Atual" }] },
    },
  });

  const beto = await prisma.user.create({
    data: {
      handle: "beto.design", email: "beto@worka.plus", passwordHash, name: "Beto Carvalho",
      type: "FREELANCER", bio: "Designer de marca e identidade visual.",
      avatarColor: "#f59e0b", hourlyRate: 15000,
      docType: "CPF", docNumber: "22222222222", verified: true, verifiedAt: new Date(), isSeed: true,
      skills: { create: [{ name: "Identidade Visual" }, { name: "Logotipo" }, { name: "Figma" }, { name: "Ilustração" }] },
      experiences: { create: [{ role: "Designer Sênior", company: "Studio X", startDate: "2019", endDate: "Atual" }] },
    },
  });

  const clara = await prisma.user.create({
    data: {
      handle: "clara.escreve", email: "clara@worka.plus", passwordHash, name: "Clara Pinheiro",
      type: "FREELANCER", bio: "Copywriter de conversão e SEO.",
      avatarColor: "#ec4899", hourlyRate: 12000,
      docType: "CPF", docNumber: "33333333333", verified: true, verifiedAt: new Date(), isSeed: true,
      skills: { create: [{ name: "Copywriting" }, { name: "SEO" }, { name: "Email marketing" }, { name: "Storytelling" }] },
    },
  });

  const diego = await prisma.user.create({
    data: {
      handle: "diego.video", email: "diego@worka.plus", passwordHash, name: "Diego Rocha",
      type: "FREELANCER", bio: "Editor de vídeo para redes sociais e institucional.",
      avatarColor: "#0ea5e9", hourlyRate: 14000,
      docType: "CPF", docNumber: "44444444444", verified: true, verifiedAt: new Date(), isSeed: true,
      skills: { create: [{ name: "Premiere" }, { name: "After Effects" }, { name: "Motion" }, { name: "Roteiro" }] },
    },
  });

  const cafefoco = await prisma.user.create({
    data: {
      handle: "cafefoco", email: "contato@cafefoco.com", passwordHash, name: "Café Foco",
      type: "EMPRESA", companyName: "Café Foco Ltda",
      bio: "Rede de cafeterias premium em SP.", avatarColor: "#92400e",
      docType: "CNPJ", docNumber: "12345678000100", verified: true, verifiedAt: new Date(), isSeed: true,
    },
  });

  const mariana = await prisma.user.create({
    data: {
      handle: "mariana.mariana", email: "mariana@worka.plus", passwordHash, name: "Mariana Lopes",
      type: "AMBOS", companyName: "ML Studio",
      bio: "Consultora de produto, também aceito projetos.", avatarColor: "#a855f7", hourlyRate: 22000,
      docType: "CPF", docNumber: "55555555555", verified: true, verifiedAt: new Date(), isSeed: true,
      skills: { create: [{ name: "Product" }, { name: "Discovery" }, { name: "Roadmap" }] },
      experiences: { create: [{ role: "Head of Product", company: "StartCo", startDate: "2020", endDate: "Atual" }] },
    },
  });

  const completedTask = await prisma.task.create({
    data: {
      ownerId: cafefoco.id, assigneeId: beto.id,
      title: "Logo para nova linha cold brew",
      description: "Precisamos de um logo moderno para nossa nova linha de cold brew em garrafa. Estilo minimalista, paleta verde/marrom.",
      category: "Design", matchMode: "SMART", status: "CONCLUIDA",
      complexity: "Média", estimatedHours: 8, suggestedPrice: 80000, finalPrice: 80000,
      briefing: "Logo minimalista para linha cold brew. 3 opções iniciais.",
      maxRevisions: 2, completedAt: new Date(),
      checklist: {
        create: [
          { text: "Alinhamento inicial", done: true, order: 0 },
          { text: "Direções visuais", done: true, order: 1 },
          { text: "Entrega final", done: true, order: 2 },
        ],
      },
    },
  });

  await prisma.review.create({
    data: { taskId: completedTask.id, reviewerId: cafefoco.id, revieweeId: beto.id,
      rating: 5, comment: "Beto foi extremamente atencioso e entregou antes do prazo. Recomendo!" },
  });

  await prisma.review.create({
    data: { taskId: completedTask.id, reviewerId: beto.id, revieweeId: cafefoco.id,
      rating: 5, comment: "Cliente claro no briefing e rápido para validar. Top!" },
  });

  await prisma.transaction.create({
    data: { taskId: completedTask.id, fromId: cafefoco.id, toId: beto.id,
      gross: 80000, fee: 8000, net: 72000, status: "PAGO",
      releasedAt: new Date(), paidAt: new Date() },
  });

  await prisma.conversation.create({
    data: {
      lastMessage: "Beleza, vou enviar as variações até quinta!",
      lastAt: new Date(),
      participants: { create: [{ userId: cafefoco.id }, { userId: beto.id }] },
      messages: {
        create: [
          { fromId: cafefoco.id, text: "Oi Beto! Adorei a entrega do logo. Conseguiria me mandar versões em PNG transparente e SVG?", read: true },
          { fromId: beto.id, text: "Claro! Vou exportar nos dois formatos e em diferentes tamanhos. Quer também em preto e branco?", read: true },
          { fromId: cafefoco.id, text: "Boa lembrança, manda também sim 🙏", read: true },
          { fromId: beto.id, text: "Beleza, vou enviar as variações até quinta!", read: true },
        ],
      },
    },
  });

  const counts = {
    users: await prisma.user.count(),
    tasks: await prisma.task.count(),
    reviews: await prisma.review.count(),
    txs: await prisma.transaction.count(),
    messages: await prisma.message.count(),
  };
  console.log("✅ Seed completo:");
  console.log(`   Users: ${counts.users}   Tasks: ${counts.tasks}   Reviews: ${counts.reviews}   Transactions: ${counts.txs}   Messages: ${counts.messages}`);
  console.log(`   Senha pra qualquer demo: demo123`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
