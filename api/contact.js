const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'IAtoca <hola@iatoca.com>';
const NOTIFY_EMAIL = 'hola@iatoca.com';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildConfirmationEmail(nombre) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#0a0a0a,#1a1a2e);padding:32px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:800;color:#ffffff;">IA</span><span style="font-size:28px;font-weight:800;color:#6c63ff;">toca</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#0a0a0a;">¡Hola${nombre ? ' ' + escapeHtml(nombre) : ''}!</h1>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">Hemos recibido tu mensaje correctamente. Gracias por contactar con <strong>IAtoca</strong>.</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">Nuestro equipo revisará tu caso y te responderemos en <strong>menos de 24 horas</strong> con ideas concretas sobre cómo la IA puede ayudar a tu negocio.</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#333;">Mientras tanto, puedes echar un vistazo a nuestro <a href="https://iatoca.com/blog/" style="color:#6c63ff;text-decoration:none;font-weight:600;">blog</a> donde compartimos casos prácticos de IA para empresas.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="margin:0;font-size:14px;color:#888;">Un saludo,<br><strong>El equipo de IAtoca</strong><br>
            <a href="mailto:hola@iatoca.com" style="color:#6c63ff;text-decoration:none;">hola@iatoca.com</a> · <a href="https://iatoca.com" style="color:#6c63ff;text-decoration:none;">iatoca.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildNotificationEmail(data) {
  const { nombre, email, empresa, mensaje } = data;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#6c63ff;padding:24px 40px;">
            <h1 style="margin:0;font-size:20px;color:#ffffff;">Nuevo contacto desde iatoca.com</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="8" cellspacing="0">
              <tr>
                <td style="font-size:14px;color:#888;font-weight:600;width:100px;vertical-align:top;">Nombre</td>
                <td style="font-size:16px;color:#333;">${escapeHtml(nombre)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#888;font-weight:600;vertical-align:top;">Email</td>
                <td style="font-size:16px;color:#333;"><a href="mailto:${escapeHtml(email)}" style="color:#6c63ff;">${escapeHtml(email)}</a></td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#888;font-weight:600;vertical-align:top;">Empresa</td>
                <td style="font-size:16px;color:#333;">${empresa ? escapeHtml(empresa) : '<em style="color:#aaa;">No indicada</em>'}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#888;font-weight:600;vertical-align:top;">Mensaje</td>
                <td style="font-size:16px;color:#333;line-height:1.5;">${escapeHtml(mensaje)}</td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#aaa;">Responde directamente a este email para contestar a ${escapeHtml(nombre)}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://iatoca.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, email, empresa, mensaje } = req.body || {};

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email, mensaje' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email no válido' });
  }

  try {
    // Send both emails in parallel
    const [confirmacion, notificacion] = await Promise.all([
      // 1. Confirmation email to the user
      resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `${nombre}, hemos recibido tu mensaje — IAtoca`,
        html: buildConfirmationEmail(nombre),
      }),
      // 2. Notification email to Nico
      resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        replyTo: email,
        subject: `Nuevo contacto: ${nombre}${empresa ? ' (' + empresa + ')' : ''}`,
        html: buildNotificationEmail({ nombre, email, empresa, mensaje }),
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending emails:', error);
    return res.status(500).json({ error: 'Error al enviar emails' });
  }
};
