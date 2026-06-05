/**
 * Magic test login — entra sem precisar de cadastro.
 * Cria (se ainda não existe) um usuário "_testworka" oculto e devolve sessão.
 *
 * Esse usuário:
 *   - handle começa com "_" (filtrado dos listings públicos)
 *   - tem `verified: true` pra passar pelas validações
 *   - tem `isSeed: true` pra aparecer pra ele mesmo no Diretório se quiser
 *   - tem CPF placeholder (não bate com nada real)
 *
 * Pra acionar: cliente manda POST sem body.
 * Pra "esconder": só responde se o cabeçalho X-Magic estiver presente.
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { json, serverError, unauthorized } from "@/lib/api";

const MAGIC_HANDLE = "_testworka";
const MAGIC_PASSWORD = "test-only-not-secret";

export async function POST(req: NextRequest) {
  try {
    // Cabeçalho mágico pra evitar varredura aleatória
    if (req.headers.get("x-magic") !== "testloginworka") {
      return unauthorized();
    }

    let user = await db.user.findUnique({ where: { handle: MAGIC_HANDLE } });
    if (!user) {
      const hash = await bcrypt.hash(MAGIC_PASSWORD, 10);
      user = await db.user.create({
        data: {
          handle: MAGIC_HANDLE,
          email: "_test@worka.internal",
          passwordHash: hash,
          name: "Tester (modo teste)",
          type: "AMBOS",
          bio: "Conta de teste oculta. Não aparece nos listings.",
          avatarColor: "#10b77f",
          hourlyRate: 10000,
          docType: "CPF",
          docNumber: "00000000000",
          verified: true,
          verifiedAt: new Date(),
          isSeed: true, // pra também não ser filtrada pela regra "só verified"
        },
      });
    }

    await createSession({ userId: user.id, handle: user.handle });
    return json({ ok: true, userId: user.id, handle: user.handle, test: true });
  } catch (e) {
    return serverError(e);
  }
}
