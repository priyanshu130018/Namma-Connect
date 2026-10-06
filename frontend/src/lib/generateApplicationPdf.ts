import { PartnerApplicationData } from "@/services/partnerApplicationService";

export function generateApplicationPdf(appData: PartnerApplicationData) {
  const printWindow = window.open("", "_blank", "width=850,height=1100");
  if (!printWindow) return;

  const roleTitle = (appData.role_type || "Partner").toUpperCase();
  const providerDetailsHtml = Object.entries(appData.provider_details || {})
    .map(([key, val]) => `
      <tr>
        <td style="padding: 6px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; width: 35%; text-transform: capitalize;">${key.replace(/_/g, " ")}</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0;">${Array.isArray(val) ? val.join(", ") : val}</td>
      </tr>
    `)
    .join("");

  const servicesHtml = (appData.services || [])
    .map((s) => `<li style="margin-bottom: 4px;">${s}</li>`)
    .join("");

  const docsHtml = (appData.documents || [])
    .map((d) => `<li style="margin-bottom: 4px;"><strong>${d.name}:</strong> ${d.type}</li>`)
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>NammaConnect Partner Application - ${appData.application_code}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 32px; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { font-size: 22px; font-weight: 900; color: #059669; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #ecfdf5; color: #047857; font-weight: 800; font-size: 11px; text-transform: uppercase; }
          .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #047857; background: #f0fdf4; padding: 6px 12px; border-radius: 8px; margin-top: 24px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🌿 NammaConnect V2</div>
            <div style="font-size: 11px; color: #64748b;">Official Partner Registration Application</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">${appData.status}</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 4px;"># ${appData.application_code}</div>
            <div style="font-size: 11px; color: #64748b;">Submitted: ${new Date(appData.created_at || Date.now()).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="section-title">01. Applicant & Role Identification</div>
        <table>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold; width: 35%;">Registered Role</td>
            <td style="padding: 6px 12px; font-weight: bold; color: #047857;">${roleTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold;">Full Name</td>
            <td style="padding: 6px 12px;">${appData.full_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold;">Business Name</td>
            <td style="padding: 6px 12px;">${appData.business_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold;">Email & Contact</td>
            <td style="padding: 6px 12px;">${appData.email} | ${appData.mobile}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold;">Location / Address</td>
            <td style="padding: 6px 12px;">${appData.address}, ${appData.district}, ${appData.state}</td>
          </tr>
        </table>

        <div class="section-title">02. ${roleTitle} Work & Provider Profile</div>
        <table>
          ${providerDetailsHtml || '<tr><td style="padding: 6px 12px;">Standard provider details recorded.</td></tr>'}
          <tr>
            <td style="padding: 6px 12px; font-weight: bold;">Experience & Languages</td>
            <td style="padding: 6px 12px;">${appData.experience_years} Years | ${appData.languages || "N/A"}</td>
          </tr>
        </table>

        <div class="section-title">03. Offerings & Services Offered</div>
        ${servicesHtml ? `<ul>${servicesHtml}</ul>` : '<p style="color: #64748b; font-style: italic;">No initial services attached (Skipped during onboarding).</p>'}

        <div class="section-title">04. Legal & Verification Credentials</div>
        <table>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold; width: 35%;">Primary Government ID</td>
            <td style="padding: 6px 12px;">${appData.id_type}: ${appData.id_number}</td>
          </tr>
        </table>
        ${docsHtml ? `<ul>${docsHtml}</ul>` : ""}

        <div class="footer">
          <p>This document is an authoritative summary generated from NammaConnect V2 Partner Application Portal.</p>
          <p>Application ID: ${appData.id} | Timestamp: ${new Date().toISOString()}</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
