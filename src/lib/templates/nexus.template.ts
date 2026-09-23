import { buildUnsubscribeUrl } from '../helpers/unsubscribe.helper';

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

const getPortalUrl = (): string =>
   ('http://staging-portal.seamfox.com').replace(/\/$/, '');


const getNexusBaseUrl = (): string => `${getPortalUrl()}/candidate/insights`;

const getArticleUrl = (articleId: number | string): string =>
  articleId !== undefined && articleId !== null && `${articleId}`.length > 0
    ? `${getNexusBaseUrl()}/${articleId}`
    : getNexusBaseUrl();

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

const buildFooter = (userId?: string): string => {
  const unsubscribeRow = userId
    ? `
  <tr>
    <td style="background-color: #fafbfc; padding: 14px 40px; text-align: center; border-top: 1px solid ${COLORS.border};">
      <p style="margin: 0 0 4px; color: ${COLORS.textMuted}; font-size: 11px; line-height: 1.5;">
        You're receiving this because you opted in to Seamfox newsletters.
      </p>
      <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 11px; line-height: 1.5;">
        <a href="${buildUnsubscribeUrl(userId)}" style="color: ${COLORS.orange}; text-decoration: underline; font-weight: 600;">
          Unsubscribe from marketing emails
        </a>
      </p>
    </td>
  </tr>`
    : '';

  return `
  <tr>
    <td style="border-top: 1px solid ${COLORS.border}; padding: 24px 40px; background-color: #fafbfc;">
      <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 600;">Need help?</p>
      <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.5;">
        Contact our support team at <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>
      </p>
    </td>
  </tr>
  ${unsubscribeRow}
  <tr>
    <td style="background-color: ${COLORS.navy}; padding: 16px 40px; text-align: center;">
      <p style="margin: 0; color: ${COLORS.peach}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
        © ${new Date().getFullYear()} Seamfox · Commodity Talent Platform
      </p>
    </td>
  </tr>
`;
};

const wrapEmail = (innerContent: string, headerLabel: string, userId?: string): string => `<!DOCTYPE html>
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
          ${buildFooter(userId)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

interface FridayFoxProps {
  firstName: string;
  articleTitle: string;
  shortDescription: string;
  articleId: number | string;
  userId: string;
}

export const getFridayFoxTemplate = ({
  firstName,
  articleTitle,
  shortDescription,
  articleId,
  userId,
}: FridayFoxProps): string => {
  const articleUrl = getArticleUrl(articleId);
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          This week's <strong style="color: ${COLORS.orange};">Friday Fox</strong> is live.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 8px; color: ${COLORS.orange}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                🦊 Friday Fox · Weekly Editorial
              </p>
              <h3 style="margin: 0 0 12px; color: ${COLORS.navy}; font-size: 19px; font-weight: 700; line-height: 1.35;">
                ${articleTitle}
              </h3>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                ${shortDescription}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 24px; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Includes this week's <strong style="color: ${COLORS.navy};">Fox Signals</strong>. Members only — log in to read in full.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${articleUrl}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Read Full Article →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Friday Fox is Live', userId);
};

export const getFridayFoxText = ({
  firstName,
  articleTitle,
  shortDescription,
  articleId,
  userId,
}: FridayFoxProps): string => {
  const unsubscribeUrl = buildUnsubscribeUrl(userId);
  return `Hi ${firstName},

This week's Friday Fox is live.

${articleTitle}

${shortDescription}

Includes this week's Fox Signals. Members only — log in to read in full.

Read full article: ${getArticleUrl(articleId)}

— The Seamfox Editorial Team

---
You're receiving this because you opted in to Seamfox newsletters.
Unsubscribe: ${unsubscribeUrl}`;
};

interface NewInsightsProps {
  firstName: string;
  articleTitle: string;
  shortDescription: string;
  articleId: number | string;
  userId: string;
  badge?: string;
  readTime?: number;
}

export const getNewInsightsTemplate = ({
  firstName,
  articleTitle,
  shortDescription,
  articleId,
  userId,
  badge = 'Insights',
  readTime = 5,
}: NewInsightsProps): string => {
  const articleUrl = getArticleUrl(articleId);
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          A new article just landed on <strong style="color: ${COLORS.navy};">Fox Insights</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 12px; color: ${COLORS.orange}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                ${badge} · ${readTime} min read
              </p>
              <h3 style="margin: 0 0 12px; color: ${COLORS.navy}; font-size: 19px; font-weight: 700; line-height: 1.35;">
                ${articleTitle}
              </h3>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                ${shortDescription}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${articleUrl}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Read Full Article →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'New on Fox Insights', userId);
};

export const getNewInsightsText = ({
  firstName,
  articleTitle,
  shortDescription,
  articleId,
  userId,
  badge = 'Insights',
  readTime = 5,
}: NewInsightsProps): string => {
  const unsubscribeUrl = buildUnsubscribeUrl(userId);
  return `Hi ${firstName},

A new article just landed on Fox Insights.

${badge} · ${readTime} min read

${articleTitle}

${shortDescription}

Read full article: ${getArticleUrl(articleId)}

— The Seamfox Editorial Team

---
You're receiving this because you opted in to Seamfox newsletters.
Unsubscribe: ${unsubscribeUrl}`;
};

interface ArticleSubmissionProps {
  firstName: string;
  articleTitle?: string;
}

export const getArticleSubmissionTemplate = ({
  firstName,
  articleTitle,
}: ArticleSubmissionProps): string => {
  const titleBlock = articleTitle
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 20px; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 14px 18px;">
              <p style="margin: 0 0 4px; color: ${COLORS.navy}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Your Submission
              </p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.5; font-weight: 600;">
                "${articleTitle}"
              </p>
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
          Thanks for submitting your article to <strong style="color: ${COLORS.navy};">Fox Insights</strong> — we've received it and it's with our editorial team.
        </p>

        ${titleBlock}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: ${COLORS.navy}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                What happens next
              </p>
              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ Our team will review your submission against our contributor guidelines</p>
              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ We'll be in touch within <strong>5–7 business days</strong> with a decision</p>
              <p style="margin: 0 0 8px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ If approved, we'll confirm the publication date and your author credit</p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">→ If changes are needed, we'll let you know with specific feedback</p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Questions? Reply to this email or reach us at <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>.
        </p>

        <p style="margin: 16px 0 0; color: ${COLORS.textMuted}; font-size: 13px;">
          — The Seamfox Editorial Team
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Submission Received');
};

export const getArticleSubmissionText = ({
  firstName,
  articleTitle,
}: ArticleSubmissionProps): string => {
  return `Hi ${firstName},

Thanks for submitting your article to Fox Insights — we've received it and it's with our editorial team.

${articleTitle ? `Your submission: "${articleTitle}"\n\n` : ''}What happens next:
→ Our team will review your submission against our contributor guidelines
→ We'll be in touch within 5–7 business days with a decision
→ If approved, we'll confirm the publication date and your author credit
→ If changes are needed, we'll let you know with specific feedback

Questions? Reply to this email or reach us at support@seamfox.com.

— The Seamfox Editorial Team`;
};