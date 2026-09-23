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
console.log('BASEURL at template load =', getBaseUrl());

const getLoginUrl = (): string => `${getBaseUrl()}/candidate/signin`;

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

interface RegistrationCompleteProps {
  firstName: string;
}

export const getRegistrationCompleteTemplate = ({
  firstName,
}: RegistrationCompleteProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Welcome to <strong style="color: ${COLORS.navy};">Seamfox</strong>.
        </p>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your account has been created successfully, and your profile is now with our team for review.
        </p>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Because Seamfox is built specifically for the global commodities and shipping industry, every profile is reviewed to help maintain a high-quality and trusted professional network.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: ${COLORS.navy}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">What happens next</p>
              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ Our team will review your profile and CV</p>
              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ We may request small updates if anything is missing</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ Once approved, your profile will go live on the platform</p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Most reviews are completed within <strong style="color: ${COLORS.navy};">24–48 hours</strong>.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Registration Complete');
};

export const getRegistrationCompleteText = ({ firstName }: RegistrationCompleteProps): string => {
  return `Hi ${firstName},

Welcome to Seamfox.

Your account has been created successfully, and your profile is now with our team for review.

Because Seamfox is built specifically for the global commodities and shipping industry, every profile is reviewed to help maintain a high-quality and trusted professional network.

What happens next:
→ Our team will review your profile and CV
→ We may request small updates if anything is missing
→ Once approved, your profile will go live on the platform

Most reviews are completed within 24–48 hours.

— The Seamfox Team`;
};


interface ProfileRejectedProps {
  firstName: string;
  rejectionReason?: string;
}

export const getProfileRejectedTemplate = ({
  firstName,
  rejectionReason,
}: ProfileRejectedProps): string => {
  const reasonBlock = rejectionReason
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Reason</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
            </td>
          </tr>
        </table>
    `
    : '';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Thank you for registering with Seamfox.
        </p>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          After reviewing your profile, our team has identified a few areas that need updating before we can activate your account.
        </p>
        ${reasonBlock}
        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Please log in to your account and update the required information. Once you've resubmitted your profile, our team will review it again — usually within 24 hours.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${getLoginUrl()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Login to Update Profile
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Profile Update Required');
};

export const getProfileRejectedText = ({
  firstName,
  rejectionReason,
}: ProfileRejectedProps): string => {
  return `Hi ${firstName},

Thank you for registering with Seamfox.

After reviewing your profile, our team has identified a few areas that need updating before we can activate your account.

${rejectionReason ? `Reason: ${rejectionReason}\n\n` : ''}Please log in to your account and update the required information. Once you've resubmitted your profile, our team will review it again — usually within 24 hours.

Login: ${getLoginUrl()}

— The Seamfox Team`;
};


interface ProfileRejectedPermanentProps {
  firstName: string;
  rejectionReason?: string;
}
 
export const getProfileRejectedPermanentTemplate = ({
  firstName,
  rejectionReason,
}: ProfileRejectedPermanentProps): string => {
  const reasonBlock = rejectionReason
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Reason</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
            </td>
          </tr>
        </table>
    `
    : '';
 
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Thank you for your interest in Seamfox and for taking the time to register.
        </p>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          After carefully reviewing your profile, we're unable to approve your application to join the Seamfox platform at this time.
        </p>
        ${reasonBlock}
        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          This decision is final. We appreciate your understanding and wish you the very best in your career.
        </p>
        <p style="margin: 0 0 16px; color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.6;">
          If you believe this decision was made in error, you may contact our team at
          <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Application Update');
};
 
export const getProfileRejectedPermanentText = ({
  firstName,
  rejectionReason,
}: ProfileRejectedPermanentProps): string => {
  return `Hi ${firstName},
 
Thank you for your interest in Seamfox and for taking the time to register.
 
After carefully reviewing your profile, we're unable to approve your application to join the Seamfox platform at this time.
 
${rejectionReason ? `Reason: ${rejectionReason}\n\n` : ''}This decision is final. We appreciate your understanding and wish you the very best in your career.
 
If you believe this decision was made in error, you may contact our team at support@seamfox.com.
 
— The Seamfox Team`;
};



interface ProfileApprovedProps {
  candidateName: string;
}

export const getProfileApprovedTemplate = ({ candidateName }: ProfileApprovedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${candidateName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Great news — your Seamfox profile is now <strong style="color: ${COLORS.orange};">approved and live</strong>.
        </p>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          You're now part of a professional network built exclusively for the global commodities industry.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Here's what's waiting for you</p>
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;"><strong style="color: ${COLORS.navy};">Dashboard</strong> — Your career, all in one place</p>
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;"><strong style="color: ${COLORS.navy};">Fox Insights</strong> — Deep dives and market intelligence across your verticals</p>
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;"><strong style="color: ${COLORS.navy};">Live Price Tickers</strong> — Commodity prices at a glance</p>
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;"><strong style="color: ${COLORS.navy};">Jobs</strong> — Live soon</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5;"><strong style="color: ${COLORS.navy};">Nexus</strong> — Connect with the commodities community, play games, hit the leaderboard</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${getLoginUrl()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Login to Dashboard
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; text-align: center;">
          Thanks for joining us — we're glad to have you here.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Welcome to Seamfox');
};

export const getProfileApprovedText = ({ candidateName }: ProfileApprovedProps): string => {
  return `Hi ${candidateName},

Great news — your Seamfox profile is now approved and live.

You're now part of a professional network built exclusively for the global commodities industry.

Here's what's waiting for you:
- Dashboard — Your career, all in one place
- Fox Insights — Deep dives and market intelligence across your verticals
- Live Price Tickers — Commodity prices at a glance
- Jobs — Discover and apply for opportunities across the commodities industry
- Nexus — Connect with the commodities community, play games, hit the leaderboard

Login: ${getLoginUrl()}

Thanks for joining us — we're glad to have you here.

— The Seamfox Team`;
};

interface PasswordChangedProps {
  firstName: string;
  dateTime: string;
}

export const getPasswordChangedTemplate = ({
  firstName,
  dateTime,
}: PasswordChangedProps): string => {
  const content = `
    <tr>
      <td style="padding:40px 40px 24px;">

        <h2 style="margin:0 0 16px;color:${COLORS.navy};font-size:22px;font-weight:600;">
          Hi ${firstName},
        </h2>

        <p style="margin:0 0 16px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          Your Seamfox password was successfully changed on
          <strong style="color:${COLORS.navy};">${dateTime}</strong>.
        </p>

        <p style="margin:0 0 24px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          If this was you, no further action is needed.
        </p>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="margin:24px 0;background-color:${COLORS.peachLight};border-left:4px solid ${COLORS.orange};border-radius:6px;"
        >
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0;color:${COLORS.textDark};font-size:14px;line-height:1.6;">
                If you did <strong>NOT</strong> make this change, please contact us immediately at
                <a
                  href="mailto:support@seamfox.com"
                  style="color:${COLORS.orange};text-decoration:none;font-weight:600;"
                >
                  support@seamfox.com
                </a>
                or reset your password now.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 0;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          — The Seamfox Team
        </p>

      </td>
    </tr>
  `;

  return wrapEmail(content, 'Password Changed');
};


export const getPasswordChangedText = ({ firstName, dateTime }: PasswordChangedProps): string => {
  return `Hi ${firstName},

Your Seamfox password was successfully changed on ${dateTime}.

If this was you, no further action is needed.

If you did NOT make this change, please contact us immediately at support@seamfox.com or reset your password now.

— The Seamfox Team`;
};

interface AccountSuspendedProps {
  firstName: string;
  suspensionDate: string;
  reason?: string;
}

export const getAccountSuspendedTemplate = ({
  firstName,
  suspensionDate,
  reason,
}: AccountSuspendedProps): string => {
  const reasonBlock = reason
    ? `
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="margin:24px 0;background-color:${COLORS.peachLight};border-left:4px solid ${COLORS.orange};border-radius:6px;"
      >
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0;color:${COLORS.textDark};font-size:14px;line-height:1.6;">
              <strong style="color:${COLORS.navy};">Reason:</strong> ${reason}
            </p>
          </td>
        </tr>
      </table>
    `
    : '';

  const content = `
    <tr>
      <td style="padding:40px 40px 24px;">

        <h2 style="margin:0 0 16px;color:${COLORS.navy};font-size:22px;font-weight:600;">
          Hi ${firstName},
        </h2>

        <p style="margin:0 0 16px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          Your Seamfox account has been temporarily suspended effective
          <strong style="color:${COLORS.navy};">${suspensionDate}</strong>.
        </p>

        ${reasonBlock}

        <p style="margin:24px 0 16px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          During the suspension, you will not be able to access the platform. Any active Premium subscription has been paused.
        </p>

        <p style="margin:0 0 24px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          If you believe this suspension was made in error, email
          <a
            href="mailto:support@seamfox.com"
            style="color:${COLORS.orange};text-decoration:none;font-weight:600;"
          >
            support@seamfox.com
          </a>
          within 14 days of this notice. We will review all appeals within 14 business days.
        </p>

        <p style="margin:24px 0 0;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          — The Seamfox Team
        </p>

      </td>
    </tr>
  `;

  return wrapEmail(content, 'Account Suspended');
};


export const getAccountSuspendedText = ({
  firstName,
  suspensionDate,
  reason,
}: AccountSuspendedProps): string => {
  return `Hi ${firstName},

Your Seamfox account has been temporarily suspended effective ${suspensionDate}.

${reason ? `Reason: ${reason}\n\n` : ''}During the suspension, you will not be able to access the platform. Any active Premium subscription has been paused.

If you believe this suspension was made in error, email support@seamfox.com within 14 days of this notice. We will review all appeals within 14 business days.

— The Seamfox Team`;
};

interface AccountReactivatedProps {
  firstName: string;
}

export const getAccountReactivatedTemplate = ({
  firstName,
}: AccountReactivatedProps): string => {
  const content = `
    <tr>
      <td style="padding:40px 40px 24px;">

        <h2 style="margin:0 0 16px;color:${COLORS.navy};font-size:22px;font-weight:600;">
          Hi ${firstName},
        </h2>

        <p style="margin:0 0 16px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          Good news — your Seamfox account has been
          <strong style="color:${COLORS.orange};">reactivated</strong>.
        </p>

        <p style="margin:0 0 24px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          You can now log in and access the platform as usual. Welcome back!
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a
                href="${getLoginUrl()}"
                style="display:inline-block;background-color:${COLORS.orange};color:${COLORS.white};padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;"
              >
                Login Now
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 24px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          <strong>Login:</strong>
          <a
            href="${getLoginUrl()}"
            style="color:${COLORS.orange};text-decoration:none;"
          >
            ${getLoginUrl()}
          </a>
        </p>

        <p style="margin:24px 0 0;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          — The Seamfox Team
        </p>

      </td>
    </tr>
  `;

  return wrapEmail(content, 'Account Reactivated');
};


export const getAccountReactivatedText = ({ firstName }: AccountReactivatedProps): string => {
  return `Hi ${firstName},

Good news — your Seamfox account has been reactivated.

You can now log in and access the platform as usual. Welcome back!

Login: ${getLoginUrl()}

— The Seamfox Team`;
};
