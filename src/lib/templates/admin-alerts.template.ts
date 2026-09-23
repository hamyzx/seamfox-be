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
  red: '#dc2626',
  redLight: '#fef2f2',
};

const getBaseUrl = (): string =>
  ('http://staging-portal.seamfox.com').replace(/\/$/, '');

const getAdminPortalUrl = (): string => `${getBaseUrl()}/admin`;

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

interface NewMemberRegistrationProps {
  memberName: string;
  memberEmail: string;
  dateTime: string;
  industryVertical?: string;
  currentRole?: string;
  location?: string;
  candidateId?: number;
}

export const getNewMemberRegistrationTemplate = ({
  memberName,
  memberEmail,
  dateTime,
  industryVertical,
  currentRole,
  location,
  candidateId,
}: NewMemberRegistrationProps): string => {
  const reviewUrl = candidateId
    ? `${getAdminPortalUrl()}/candidate/${candidateId}`
    : `${getAdminPortalUrl()}/candidates`;

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi Admin Team,</h2>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          A new member has registered and their profile is <strong style="color: ${COLORS.orange};">pending review</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; width: 35%;">Name:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Email:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${memberEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Registered:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${dateTime}</td>
                </tr>
                ${
                  industryVertical
                    ? `
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Vertical:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${industryVertical}</td>
                </tr>`
                    : ''
                }
                ${
                  currentRole
                    ? `
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Current Role:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${currentRole}</td>
                </tr>`
                    : ''
                }
                ${
                  location
                    ? `
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Location:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${location}</td>
                </tr>`
                    : ''
                }
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 24px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
          Please review and approve or request updates <strong>within 48 hours</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${reviewUrl}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Review Member →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'New Member Registration');
};

export const getNewMemberRegistrationText = (props: NewMemberRegistrationProps): string => {
  const { memberName, memberEmail, dateTime, industryVertical, currentRole, location } = props;
  return `Hi Admin Team,

A new member has registered and their profile is pending review.

Name: ${memberName}
Email: ${memberEmail}
Registered: ${dateTime}
${industryVertical ? `Vertical: ${industryVertical}\n` : ''}${currentRole ? `Current Role: ${currentRole}\n` : ''}${location ? `Location: ${location}\n` : ''}
Please review and approve or request updates within 48 hours.

Review at: ${getAdminPortalUrl()}/candidates

— Seamfox System`;
};

interface PostFlaggedProps {
  firstName: string;
}

export const getPostFlaggedTemplate = ({ firstName }: PostFlaggedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your recent post on the Seamfox platform has been <strong style="color: ${COLORS.orange};">flagged by our system</strong> and is temporarily held for review. This can happen when a post contains language that may not meet our community standards.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                ⏱ Under Review
              </p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                Your post will be reviewed by our team within <strong>24 hours</strong>. If approved, it will go live automatically. If it doesn't meet our guidelines, you'll receive a separate notification.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Think this was flagged in error? Contact <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>.
        </p>

        <p style="margin:24px 0 0;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Post Under Review');
};

export const getPostFlaggedText = ({ firstName }: PostFlaggedProps): string => {
  return `Hi ${firstName},

Your recent post on the Seamfox platform has been flagged by our system and is temporarily held for review. This can happen when a post contains language that may not meet our community standards.

Your post will be reviewed by our team within 24 hours. If approved, it will go live automatically. If it doesn't meet our guidelines, you'll receive a separate notification.

Think this was flagged in error? Contact support@seamfox.com.

— The Seamfox Team`;
};

interface PostRejectedProps {
  firstName: string;
  adminReason?: string;
}

export const getPostRejectedTemplate = ({
  firstName,
  adminReason,
}: PostRejectedProps): string => {
  const reasonBlock = adminReason
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:${COLORS.redLight};border-left:4px solid ${COLORS.red};border-radius:6px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 8px;color:${COLORS.red};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Reason
              </p>
              <p style="margin:0;color:${COLORS.textDark};font-size:14px;line-height:1.6;">
                ${adminReason}
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
          After review, your recent post on the Seamfox <strong>Nexus</strong> was
          <strong style="color:${COLORS.red};">not approved</strong>
          as it did not meet our community standards.
        </p>

        ${reasonBlock}

        <p style="margin:24px 0 16px;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          Please review our <strong>Community Guidelines</strong> before posting again. Repeated violations may result in account suspension.
        </p>

        <p style="margin:24px 0 16px;color:${COLORS.textMuted};font-size:13px;line-height:1.6;">
          Questions? Contact
          <a
            href="mailto:support@seamfox.com"
            style="color:${COLORS.orange};text-decoration:none;font-weight:600;"
          >
            support@seamfox.com
          </a>.
        </p>

        <p style="margin:24px 0 0;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          — The Seamfox Team
        </p>

      </td>
    </tr>
  `;

  return wrapEmail(content, 'Post Not Approved');
};


export const getPostRejectedText = ({
  firstName,
  adminReason,
}: PostRejectedProps): string => {
  return `Hi ${firstName},

After review, your recent post on the Seamfox Nexus was not approved as it did not meet our community standards.

${adminReason ? `Reason: ${adminReason}\n\n` : ''}Please review our Community Guidelines before posting again. Repeated violations may result in account suspension.

Questions? Contact support@seamfox.com.

— The Seamfox Team`;
};

interface ContentFlaggedProps {
  memberName: string;
  memberEmail: string;
  contentType: 'Post' | 'Comment';
  contentSnippet: string;
  flagReason: string;
  dateTime: string;
  userId: string;
  contentId?: number | string;
}

export const getContentFlaggedTemplate = ({
  memberName,
  memberEmail,
  contentType,
  contentSnippet,
  flagReason,
  dateTime,
  userId,
  contentId,
}: ContentFlaggedProps): string => {
  const reviewUrl =
    userId && userId !== 'N/A'
      ? `${getAdminPortalUrl()}/candidate/${userId}`
      : `${getAdminPortalUrl()}/candidate`;

  const snippet =
    contentSnippet.length > 200
      ? contentSnippet.substring(0, 200) + '...'
      : contentSnippet;

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi Team,</h2>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          A <strong style="color: ${COLORS.orange};">${contentType.toLowerCase()}</strong> has been flagged by the system and requires review.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; width: 35%;">Member:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Email:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${memberEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Content Type:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${contentType}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Reason Flagged:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${flagReason}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Submitted:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${dateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">User ID:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 12px; font-family: monospace;">${userId}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 24px; background-color: ${COLORS.redLight}; border-left: 4px solid ${COLORS.red}; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; color: ${COLORS.red}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Flagged Content
              </p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6; font-style: italic;">
                "${snippet}"
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 24px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
          Please review this member's profile and take appropriate action <strong>within 24 hours</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${reviewUrl}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                View Member Profile →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Content Flagged - Action Required');
};

export const getContentFlaggedText = (props: ContentFlaggedProps): string => {
  const {
    memberName,
    memberEmail,
    contentType,
    contentSnippet,
    flagReason,
    dateTime,
    userId,
  } = props;

  const reviewUrl =
    userId && userId !== 'N/A'
      ? `${getAdminPortalUrl()}/candidate/${userId}`
      : `${getAdminPortalUrl()}/candidate`;

  return `Hi Team,

A ${contentType.toLowerCase()} has been flagged by the system and requires review.

Member: ${memberName} (${memberEmail})
Content Type: ${contentType}
Flagged Content: ${contentSnippet}
Reason Flagged: ${flagReason}
Submitted: ${dateTime}
User ID: ${userId}

Please review this member's profile and take appropriate action within 24 hours.

View profile: ${reviewUrl}

— Seamfox System`;
};