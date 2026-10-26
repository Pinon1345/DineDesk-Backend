import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Initialize Gmail SMTP Transporter with your .env credentials
const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(env.SMTP_PORT || process.env.SMTP_PORT || 587),
    secure: false, // TLS via port 587
    auth: {
        user: env.SMTP_USER || process.env.SMTP_USER,
        pass: (env.SMTP_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    },
});

interface WelcomeEmailParams {
    toEmail: string;
    userName: string;
}

export const sendWelcomeEmail = async ({ toEmail, userName }: WelcomeEmailParams) => {
    const senderEmail = env.SMTP_USER || process.env.SMTP_USER || "pinonfurkan1@gmail.com";
    const firstName = userName ? userName.trim().split(" ")[0] : "Connoisseur";
    const fullName = userName ? userName.trim() : "Valued Member";
    const frontendUrl = env.FRONTEND_URL || process.env.FRONTEND_URL || "https://dine-desk-one.vercel.app";

    // Generate unique luxury member card serial based on timestamp & email
    const patronId = `DD-${Buffer.from(toEmail).toString("hex").slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;
    const issuedDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    const htmlTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Welcome to DineDesk</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1b3b2b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f1; padding: 35px 12px 60px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid rgba(27, 59, 43, 0.1); box-shadow: 0 16px 45px rgba(27, 59, 43, 0.08);">
          
          <!-- Top Accent Ribbon -->
          <tr>
            <td style="background: linear-gradient(90deg, #1b3b2b 0%, #2b5540 50%, #c05621 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="background-color: #1b3b2b; padding: 44px 36px 36px 36px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-decoration: none;">
                      DineDesk
                    </span>
                    <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 3.5px; color: #e1b168; margin-top: 6px; font-weight: 700;">
                      Haute Hospitality &amp; Private Tables
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Banner & Intro -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; background-color: #ffffff;">
              <span style="display: inline-block; background-color: rgba(192, 86, 33, 0.1); border: 1px solid rgba(192, 86, 33, 0.25); color: #c05621; font-size: 10px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; padding: 5px 14px; border-radius: 30px; margin-bottom: 16px;">
                Membership Provisioned
              </span>
              <h1 style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.3; color: #1b3b2b; font-weight: 800;">
                A warm welcome to the family, ${firstName}.
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.7; color: rgba(27, 59, 43, 0.85); font-weight: 400;">
                Your presence elevates our table. DineDesk was created for those who consider dining an art form—bridging discerning diners with the most sought-after culinary ateliers, private cellars, and reservation corridors.
              </p>
            </td>
          </tr>

          <!-- Luxury Virtual Membership Card -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #14281e 0%, #1b3b2b 60%, #173224 100%); border-radius: 20px; border: 1px solid rgba(225, 177, 104, 0.4); box-shadow: 0 12px 28px rgba(0,0,0,0.22); color: #ffffff;">
                <tr>
                  <td style="padding: 28px 28px 22px 28px;">
                    <!-- Card Top Row -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="left" valign="top">
                          <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #e1b168; font-weight: 800; display: block;">
                            Patron Credentials
                          </span>
                          <span style="font-family: Georgia, serif; font-size: 19px; color: #ffffff; font-weight: 700; margin-top: 3px; display: block;">
                            ${fullName}
                          </span>
                        </td>
                        <td align="right" valign="top">
                          <span style="display: inline-block; padding: 4px 10px; background: rgba(225, 177, 104, 0.18); border: 1px solid #e1b168; border-radius: 8px; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: #e1b168; text-transform: uppercase;">
                            Founding Member
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider Line on Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 22px 0 16px 0;">
                      <tr>
                        <td style="border-top: 1px dashed rgba(225, 177, 104, 0.3); height: 1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Card Bottom Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="left" valign="bottom">
                          <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.55); display: block;">
                            Member Serial
                          </span>
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">
                            ${patronId}
                          </span>
                        </td>
                        <td align="right" valign="bottom">
                          <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.55); display: block;">
                            Authorized Date
                          </span>
                          <span style="font-size: 12px; font-weight: 600; color: #ffffff;">
                            ${issuedDate}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Key Privileges Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9f6; border-radius: 18px; border: 1px solid rgba(27, 59, 43, 0.08); padding: 24px;">
                <tr>
                  <td>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.8px; font-weight: 800; color: #c05621; display: block; margin-bottom: 14px;">
                      Your Patron Privileges
                    </span>
                  </td>
                </tr>
                
                <!-- Privilege 1 -->
                <tr>
                  <td style="padding: 8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px; color: #c05621; line-height: 1;">✦</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #1b3b2b;">
                          <strong>Priority Table Seating:</strong> Access to premier tables and weekend reservation slots 48 hours prior to public release.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Privilege 2 -->
                <tr>
                  <td style="padding: 8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px; color: #c05621; line-height: 1;">✦</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #1b3b2b;">
                          <strong>Patron Loyalty Points:</strong> Earn 20 points automatically for every verified checkout or dining reservation.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Privilege 3 -->
                <tr>
                  <td style="padding: 8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px; color: #c05621; line-height: 1;">✦</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #1b3b2b;">
                          <strong>Live Kitchen Telemetry:</strong> Real-time meal dispatch updates and one-touch digital bill settlement with zero surge fees.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary CTA Button -->
          <tr>
            <td align="center" style="padding: 10px 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color: #1b3b2b; border-radius: 14px; box-shadow: 0 8px 22px rgba(27, 59, 43, 0.28);">
                    <a href="${frontendUrl}/dashboard/customer" target="_blank" style="display: inline-block; padding: 16px 42px; font-size: 13px; font-weight: 800; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 14px;">
                      Enter Patron Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <span style="display: block; font-size: 11px; color: rgba(27, 59, 43, 0.55); margin-top: 14px;">
                Direct access to your curated restaurants, active reservations, and digital wallet.
              </span>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8f9f6; border-top: 1px solid rgba(27, 59, 43, 0.08); padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #1b3b2b;">
                DineDesk Hospitality Group
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; line-height: 1.5; color: rgba(27, 59, 43, 0.6);">
                San Francisco &bull; London &bull; Tokyo &bull; Singapore
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(27, 59, 43, 0.45); line-height: 1.4;">
                This formal confirmation was delivered to <a href="mailto:${toEmail}" style="color: rgba(27, 59, 43, 0.6); text-decoration: underline;">${toEmail}</a>.<br />
                &copy; ${new Date().getFullYear()} DineDesk Inc. All privileges reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

    try {
        const info = await transporter.sendMail({
            from: `"DineDesk Concierge" <${senderEmail}>`,
            to: toEmail,
            subject: `Welcome to the Family, ${firstName} ✨ Your DineDesk Patron Pass is Ready`,
            html: htmlTemplate,
            text: `Hello ${firstName},\n\nWelcome to the DineDesk Family! Your patron credentials have been authorized.\n\nPatron ID: ${patronId}\nMembership Tier: Founding Member\n\nEnter your patron portal: ${frontendUrl}/dashboard/customer\n\n© ${new Date().getFullYear()} DineDesk Hospitality Group`,
        });

        console.log(`✅ [Gmail SMTP] Premium welcome email sent to ${toEmail} (ID: ${info.messageId})`);
        return info;
    } catch (error: any) {
        console.error("❌ [Gmail SMTP] Failed to dispatch welcome email:", error?.message || error);
    }
};