import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "Worka+ <onboarding@resend.dev>";

export function generateCode(): string {
  // 6 dígitos, com zero-padding (010000 a 999999)
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerificationCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "RESEND_API_KEY não configurada" };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Seu código Worka+</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td align="center" style="padding:40px 32px 24px;">
              <div style="width:64px;height:64px;background:#10b77f;border-radius:18px;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:32px;font-weight:900;line-height:64px;box-shadow:0 8px 24px rgba(16,183,127,0.35);">w</div>
              <h1 style="margin:20px 0 8px;font-size:24px;font-weight:700;color:#0a0a0a;letter-spacing:-0.02em;">Confirme seu email</h1>
              <p style="margin:0;font-size:14px;color:#0a0a0a;opacity:0.65;line-height:1.5;">Use este código pra finalizar o cadastro:</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 32px;">
              <div style="display:inline-block;background:#f5f5f7;border-radius:14px;padding:18px 32px;font-size:36px;font-weight:800;letter-spacing:8px;color:#10b77f;font-family:'Courier New',monospace;">
                ${code}
              </div>
              <p style="margin:16px 0 0;font-size:12px;color:#0a0a0a;opacity:0.45;">Vale por 10 minutos. Se não foi você, ignora esse email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#0a0a0a;opacity:0.4;">
                Worka+ · Marketplace de tarefas com IA<br>
                Você está recebendo isso porque alguém usou esse email pra criar conta. Se não foi você, descarta.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `${code} — Seu código Worka+`,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro ao enviar email" };
  }
}
