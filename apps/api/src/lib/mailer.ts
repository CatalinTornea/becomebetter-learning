export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "Become Better <onboarding@resend.dev>";

  const subject = "Resetare parolă Become Better";
  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-weight: bold; border-radius: 12px; line-height: 48px; font-size: 18px;">BB</div>
        <h2 style="color: #0f172a; margin-top: 16px; font-size: 22px;">Resetare parolă cont</h2>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Ai solicitat resetarea parolei pentru contul tău de pe platforma <strong>Become Better</strong>.</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dă click pe butonul de mai jos pentru a-ți seta o nouă parolă. Link-ul este valabil timp de 60 de minute.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Resetează Parola →</a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Dacă butonul nu funcționează, poți copia și lipi următorul link în browser:<br/>
        <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Dacă nu ai solicitat tu această resetare, poți ignora în siguranță acest email.</p>
    </div>
  `;

  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: subject,
          html: htmlContent
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Mailer] Resend API error:", response.status, errText);
        return false;
      }
      console.log(`[Mailer] Password reset email sent to ${email} via Resend.`);
      return true;
    } catch (err) {
      console.error("[Mailer] Error sending email via Resend:", err);
      return false;
    }
  }

  // Fallback mode for development/testing when no RESEND_API_KEY is provided
  console.log("--------------------------------------------------");
  console.log(`[Mailer] SIMULATED EMAIL SENT TO: ${email}`);
  console.log(`[Mailer] RESET URL: ${resetUrl}`);
  console.log("--------------------------------------------------");
  return true;
}
