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

interface WelcomeEmailParams {
    toEmail: string;
    userName: string;
}

interface SignInEmailParams {
    toEmail: string;
    userName: string;
    ipAddress?: string;
    userAgent?: string;
}

export const sendWelcomeEmail = async ({ toEmail, userName }: WelcomeEmailParams) => {
    const senderEmail = env.SMTP_USER || process.env.SMTP_USER || "pinonfurkan1@gmail.com";
    const firstName = userName ? userName.trim().split(" ")[0] : "Connoisseur";
    const fullName = userName ? userName.trim() : "Valued Member";
    const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || "https://dine-desk-one.vercel.app").replace(/\/$/, "");
    const logoUrl = `${frontendUrl}/icon.png`;

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
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    @keyframes cardShimmer {
      0% { box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(201, 158, 85, 0.4); }
      50% { box-shadow: 0 14px 40px rgba(229, 184, 105, 0.25), inset 0 0 0 1px rgba(229, 184, 105, 0.8); }
      100% { box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(201, 158, 85, 0.4); }
    }
    
    @keyframes shimmerGold {
      0% { opacity: 0.85; }
      50% { opacity: 1; transform: scale(1.02); }
      100% { opacity: 0.85; }
    }

    .animated-card {
      animation: cardShimmer 5s ease-in-out infinite;
    }

    .animated-badge {
      animation: shimmerGold 3.5s ease-in-out infinite;
      display: inline-block;
    }

    .cta-btn:hover {
      background-color: #244b37 !important;
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(27, 59, 43, 0.35) !important;
    }

    /* Mobile Viewport Reflow */
    @media only screen and (max-width: 580px) {
      .responsive-table {
        width: 100% !important;
      }
      .mobile-padding {
        padding: 24px 18px !important;
      }
      .card-padding {
        padding: 20px 18px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }
      .mobile-badge-container {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
        margin-top: 14px !important;
      }
      .mobile-bottom-col {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }
      .mobile-bottom-col-right {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
        margin-top: 12px !important;
      }
      .mobile-header-logo {
        width: 54px !important;
        height: 54px !important;
      }
      .mobile-brand-title {
        font-size: 26px !important;
      }
    }

    /* Dark Mode Text Inversion Prevention */
    @media (prefers-color-scheme: dark) {
      .patron-card-container {
        background-color: #142c1f !important;
        background: #142c1f !important;
      }
      .patron-text-white {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
      .patron-text-gold {
        color: #e5b869 !important;
        -webkit-text-fill-color: #e5b869 !important;
      }
      .patron-text-muted {
        color: #c2d6cc !important;
        -webkit-text-fill-color: #c2d6cc !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1b3b2b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f1" style="background-color: #f3f4f1; padding: 25px 8px 50px 8px;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width: 620px; background-color: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid rgba(27, 59, 43, 0.1); box-shadow: 0 16px 45px rgba(27, 59, 43, 0.08);">
          
          <!-- Top Accent Ribbon -->
          <tr>
            <td bgcolor="#1b3b2b" style="background: linear-gradient(90deg, #1b3b2b 0%, #2b5540 50%, #c05621 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>

          <!-- Brand Header: Centered Large Logo + Title Below -->
          <tr>
            <td bgcolor="#1b3b2b" style="background-color: #1b3b2b; padding: 46px 20px 38px 20px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img 
                      class="mobile-header-logo"
                      src="${logoUrl}" 
                      alt="DineDesk Logo" 
                      width="64" 
                      height="64" 
                      style="display: block; width: 64px; height: 64px; border-radius: 16px; border: 0; outline: none; object-fit: contain; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" 
                    />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span class="mobile-brand-title" style="font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-decoration: none; line-height: 1.1; display: block;">
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

          <!-- Welcome Banner & Intro -->
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

          <!-- Luxury Virtual Membership Card -->
          <tr>
            <td style="padding: 0 24px 30px 24px;">
              <table class="patron-card-container animated-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#142c1f" style="background-color: #142c1f !important; border-radius: 20px; border: 1px solid #c99e55; box-shadow: 0 14px 32px rgba(0,0,0,0.35); overflow: hidden;">
                <tr>
                  <td class="card-padding" bgcolor="#142c1f" style="padding: 28px; background-color: #142c1f !important;">
                    
                    <!-- Card Top Row -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="mobile-stack" align="left" valign="top">
                          <span class="patron-text-gold" style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #e5b869; font-weight: 800; display: block; -webkit-text-fill-color: #e5b869 !important;">
                            <font color="#e5b869">PATRON CREDENTIALS</font>
                          </span>
                          <span class="patron-text-white" style="font-family: Georgia, serif; font-size: 22px; color: #ffffff !important; font-weight: 800; margin-top: 4px; display: block; -webkit-text-fill-color: #ffffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.85); word-break: break-word;">
                            <font color="#ffffff">${fullName}</font>
                          </span>
                        </td>
                        <td class="mobile-badge-container" align="right" valign="top">
                          <div class="animated-badge">
                            <table cellpadding="0" cellspacing="0" border="0" bgcolor="#213d2f" style="border: 1px solid #e5b869; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
                              <tr>
                                <td style="padding: 6px 14px;">
                                  <span class="patron-text-gold" style="font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: #e5b869; text-transform: uppercase; white-space: nowrap; -webkit-text-fill-color: #e5b869 !important;">
                                    <font color="#e5b869">✦ FOUNDING MEMBER</font>
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Dashed Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 22px 0 18px 0;">
                      <tr>
                        <td style="border-top: 1px dashed rgba(229, 184, 105, 0.45); height: 1px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Card Bottom Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="mobile-bottom-col" align="left" valign="bottom">
                          <span class="patron-text-muted" style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.6px; color: #c2d6cc; display: block; font-weight: 700; -webkit-text-fill-color: #c2d6cc !important;">
                            <font color="#c2d6cc">MEMBER SERIAL</font>
                          </span>
                          <span class="patron-text-white" style="font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 800; color: #ffffff !important; letter-spacing: 1.2px; margin-top: 4px; display: block; -webkit-text-fill-color: #ffffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">
                            <font color="#ffffff">${patronId}</font>
                          </span>
                        </td>
                        <td class="mobile-bottom-col-right" align="right" valign="bottom">
                          <span class="patron-text-muted" style="font-size: 9px; text-transform: uppercase; letter-spacing: 1.6px; color: #c2d6cc; display: block; font-weight: 700; -webkit-text-fill-color: #c2d6cc !important;">
                            <font color="#c2d6cc">AUTHORIZED DATE</font>
                          </span>
                          <span class="patron-text-white" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff !important; margin-top: 4px; display: block; -webkit-text-fill-color: #ffffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">
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

          <!-- Key Privileges Section -->
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

          <!-- Primary CTA Button -->
          <tr>
            <td align="center" style="padding: 10px 24px 40px 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#1b3b2b" style="background-color: #1b3b2b; border-radius: 14px; box-shadow: 0 8px 22px rgba(27, 59, 43, 0.28);">
                    <a href="${frontendUrl}/dashboard/customer" target="_blank" class="cta-btn" style="display: inline-block; padding: 16px 42px; font-size: 13px; font-weight: 800; color: #ffffff !important; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 14px; transition: all 0.3s ease;">
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

          <!-- Footer Section -->
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
            subject: `Welcome to the Family, ${firstName} ✨ Your DineDesk Patron Pass is Ready`,
            html: htmlTemplate,
            text: `Hello ${firstName},\n\nWelcome to DineDesk! Your patron credentials have been authorized.\nPatron ID: ${patronId}\nMembership Tier: Founding Member\n\nEnter your patron portal: ${frontendUrl}/dashboard/customer\n\n© ${new Date().getFullYear()} DineDesk Hospitality Group`,
        });

        console.log(`✅ [Gmail SMTP] Premium welcome email sent to ${toEmail} (ID: ${info.messageId})`);
        return info;
    } catch (error: any) {
        console.error("❌ [Gmail SMTP] Failed to dispatch welcome email:", error?.message || error);
    }
};

export const sendSignInEmail = async ({
    toEmail,
    userName,
    ipAddress = "127.0.0.1",
    userAgent = "Web Browser",
}: SignInEmailParams) => {
    const senderEmail = env.SMTP_USER || process.env.SMTP_USER || "pinonfurkan1@gmail.com";
    const firstName = userName ? userName.trim().split(" ")[0] : "Diner";
    const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || "https://dine-desk-one.vercel.app").replace(/\/$/, "");
    const logoUrl = `${frontendUrl}/icon.png`;

    const loginTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
    });
    const loginDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    const device = userAgent.includes("Mobile")
        ? "Mobile Device"
        : userAgent.includes("Windows")
            ? "Windows PC"
            : userAgent.includes("Mac")
                ? "Macintosh"
                : "Web Session";

    const htmlTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>New Sign-In Detected - DineDesk</title>
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
          
          <!-- Top Accent Ribbon -->
          <tr>
            <td bgcolor="#1b3b2b" style="background: linear-gradient(90deg, #1b3b2b 0%, #2b5540 50%, #c05621 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>

          <!-- Header -->
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

          <!-- Body Content -->
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

              <!-- Session Details Card -->
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
                    <strong>IP Address:</strong> <span style="color: #1b3b2b; font-family: monospace;">${ipAddress}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
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
                If this wasn't you, please secure your account immediately by resetting your password.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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
            subject: `New Sign-In to DineDesk ✨ Welcome Back, ${firstName}`,
            html: htmlTemplate,
            text: `Hello ${firstName},\n\nA new sign-in was detected on your DineDesk account on ${loginDate} at ${loginTime}.\nDevice: ${device}\n\nAccess dashboard: ${frontendUrl}/dashboard/customer`,
        });

        console.log(`✅ [Gmail SMTP] Sign-in notice sent to ${toEmail} (ID: ${info.messageId})`);
        return info;
    } catch (error: any) {
        console.error("❌ [Gmail SMTP] Sign-in email dispatch error:", error?.message || error);
    }
};