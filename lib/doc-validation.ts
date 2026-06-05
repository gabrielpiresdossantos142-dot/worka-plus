/**
 * Validação real de CPF/CNPJ.
 *
 * Camada 1 — Matemática (offline, instantânea):
 *   - Confere o dígito verificador. Rejeita "00000000000", "12345678901", etc.
 *   - 100% confiável pra detectar números que nunca poderiam ser CPF/CNPJ legítimos.
 *
 * Camada 2 — BrasilAPI (online, só pra CNPJ):
 *   - Confere se a empresa existe na Receita Federal.
 *   - CPF a Receita não expõe publicamente (dado pessoal), então só dá pra fazer
 *     a Camada 1.
 *
 * O que NÃO é checado: se a pessoa que está cadastrando é dona daquele documento.
 * Pra isso precisaria de serviço pago (Serpro, Serasa, etc).
 */

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function validCPF(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false; // todos os dígitos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== parseInt(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== parseInt(d[10])) return false;

  return true;
}

export function validCNPJ(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d[i]) * weights1[i];
  let mod = sum % 11;
  const dv1 = mod < 2 ? 0 : 11 - mod;
  if (dv1 !== parseInt(d[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(d[i]) * weights2[i];
  mod = sum % 11;
  const dv2 = mod < 2 ? 0 : 11 - mod;
  if (dv2 !== parseInt(d[13])) return false;

  return true;
}

/**
 * Consulta o CNPJ na BrasilAPI. Devolve:
 *   { ok: true, companyName, fantasyName } — existe
 *   { ok: false, reason: "not-found" }     — Receita não tem esse CNPJ
 *   { ok: true, _skipped: true }           — API caiu, deixa passar (degradação graciosa)
 *
 * Timeout de 4s pra não travar o signup se a API estiver lenta.
 */
export async function checkCNPJExists(cnpj: string): Promise<{
  ok: boolean;
  reason?: string;
  companyName?: string;
  fantasyName?: string;
  _skipped?: boolean;
}> {
  const d = onlyDigits(cnpj);
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);

    if (r.status === 404) return { ok: false, reason: "not-found" };
    if (!r.ok) return { ok: true, _skipped: true }; // serviço estranho, deixa passar

    const data = await r.json();
    return {
      ok: true,
      companyName: data.razao_social ?? data.nome ?? undefined,
      fantasyName: data.nome_fantasia ?? undefined,
    };
  } catch {
    // Timeout / rede caiu — não trava o signup
    return { ok: true, _skipped: true };
  }
}
