import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Initialize Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(env.SMTP_PORT || process.env.SMTP_PORT || 587),
  secure: false, // TLS via port 587
  auth: {
    user: env.SMTP_USER || process.env.SMTP_USER,
    pass: (env.SMTP_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  },
});

export interface WelcomeEmailParams {
  toEmail: string;
  userName?: string;
  name?: string;
  firstName?: string;
}

export interface SignInEmailParams {
  toEmail: string;
  userName?: string;
  name?: string;
  firstName?: string;
  loginDate?: string;
  loginTime?: string;
  device?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerificationCodeEmailParams {
  toEmail: string;
  code: string;
  name?: string;
  userName?: string;
}

// =========================================================================
// 1. EMAIL VERIFICATION OTP (INBOX OPTIMIZED)
// =========================================================================
export const sendVerificationCodeEmail = async ({
  toEmail,
  code,
  name,
  userName,
}: VerificationCodeEmailParams) => {
  const senderEmail = env.SMTP_USER || process.env.SMTP_USER || "pinonfurkan1@gmail.com";
  const resolvedName = (name || userName || "Connoisseur").trim();
  const firstName = resolvedName.split(" ")[0] || "Connoisseur";
  const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || "https://dine-desk-one.vercel.app").replace(/\/$/, "");
  const logoUrl = `${frontendUrl}/icon.png`;

  const htmlTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your DineDesk Verification Code</title>
  <style type="text/css">
    @media only screen and (max-width: 580px) {
      .responsive-table { width: 100% !important; }
      .mobile-padding { padding: 24px 18px !important; }
      .mobile-code { font-size: 34px !important; letter-spacing: 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b3b2b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f1" style="background-color: #f3f4f1; padding: 25px 8px 50px 8px;">
    <tr>
      <td align="center">
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width: 600px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid rgba(27, 59, 43, 0.1); box-shadow: 0 16px 45px rgba(27, 59, 43, 0.08);">
          <tr>
            <td bgcolor="#1b3b2b" style="background: linear-gradient(90deg, #1b3b2b 0%, #2b5540 50%, #c05621 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#1b3b2b" style="background-color: #1b3b2b; padding: 40px 20px 32px 20px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <img src="${logoUrl}" alt="DineDesk" width="56" height="56" style="display: block; width: 56px; height: 56px; border-radius: 14px; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, serif; font-size: 28px; font-weight: 900; letter-spacing: 1.5px; color: #ffffff; display: block;">
                      <font color="#ffffff">DineDesk</font>
                    </span>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #e5b869; margin-top: 6px; font-weight: 700; display: block;">
                      <font color="#e5b869">Identity &amp; Account Authentication</font>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 38px 40px 32px 40px; background-color: #ffffff; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <td bgcolor="#eef5f1" style="background-color: #eef5f1; border: 1px solid rgba(27, 59, 43, 0.2); padding: 5px 14px; border-radius: 30px;">
                    <font color="#1b3b2b" style="font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;">
                      EMAIL VERIFICATION PROTOCOL
                    </font>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0 0 14px 0; font-family: Georgia, serif; font-size: 24px; color: #1b3b2b; font-weight: 800;">
                Verify your email, ${firstName}
              </h1>
              <p style="margin: 0 auto 26px auto; font-size: 14px; line-height: 1.6; color: rgba(27, 59, 43, 0.85); max-width: 440px;">
                Use the single-use 6-digit cryptographic verification code below to authorize your email address and continue setting your password.
              </p>

              <!-- Luxury Code Display -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#142c1f" style="margin: 0 auto 28px auto; background-color: #142c1f; border-radius: 20px; border: 1px solid #c99e55; box-shadow: 0 8px 24px rgba(20, 44, 31, 0.25);">
                <tr>
                  <td style="padding: 24px 48px; text-align: center;">
                    <span class="mobile-code" style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 11px; color: #e5b869; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                      ${code}
                    </span>
                    <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #c2d6cc; display: block; margin-top: 8px; font-weight: 700;">
                      VALID FOR 10 MINUTES
                    </span>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f9f6" style="background-color: #f8f9f6; border-radius: 16px; border: 1px solid rgba(27, 59, 43, 0.08); padding: 16px; margin: 0 auto; max-width: 480px; text-align: left;">
                <tr>
                  <td width="24" valign="top" style="font-size: 15px; color: #c05621; line-height: 1;">✦</td>
                  <td style="font-size: 12px; color: rgba(27, 59, 43, 0.8); line-height: 1.5;">
                    Never disclose this security code to third parties. DineDesk personnel will never request your verification PIN outside the official registration portal.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8f9f6" style="background-color: #f8f9f6; border-top: 1px solid rgba(27, 59, 43, 0.08); padding: 26px 24px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #1b3b2b;">
                DineDesk Hospitality Group &bull; Member Registration Security
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(27, 59, 43, 0.45);">
                Dispatched to <a href="mailto:${toEmail}" style="color: rgba(27, 59, 43, 0.6); text-decoration: underline;">${toEmail}</a>.<br />
                &copy; ${new Date().getFullYear()} DineDesk Inc. All rights reserved.
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
      subject: `${code} is your DineDesk Verification Code`,
      html: htmlTemplate,
      text: `Hello ${firstName},\n\nYour DineDesk verification code is: ${code}\n\nThis single-use code is valid for 10 minutes. Please enter it in the registration form to verify your email.\n\n© ${new Date().getFullYear()} DineDesk Hospitality Group`,
      headers: {
        "X-Entity-Ref-ID": `verify-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    });

    console.log(`✅ [Gmail SMTP] Verification code sent to ${toEmail} (ID: ${info.messageId})`);
    return info;
  } catch (error: any) {
    console.error("❌ [Gmail SMTP] Failed to dispatch verification code email:", error?.message || error);
    throw error;
  }
};

// =========================================================================
// 2. WELCOME / ONBOARDING EMAIL (INBOX OPTIMIZED)
// =========================================================================
export const sendWelcomeEmail = async ({
  toEmail,
  userName,
  name,
  firstName: paramFirstName,
}: WelcomeEmailParams) => {
  const senderEmail = env.SMTP_USER || process.env.SMTP_USER || "pinonfurkan1@gmail.com";
  const resolvedName = (userName || name || paramFirstName || "Connoisseur").trim();
  const firstName = resolvedName.split(" ")[0] || "Connoisseur";
  const fullName = resolvedName || "Valued Member";
  const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || "https://dine-desk-one.vercel.app").replace(/\/$/, "");
  const logoUrl = `${frontendUrl}/icon.png`;

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
  <title>Welcome to DineDesk</title>
  <style type="text/css">
    @media only screen and (max-width: 580px) {
      .responsive-table { width: 100% !important; }
      .mobile-padding { padding: 24px 18px !important; }
      .card-padding { padding: 20px 18px !important; }
      .mobile-stack { display: block !important; width: 100% !important; text-align: left !important; }
      .mobile-badge-container { display: block !important; width: 100% !important; text-align: left !important; margin-top: 14px !important; }
      .mobile-bottom-col { display: block !important; width: 100% !important; text-align: left !important; }
      .mobile-bottom-col-right { display: block !important; width: 100% !important; text-align: left !important; margin-top: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1b3b2b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f1" style="background-color: #f3f4f1; padding: 25px 8px 50px 8px;">
    <tr>
      <td align="center">
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width: 620px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid rgba(27, 59, 43, 0.1); box-shadow: 0 16px 45px rgba(27, 59, 43, 0.08);">
          <tr>
            <td bgcolor="#1b3b2b" style="background: linear-gradient(90deg, #1b3b2b 0%, #2b5540 50%, #c05621 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#1b3b2b" style="background-color: #1b3b2b; padding: 40px 20px 32px 20px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <img src="${logoUrl}" alt="DineDesk" width="56" height="56" style="display: block; width: 56px; height: 56px; border-radius: 14px; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 30px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-decoration: none; line-height: 1.1; display: block;">
                      <font color="#ffffff">DineDesk</font>
                    </span>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 3.5px; color: #e5b869; margin-top: 8px; font-weight: 700; display: block;">
                      <font color="#e5b869">Haute Hospitality &bull; Private Tables</font>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 40px 40px 24px 40px; background-color: #ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td bgcolor="#fbeee7" style="background-color: #fbeee7; border: 1px solid rgba(192, 86, 33, 0.35); padding: 5px 14px; border-radius: 30px;">
                    <font color="#c05621" style="font-size: 10px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;">
                      MEMBERSHIP PROVISIONED
                    </font>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.3; color: #1b3b2b; font-weight: 800;">
                A warm welcome to the family, ${firstName}.
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.7; color: rgba(27, 59, 43, 0.85); font-weight: 400;">
                Your presence elevates our table. DineDesk was created for those who consider dining an art form—bridging discerning diners with the most sought-after culinary ateliers, private cellars, and reservation corridors.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 30px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#142c1f" style="background-color: #142c1f !important; border-radius: 20px; border: 1px solid #c99e55; box-shadow: 0 14px 32px rgba(0,0,0,0.25); overflow: hidden;">
                <tr>
                  <td class="card-padding" bgcolor="#142c1f" style="padding: 28px; background-color: #142c1f !important;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="mobile-stack" align="left" valign="top">
                          <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #e5b869; font-weight: 800; display: block;">
                            <font color="#e5b869">PATRON CREDENTIALS</font>
                          </span>
                          <span style="font-family: Georgia, serif; font-size: 22px; color: #ffffff !important; font-weight: 800; margin-top: 4px; display: block; text-shadow: 0 1px 3px rgba(0,0,0,0.85); word-break: break-word;">
                            <font color="#ffffff">${fullName}</font>
                          </span>
                        </td>
                        <td class="mobile-badge-container" align="right" valign="top">
                          <table cellpadding="0" cellspacing="0" border="0" bgcolor="#213d2f" style="border: 1px solid #e5b869; border-radius: 8px;">
                            <tr>
                              <td style="padding: 6px 14px;">
                                <span style="font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: #e5b869; text-transform: uppercase; white-space: nowrap;">
                                  <font color="#e5b869">✦ FOUNDING MEMBER</font>
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 22px 0 18px 0;">
                      <tr>
                        <td style="border-top: 1px dashed rgba(229, 184, 105, 0.45); height: 1px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="mobile-bottom-col" align="left" valign="bottom">
                          <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.6px; color: #c2d6cc; display: block; font-weight: 700;">
                            <font color="#c2d6cc">MEMBER SERIAL</font>
                          </span>
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 800; color: #ffffff !important; letter-spacing: 1.2px; margin-top: 4px; display: block; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">
                            <font color="#ffffff">${patronId}</font>
                          </span>
                        </td>
                        <td class="mobile-bottom-col-right" align="right" valign="bottom">
                          <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.6px; color: #c2d6cc; display: block; font-weight: 700;">
                            <font color="#c2d6cc">AUTHORIZED DATE</font>
                          </span>
                          <span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff !important; margin-top: 4px; display: block; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">
                            <font color="#ffffff">${issuedDate}</font>
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 30px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f9f6" style="background-color: #f8f9f6; border-radius: 18px; border: 1px solid rgba(27, 59, 43, 0.08); padding: 24px;">
                <tr>
                  <td>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.8px; font-weight: 800; color: #c05621; display: block; margin-bottom: 14px;">
                      Your Patron Privileges
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="26" valign="top" style="font-size: 16px; color: #c05621; line-height: 1;">✦</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #1b3b2b;">
                          <strong>Priority Table Seating:</strong> Access to premier dining tables 48 hours prior to public release.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="26" valign="top" style="font-size: 16px; color: #c05621; line-height: 1;">✦</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #1b3b2b;">
                          <strong>Patron Loyalty Points:</strong> Earn 20 points automatically for every verified checkout.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="26" valign="top" style="font-size: 16px; color: #c05621; line-height: 1;">✦</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #1b3b2b;">
                          <strong>Live Kitchen Telemetry:</strong> Real-time meal dispatch updates and one-touch digital bill settlement.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 10px 24px 40px 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#1b3b2b" style="background-color: #1b3b2b; border-radius: 14px; box-shadow: 0 8px 22px rgba(27, 59, 43, 0.28);">
                    <a href="${frontendUrl}/dashboard/customer" target="_blank" style="display: inline-block; padding: 16px 42px; font-size: 13px; font-weight: 800; color: #ffffff !important; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 14px;">
                      <font color="#ffffff">Enter Patron Portal &rarr;</font>
                    </a>
                  </td>
                </tr>
              </table>
              <span style="display: block; font-size: 11px; color: rgba(27, 59, 43, 0.55); margin-top: 14px;">
                Direct access to your curated restaurants, active reservations, and digital wallet.
              </span>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8f9f6" style="background-color: #f8f9f6; border-top: 1px solid rgba(27, 59, 43, 0.08); padding: 30px 24px; text-align: center;">
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
      subject: `Welcome to the Family, ${firstName} - Your DineDesk Patron Pass is Ready`,
      html: htmlTemplate,
      text: `Hello ${firstName},\n\nWelcome to DineDesk! Your patron credentials have been authorized.\nPatron ID: ${patronId}\nMembership Tier: Founding Member\n\nEnter your patron portal: ${frontendUrl}/dashboard/customer\n\n© ${new Date().getFullYear()} DineDesk Hospitality Group`,
      headers: {
        "X-Entity-Ref-ID": `welcome-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    });

    console.log(`✅ [Gmail SMTP] Welcome email sent to ${toEmail} (ID: ${info.messageId})`);
    return info;
  } catch (error: any) {
    console.error("❌ [Gmail SMTP] Failed to dispatch welcome email:", error?.message || error);
  }
};

// =========================================================================
// 3. SIGN-IN SECURITY NOTICE (FIXED: SANITIZED IP & ANTI-SPAM HEADERS)
// =========================================================================
export const sendSignInEmail = async ({
  toEmail,
  userName,
  name,
  firstName: paramFirstName,
  loginDate: customDate,
  loginTime: customTime,
  device: customDevice,
  ipAddress = "Authorized Secure Device",
  userAgent = "Web Browser",
}: SignInEmailParams) => {
  const senderEmail = env.SMTP_USER || process.env.SMTP_USER || "pinonfurkan1@gmail.com";
  const resolvedName = (userName || name || paramFirstName || "Diner").trim();
  const firstName = resolvedName.split(" ")[0] || "Diner";
  const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || "https://dine-desk-one.vercel.app").replace(/\/$/, "");
  const logoUrl = `${frontendUrl}/icon.png`;

  const loginTime = customTime || new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  const loginDate = customDate || new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const device = customDevice || (
    userAgent.includes("Mobile")
      ? "Mobile Device"
      : userAgent.includes("Windows")
        ? "Windows PC"
        : userAgent.includes("Mac")
          ? "Macintosh"
          : "Web Session"
  );

  // Filter out localhost / loopback addresses that trigger spam classifiers
  const displayIp = (!ipAddress || ipAddress === "127.0.0.1" || ipAddress === "::1" || ipAddress === "localhost")
    ? "Direct Web Session"
    : ipAddress;

  const htmlTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DineDesk Account Notice</title>
  <style type="text/css">
    @media only screen and (max-width: 580px) {
      .responsive-table { width: 100% !important; }
      .mobile-padding { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b3b2b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f1" style="background-color: #f3f4f1; padding: 25px 8px 50px 8px;">
    <tr>
      <td align="center">
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width: 620px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid rgba(27, 59, 43, 0.1); box-shadow: 0 16px 45px rgba(27, 59, 43, 0.08);">
          <tr>
            <td bgcolor="#1b3b2b" style="background: linear-gradient(90deg, #1b3b2b 0%, #2b5540 50%, #c05621 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#1b3b2b" style="background-color: #1b3b2b; padding: 40px 20px 32px 20px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <img src="${logoUrl}" alt="DineDesk" width="56" height="56" style="display: block; width: 56px; height: 56px; border-radius: 14px; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, serif; font-size: 28px; font-weight: 900; letter-spacing: 1.5px; color: #ffffff; display: block;">
                      <font color="#ffffff">DineDesk</font>
                    </span>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #e5b869; margin-top: 6px; font-weight: 700; display: block;">
                      <font color="#e5b869">Executive Patron Security</font>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 36px 40px 24px 40px; background-color: #ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td bgcolor="#eef5f1" style="background-color: #eef5f1; border: 1px solid rgba(27, 59, 43, 0.2); padding: 5px 14px; border-radius: 30px;">
                    <font color="#1b3b2b" style="font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;">
                      SESSION AUTHORIZED
                    </font>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0 0 14px 0; font-family: Georgia, serif; font-size: 24px; color: #1b3b2b; font-weight: 800;">
                Welcome back, ${firstName}.
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: rgba(27, 59, 43, 0.85);">
                We detected a successful sign-in to your DineDesk Patron Account. Your session telemetry has been verified.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f9f6" style="background-color: #f8f9f6; border-radius: 18px; border: 1px solid rgba(27, 59, 43, 0.1); padding: 22px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: rgba(27, 59, 43, 0.7);">
                    <strong>Device:</strong> <span style="color: #1b3b2b;">${device}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: rgba(27, 59, 43, 0.7);">
                    <strong>Date &amp; Time:</strong> <span style="color: #1b3b2b;">${loginDate} at ${loginTime}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: rgba(27, 59, 43, 0.7);">
                    <strong>Network Session:</strong> <span style="color: #1b3b2b; font-family: monospace;">${displayIp}</span>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top: 32px;">
                <tr>
                  <td bgcolor="#1b3b2b" style="background-color: #1b3b2b; border-radius: 14px; box-shadow: 0 6px 20px rgba(27, 59, 43, 0.25);">
                    <a href="${frontendUrl}/dashboard/customer" target="_blank" style="display: inline-block; padding: 15px 38px; font-size: 12px; font-weight: 800; color: #ffffff !important; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 14px;">
                      <font color="#ffffff">Open Patron Dashboard &rarr;</font>
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: rgba(27, 59, 43, 0.55); text-align: center;">
                If you initiated this sign-in, no further action is necessary.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8f9f6" style="background-color: #f8f9f6; border-top: 1px solid rgba(27, 59, 43, 0.08); padding: 26px 24px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #1b3b2b;">
                DineDesk Hospitality Group &bull; Patron Security
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(27, 59, 43, 0.45);">
                Sent to ${toEmail}. &copy; ${new Date().getFullYear()} DineDesk Inc.
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
      subject: `DineDesk Security Notice: Sign-in for ${firstName}`,
      html: htmlTemplate,
      text: `Hello ${firstName},\n\nA successful sign-in was confirmed on your DineDesk account on ${loginDate} at ${loginTime}.\nDevice: ${device}\n\nAccess dashboard: ${frontendUrl}/dashboard/customer`,
      headers: {
        "X-Entity-Ref-ID": `signin-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        "Precedence": "bulk",
        "Auto-Submitted": "auto-generated",
      },
    });

    console.log(`✅ [Gmail SMTP] Sign-in notice sent to ${toEmail} (ID: ${info.messageId})`);
    return info;
  } catch (error: any) {
    console.error("❌ [Gmail SMTP] Failed to dispatch sign-in email:", error?.message || error);
  }
};