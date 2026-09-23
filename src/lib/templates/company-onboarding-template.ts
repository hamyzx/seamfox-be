const COLORS = {
  navy: '#022A45',
  navyDark: '#033857',
  orange: '#CD4E1A',
  peach: '#FED9C2',
  peachLight: '#fff8f4',
  bgGray: '#f5f7fa',
  textDark: '#374151',
  textMuted: '#6b7280',
  border: '#e4e8ed',
  white: '#ffffff',
};

const getBaseUrl = (): string =>
   ('http://staging-portal.seamfox.com').replace(/\/$/, '');

const getLoginUrl = (): string => `${getBaseUrl()}/company/signin`;

const buildHeader = (label: string): string => `
  <tr>
    <td style="background: linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyDark} 100%); padding: 32px 40px; text-align: center;">
      <h1 style="margin: 0; color: ${COLORS.white}; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
        Seamfox
      </h1>
      <p style="margin: 6px 0 0; color: ${COLORS.peach}; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px;">
        ${label}
      </p>
    </td>
  </tr>
`;

const buildFooter = (): string => `
  <tr>
    <td style="border-top: 1px solid ${COLORS.border}; padding: 24px 40px; background-color: #fafbfc;">
      <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 600;">Need help?</p>
      <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.5;">
        Contact our support team at <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background-color: ${COLORS.navy}; padding: 16px 40px; text-align: center;">
      <p style="margin: 0; color: ${COLORS.peach}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
        © ${new Date().getFullYear()} Seamfox · Commodity Talent Platform
      </p>
    </td>
  </tr>
`;

const wrapEmail = (innerContent: string, headerLabel: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.bgGray}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bgGray}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${COLORS.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(2, 42, 69, 0.08);">
          ${buildHeader(headerLabel)}
          ${innerContent}
          ${buildFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

interface CompanyRegistrationCompleteProps {
  companyName: string;
}

export const getCompanyRegistrationCompleteTemplate = ({
  companyName,
}: CompanyRegistrationCompleteProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${companyName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Welcome to <strong style="color: ${COLORS.navy};">Seamfox</strong>.
        </p>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your company account has been created successfully, and your business profile is now with our team for review.
        </p>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Because Seamfox is built specifically for the global commodities and shipping industry, every company is reviewed to help maintain a high-quality and trusted professional network.
        </p>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;"
        >
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: ${COLORS.navy}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                What happens next:
              </p>

              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                → Our team will review your company profile
              </p>

              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                → We may request small updates if anything is missing
              </p>

              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                → Once approved, you can post jobs and access commodity talent
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Most reviews are completed within <strong style="color: ${COLORS.navy};">24–48 hours</strong>.
        </p>

        <p style="margin: 24px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;

  return wrapEmail(content, 'Registration Complete');
};


export const getCompanyRegistrationCompleteText = ({
  companyName,
}: CompanyRegistrationCompleteProps): string => {
  return `Hi ${companyName},

Welcome to Seamfox.

Your company account has been created successfully, and your business profile is now with our team for review.

Because Seamfox is built specifically for the global commodities and shipping industry, every company is reviewed to help maintain a high-quality and trusted professional network.

What happens next:
→ Our team will review your company profile
→ We may request small updates if anything is missing
→ Once approved, you can post jobs and access commodity talent

Most reviews are completed within 24–48 hours.

— The Seamfox Team`;
};

interface CompanyProfileRejectedProps {
  companyName: string;
  rejectionReason?: string;
}

export const getCompanyProfileRejectedTemplate = ({
  companyName,
  rejectionReason,
}: CompanyProfileRejectedProps): string => {
  const reasonBlock = rejectionReason
    ? `
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;"
      >
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
              <strong style="color: ${COLORS.navy};">Reason:</strong> ${rejectionReason}
            </p>
          </td>
        </tr>
      </table>
    `
    : '';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${companyName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Thank you for registering your company with Seamfox.
        </p>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          After reviewing your company profile, our team has identified a few areas that need updating before we can activate your account.
        </p>

        ${reasonBlock}

        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Please log in to your account and update the required information. Once you've resubmitted your profile, our team will review it again — usually within 24 hours.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a
                href="${getLoginUrl()}"
                style="display:inline-block;background-color:${COLORS.orange};color:${COLORS.white};padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;"
              >
                Login to Update Profile
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          <strong>Login:</strong>
          <a href="${getLoginUrl()}" style="color: ${COLORS.orange}; text-decoration: none;">
            ${getLoginUrl()}
          </a>
        </p>

        <p style="margin: 24px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;

  return wrapEmail(content, "Profile Update Required");
};


export const getCompanyProfileRejectedText = ({
  companyName,
  rejectionReason,
}: CompanyProfileRejectedProps): string => {
  return `Hi ${companyName},

Thank you for registering your company with Seamfox.

After reviewing your company profile, our team has identified a few areas that need updating before we can activate your account.

${rejectionReason ? `Reason: ${rejectionReason}\n\n` : ''}Please log in to your account and update the required information. Once you've resubmitted your profile, our team will review it again — usually within 24 hours.

Login: ${getLoginUrl()}

— The Seamfox Team`;
};

interface CompanyProfileRejectedPermanentProps {
  companyName: string;
  rejectionReason?: string;
}

export const getCompanyProfileRejectedPermanentTemplate = ({
  companyName,
  rejectionReason,
}: CompanyProfileRejectedPermanentProps): string => {
  const reasonBlock = rejectionReason
    ? `
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;"
      >
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
              <strong style="color: ${COLORS.navy};">Reason:</strong> ${rejectionReason}
            </p>
          </td>
        </tr>
      </table>
    `
    : "";

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${companyName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Thank you for your interest in Seamfox and for taking the time to register your company.
        </p>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          After carefully reviewing your company profile, we're unable to approve your application to join the Seamfox platform at this time.
        </p>

        ${reasonBlock}

        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          This decision is final. We appreciate your understanding and wish your business the very best.
        </p>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          If you believe this decision was made in error, you may contact our team at
          <a
            href="mailto:support@seamfox.com"
            style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;"
          >
            support@seamfox.com
          </a>.
        </p>

        <p style="margin: 24px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;

  return wrapEmail(content, "Application Update");
};


export const getCompanyProfileRejectedPermanentText = ({
  companyName,
  rejectionReason,
}: CompanyProfileRejectedPermanentProps): string => {
  return `Hi ${companyName},

Thank you for your interest in Seamfox and for taking the time to register your company.

After carefully reviewing your company profile, we're unable to approve your application to join the Seamfox platform at this time.

${rejectionReason ? `Reason: ${rejectionReason}\n\n` : ''}This decision is final. We appreciate your understanding and wish your business the very best.

If you believe this decision was made in error, you may contact our team at support@seamfox.com.

— The Seamfox Team`;
};

interface CompanyProfileApprovedProps {
  companyName: string;
}

export const getCompanyProfileApprovedTemplate = ({
  companyName,
}: CompanyProfileApprovedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${companyName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Great news — your Seamfox company profile is now
          <strong style="color: ${COLORS.orange};">approved and live</strong>.
        </p>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          You're now part of a professional network built exclusively for the global commodities industry.
        </p>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;"
        >
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Here's what's waiting for you:
              </p>

              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;">
                <strong style="color: ${COLORS.navy};">Job Board</strong> — Post roles and manage your listings in one place
              </p>

              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;">
                <strong style="color: ${COLORS.navy};">FoxTalent</strong> — Search and shortlist commodity professionals
              </p>

              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;">
                <strong style="color: ${COLORS.navy};">Fox Files</strong> — Resources and market intelligence for your team
              </p>

              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;">
                <strong style="color: ${COLORS.navy};">Nexus</strong> — Connect with the commodities community
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a
                href="${getLoginUrl()}"
                style="display:inline-block;background-color:${COLORS.orange};color:${COLORS.white};padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;"
              >
                Login to Dashboard
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          <strong>Login:</strong>
          <a href="${getLoginUrl()}" style="color: ${COLORS.orange}; text-decoration: none;">
            ${getLoginUrl()}
          </a>
        </p>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; text-align: center;">
          Thanks for joining us — we're glad to have you here.
        </p>

        <p style="margin: 16px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6; text-align: center;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;

  return wrapEmail(content, 'Welcome to Seamfox');
};


export const getCompanyProfileApprovedText = ({
  companyName,
}: CompanyProfileApprovedProps): string => {
  return `Hi ${companyName},

Great news — your Seamfox company profile is now approved and live.

You're now part of a professional network built exclusively for the global commodities industry.

Here's what's waiting for you:
- Job Board — Post roles and manage your listings in one place
- FoxTalent — Search and shortlist commodity professionals
- Fox Files — Resources and market intelligence for your team
- Nexus — Connect with the commodities community

Login: ${getLoginUrl()}

Thanks for joining us — we're glad to have you here.

— The Seamfox Team`;
};

interface CompanyPasswordChangedProps {
  companyName: string;
  dateTime: string;
}

export const getCompanyPasswordChangedTemplate = ({
  companyName,
  dateTime,
}: CompanyPasswordChangedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${companyName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your Seamfox password was successfully changed on <strong style="color: ${COLORS.navy};">${dateTime}</strong>.
        </p>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          If this was you, no further action is needed.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">⚠ Didn't make this change?</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                Contact us immediately at <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a> or reset your password right away.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Password Changed');
};

export const getCompanyPasswordChangedText = ({
  companyName,
  dateTime,
}: CompanyPasswordChangedProps): string => {
  return `Hi ${companyName},

Your Seamfox password was successfully changed on ${dateTime}.

If this was you, no further action is needed.

If you did NOT make this change, please contact us immediately at support@seamfox.com or reset your password now.

— The Seamfox Team`;
};

interface CompanyAccountSuspendedProps {
  companyName: string;
  suspensionDate: string;
  reason?: string;
}

export const getCompanyAccountSuspendedTemplate = ({
  companyName,
  suspensionDate,
  reason,
}: CompanyAccountSuspendedProps): string => {
  const reasonBlock = reason
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Reason</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">${reason}</p>
            </td>
          </tr>
        </table>
    `
    : '';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${companyName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your Seamfox company account has been temporarily suspended effective <strong style="color: ${COLORS.navy};">${suspensionDate}</strong>.
        </p>
        ${reasonBlock}
        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          During the suspension, your team will not be able to access the platform, and any active job listings will be paused.
        </p>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          If you believe this suspension was made in error, email <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a> within 14 days of this notice. We will review all appeals within 14 business days.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Account Suspended');
};

export const getCompanyAccountSuspendedText = ({
  companyName,
  suspensionDate,
  reason,
}: CompanyAccountSuspendedProps): string => {
  return `Hi ${companyName},

Your Seamfox company account has been temporarily suspended effective ${suspensionDate}.

${reason ? `Reason: ${reason}\n\n` : ''}During the suspension, your team will not be able to access the platform, and any active job listings will be paused.

If you believe this suspension was made in error, email support@seamfox.com within 14 days of this notice. We will review all appeals within 14 business days.

— The Seamfox Team`;
};

interface CompanyAccountReactivatedProps {
  companyName: string;
}

export const getCompanyAccountReactivatedTemplate = ({
  companyName,
}: CompanyAccountReactivatedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${companyName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Good news — your Seamfox company account has been <strong style="color: ${COLORS.orange};">reactivated</strong>.
        </p>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your team can now log in and access the platform as usual. Welcome back!
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${getLoginUrl()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Login Now
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Account Reactivated');
};

export const getCompanyAccountReactivatedText = ({
  companyName,
}: CompanyAccountReactivatedProps): string => {
  return `Hi ${companyName},

Good news — your Seamfox company account has been reactivated.

Your team can now log in and access the platform as usual. Welcome back!

Login: ${getLoginUrl()}

— The Seamfox Team`;
};

interface CompanyProfileStatusUpdateProps {
  companyName: string;
  statusLabel: string;
  note?: string;
}
export const getCompanyProfileStatusUpdateTemplate = ({
  companyName,
  statusLabel,
  note,
}: CompanyProfileStatusUpdateProps): string => {
  const noteBlock = note
    ? `
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;"
      >
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
              <strong style="color: ${COLORS.navy};">Note from our team:</strong> ${note}
            </p>
          </td>
        </tr>
      </table>
    `
    : "";

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${companyName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          There's an update on your Seamfox company profile.
        </p>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your profile status is now:
          <strong style="color: ${COLORS.orange}; text-transform: capitalize;">
            ${statusLabel}
          </strong>
        </p>

        ${noteBlock}

        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Our team will notify you as soon as there's any further update. You can log in any time to review your profile.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a
                href="${getLoginUrl()}"
                style="display:inline-block;background-color:${COLORS.orange};color:${COLORS.white};padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;"
              >
                Login to Seamfox
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          <strong>Login:</strong>
          <a href="${getLoginUrl()}" style="color: ${COLORS.orange}; text-decoration: none;">
            ${getLoginUrl()}
          </a>
        </p>

        <p style="margin: 24px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;

  return wrapEmail(content, "Profile Status Update");
};


export const getCompanyProfileStatusUpdateText = ({
  companyName,
  statusLabel,
  note,
}: CompanyProfileStatusUpdateProps): string => {
  return `Hi ${companyName},

There's an update on your Seamfox company profile.

Your profile status is now: ${statusLabel}

${note ? `Note from our team: ${note}\n\n` : ''}Our team will notify you as soon as there's any further update. You can log in any time to review your profile.

Login: ${getLoginUrl()}

— The Seamfox Team`;
};