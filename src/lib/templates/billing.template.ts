// ═══════════════════════════════════════════════════════════════════
// SEAMFOX SUBSCRIPTION & BILLING EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════
//  8. Premium Upgrade Confirmation (to Member)
//  9. Subscription Renewal Reminder (to Member)
// 10. Subscription Renewed (to Member)
// 11. Subscription Cancelled / Expired (to Member)
// 12. Payment Failed (to Member)
// ═══════════════════════════════════════════════════════════════════

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
  green: '#059669',
  greenLight: '#ecfdf5',
};

const APP_URL = 'https://staging-portal.seamfox.com';
const BILLING_URL = `${APP_URL}/candidate/settings/billing`;
const PLANS_URL = `${APP_URL}/candidate/settings/plans`;

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
        Contact our billing team at <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>
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

// Format helper: "$29.00 / month" or "Free Trial" if no amount
const formatPrice = (amount?: number, cycle?: string): string => {
  if (amount == null || amount === 0) return 'Free Trial';
  const cyc = cycle ? ` / ${cycle}` : '';
  return `$${amount.toFixed(2)}${cyc}`;
};

// ═══════════════════════════════════════════════════════════════════
// 8. PREMIUM UPGRADE CONFIRMATION — to Member
//    Matches client copy:
//    Subject: ⭐ You're Premium – here's what just unlocked
//    Includes features list + renewal date + trial banner when applicable
// ═══════════════════════════════════════════════════════════════════
interface PremiumUpgradeProps {
  firstName: string;
  planName?: string;
  amount?: number;
  billingCycle?: string;
  renewalDate?: string;     // pre-formatted: "August 1, 2026"
  trialEndsOn?: string;     // pre-formatted: trial-mode date
  nextBillingDate?: string; // legacy alias for renewalDate
}

// 🔥 Pro features list — single source of truth
const PRO_FEATURES: { icon: string; text: string }[] = [
  { icon: '⭐', text: 'Unlimited job applications' },
  { icon: '🔒', text: 'Confidential mode — hide your details from general search' },
  { icon: '📄', text: 'CV sharing on your terms' },
  { icon: '📈', text: 'Priority profile visibility in employer searches' },
  { icon: '📚', text: '5 CVs in your library' },
];

export const getPremiumUpgradeTemplate = ({
  firstName,
  planName = 'Premium',
  amount,
  billingCycle,
  renewalDate,
  trialEndsOn,
  nextBillingDate,
}: PremiumUpgradeProps): string => {
  const isTrial = amount == null || amount === 0;
  // Prefer explicit renewalDate, fallback to nextBillingDate (back-compat), then trialEndsOn
  const dateForRenewal = renewalDate || nextBillingDate || trialEndsOn;

  // Build features list rows
  const featuresRows = PRO_FEATURES.map(
    (f) => `
      <tr>
        <td style="padding: 8px 0; vertical-align: top; width: 32px;">
          <span style="font-size: 18px; line-height: 1;">${f.icon}</span>
        </td>
        <td style="padding: 8px 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.5;">
          ${f.text}
        </td>
      </tr>`,
  ).join('');

  // Trial banner only shows when no amount paid
  const trialBanner = isTrial
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 8px; background-color: ${COLORS.greenLight}; border-left: 4px solid ${COLORS.green}; border-radius: 6px;">
        <tr>
          <td style="padding: 14px 20px;">
            <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
              You're on a <strong>2-month free trial</strong>. Enjoy full Pro access — no card required.
            </p>
          </td>
        </tr>
      </table>`
    : '';

  const renewalLine = dateForRenewal
    ? `Your subscription ${isTrial ? 'starts billing' : 'renews'} on <strong>${dateForRenewal}</strong>. Manage or cancel anytime from your account settings.`
    : 'Manage or cancel anytime from your account settings.';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Welcome to <strong style="color: ${COLORS.orange};">Seamfox ${planName}</strong> — your subscription is now active.
          ${isTrial ? '' : 'Your invoice is attached to this email for your records.'}
        </p>

        <p style="margin: 24px 0 12px; color: ${COLORS.navy}; font-size: 15px; font-weight: 600;">
          You now have access to:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 16px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${featuresRows}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
          ${renewalLine}
        </p>

        ${trialBanner}

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; text-align: center;">
          Manage your subscription anytime in <a href="${BILLING_URL}" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">Billing Settings</a>.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, "You're Premium");
};

export const getPremiumUpgradeText = (props: PremiumUpgradeProps): string => {
  const { firstName, planName = 'Premium', amount, renewalDate, trialEndsOn, nextBillingDate } = props;
  const isTrial = amount == null || amount === 0;
  const dateForRenewal = renewalDate || nextBillingDate || trialEndsOn;

  const featuresText = PRO_FEATURES.map((f) => `${f.icon} ${f.text}`).join('\n');

  const renewalLine = dateForRenewal
    ? `Your subscription ${isTrial ? 'starts billing' : 'renews'} on ${dateForRenewal}. Manage or cancel anytime from your account settings.`
    : 'Manage or cancel anytime from your account settings.';

  return `Hi ${firstName},

Welcome to Seamfox ${planName} — your subscription is now active.${isTrial ? '' : ' Your invoice is attached to this email for your records.'}

You now have access to:

${featuresText}

${renewalLine}
${isTrial ? '\nYou\'re on a 2-month free trial. Enjoy full Pro access — no card required.\n' : ''}
Manage your subscription: ${BILLING_URL}

— The Seamfox Team`;
};

// ═══════════════════════════════════════════════════════════════════
// 9. SUBSCRIPTION RENEWAL REMINDER — to Member
// ═══════════════════════════════════════════════════════════════════
interface RenewalReminderProps {
  firstName: string;
  planName?: string;
  renewalDate: string;
  amount?: number;
  billingCycle?: string;
  daysUntilRenewal?: number;
}

export const getRenewalReminderTemplate = ({
  firstName,
  planName = 'Pro',
  renewalDate,
  amount,
  billingCycle,
  daysUntilRenewal,
}: RenewalReminderProps): string => {
  const priceLine = formatPrice(amount, billingCycle);
  const daysCopy = daysUntilRenewal
    ? `in <strong>${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'}</strong>`
    : 'soon';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          A quick heads-up — your <strong style="color: ${COLORS.orange};">Seamfox ${planName}</strong> subscription will renew ${daysCopy}.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; width: 40%;">Plan:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">Seamfox ${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Renewal Date:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${renewalDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Amount:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${priceLine}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 24px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
          Nothing to do — your subscription will renew automatically. You can update your payment method or cancel anytime before the renewal date.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${BILLING_URL}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Manage Subscription →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Renewal Reminder');
};

export const getRenewalReminderText = (props: RenewalReminderProps): string => {
  const { firstName, planName = 'Pro', renewalDate, amount, billingCycle, daysUntilRenewal } = props;
  return `Hi ${firstName},

Your Seamfox ${planName} subscription will renew ${daysUntilRenewal ? `in ${daysUntilRenewal} day(s)` : 'soon'}.

Plan: Seamfox ${planName}
Renewal Date: ${renewalDate}
Amount: ${formatPrice(amount, billingCycle)}

Nothing to do — your subscription will renew automatically. You can update your payment method or cancel anytime before the renewal date.

Manage subscription: ${BILLING_URL}

— The Seamfox Team`;
};

// ═══════════════════════════════════════════════════════════════════
// 10. SUBSCRIPTION RENEWED — to Member
// ═══════════════════════════════════════════════════════════════════
interface SubscriptionRenewedProps {
  firstName: string;
  planName?: string;
  amount?: number;
  billingCycle?: string;
  renewedOn: string;
  nextBillingDate?: string;
  invoiceNumber?: string;
}

export const getSubscriptionRenewedTemplate = ({
  firstName,
  planName = 'Pro',
  amount,
  billingCycle,
  renewedOn,
  nextBillingDate,
  invoiceNumber,
}: SubscriptionRenewedProps): string => {
  const priceLine = formatPrice(amount, billingCycle);

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your <strong style="color: ${COLORS.orange};">Seamfox ${planName}</strong> subscription has been renewed successfully. Thanks for staying with us.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.greenLight}; border-left: 4px solid ${COLORS.green}; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 4px; color: ${COLORS.green}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                ✓ Payment Successful
              </p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px;">
                Renewed on ${renewedOn}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; width: 40%;">Plan:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">Seamfox ${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Amount Charged:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${priceLine}</td>
                </tr>
                ${
                  nextBillingDate
                    ? `
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Next Billing:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${nextBillingDate}</td>
                </tr>`
                    : ''
                }
                ${
                  invoiceNumber
                    ? `
                <tr>
                  <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Invoice #:</td>
                  <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 12px; font-family: monospace;">${invoiceNumber}</td>
                </tr>`
                    : ''
                }
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${BILLING_URL}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                View Billing Details →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Subscription Renewed');
};

export const getSubscriptionRenewedText = (props: SubscriptionRenewedProps): string => {
  const { firstName, planName = 'Pro', amount, billingCycle, renewedOn, nextBillingDate, invoiceNumber } = props;
  return `Hi ${firstName},

Your Seamfox ${planName} subscription has been renewed successfully.

✓ Payment Successful — Renewed on ${renewedOn}

Plan: Seamfox ${planName}
Amount Charged: ${formatPrice(amount, billingCycle)}
${nextBillingDate ? `Next Billing: ${nextBillingDate}\n` : ''}${invoiceNumber ? `Invoice #: ${invoiceNumber}\n` : ''}
View billing details: ${BILLING_URL}

— The Seamfox Team`;
};

// ═══════════════════════════════════════════════════════════════════
// 11. SUBSCRIPTION CANCELLED / EXPIRED — to Member
// ═══════════════════════════════════════════════════════════════════
interface SubscriptionCancelledProps {
  firstName: string;
  planName?: string;
  endDate?: string;
  reason?: 'cancelled' | 'expired';
}

export const getSubscriptionCancelledTemplate = ({
  firstName,
  planName = 'Pro',
  endDate,
  reason = 'cancelled',
}: SubscriptionCancelledProps): string => {
  const isCancelled = reason === 'cancelled';
  const headerLabel = isCancelled ? 'Subscription Cancelled' : 'Subscription Expired';

  const introCopy = isCancelled
    ? `Your <strong style="color: ${COLORS.orange};">Seamfox ${planName}</strong> subscription has been cancelled. You'll continue to have Pro access until your current period ends.`
    : `Your <strong style="color: ${COLORS.orange};">Seamfox ${planName}</strong> subscription has expired. You've been moved back to the Free plan.`;

  const endDateBlock = endDate
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
        <tr>
          <td style="padding: 20px 28px;">
            <p style="margin: 0 0 6px; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              ${isCancelled ? 'Pro Access Ends' : 'Expired On'}
            </p>
            <p style="margin: 0; color: ${COLORS.textDark}; font-size: 15px;">${endDate}</p>
          </td>
        </tr>
      </table>`
    : '';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          ${introCopy}
        </p>

        ${endDateBlock}

        <p style="margin: 16px 0 24px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
          We're sorry to see you go. ${isCancelled ? 'Changed your mind?' : 'Want full Pro access back?'} You can reactivate anytime.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${PLANS_URL}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Reactivate Pro →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Feedback helps us improve. If something specific made you leave, reply to this email — we read every response.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, headerLabel);
};

export const getSubscriptionCancelledText = (props: SubscriptionCancelledProps): string => {
  const { firstName, planName = 'Pro', endDate, reason = 'cancelled' } = props;
  const isCancelled = reason === 'cancelled';
  const intro = isCancelled
    ? `Your Seamfox ${planName} subscription has been cancelled. You'll continue to have Pro access until your current period ends.`
    : `Your Seamfox ${planName} subscription has expired. You've been moved back to the Free plan.`;

  return `Hi ${firstName},

${intro}

${endDate ? `${isCancelled ? 'Pro Access Ends' : 'Expired On'}: ${endDate}\n\n` : ''}We're sorry to see you go. You can reactivate anytime.

Reactivate Pro: ${PLANS_URL}

Feedback helps us improve. If something specific made you leave, reply to this email — we read every response.

— The Seamfox Team`;
};

// ═══════════════════════════════════════════════════════════════════
// 12. PAYMENT FAILED — to Member
// ═══════════════════════════════════════════════════════════════════
interface PaymentFailedProps {
  firstName: string;
  planName?: string;
  amount?: number;
  billingCycle?: string;
  failureReason?: string;
  cardLast4?: string;
  retryDate?: string;
  graceEndsOn?: string;
}

export const getPaymentFailedTemplate = ({
  firstName,
  planName = 'Pro',
  amount,
  billingCycle,
  failureReason,
  cardLast4,
  retryDate,
  graceEndsOn,
}: PaymentFailedProps): string => {
  const priceLine = formatPrice(amount, billingCycle);

  const detailsTable = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-radius: 8px;">
      <tr>
        <td style="padding: 24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700; width: 40%;">Plan:</td>
              <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">Seamfox ${planName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Amount:</td>
              <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${priceLine}</td>
            </tr>
            ${
              cardLast4
                ? `
            <tr>
              <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Card:</td>
              <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">•••• ${cardLast4}</td>
            </tr>`
                : ''
            }
            ${
              failureReason
                ? `
            <tr>
              <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Reason:</td>
              <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${failureReason}</td>
            </tr>`
                : ''
            }
            ${
              retryDate
                ? `
            <tr>
              <td style="padding: 6px 0; color: ${COLORS.navy}; font-size: 13px; font-weight: 700;">Next Retry:</td>
              <td style="padding: 6px 0; color: ${COLORS.textDark}; font-size: 14px;">${retryDate}</td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>`;

  const graceBlock = graceEndsOn
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 24px; background-color: ${COLORS.redLight}; border-left: 4px solid ${COLORS.red}; border-radius: 6px;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0 0 6px; color: ${COLORS.red}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              ⚠ Action Needed
            </p>
            <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
              Update your payment method by <strong>${graceEndsOn}</strong> to keep Pro access. After this date, your account will be moved to the Free plan.
            </p>
          </td>
        </tr>
      </table>`
    : '';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">Hi ${firstName},</h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          We weren't able to process your <strong style="color: ${COLORS.orange};">Seamfox ${planName}</strong> renewal payment. Don't worry — your Pro access is still active for now.
        </p>

        ${detailsTable}
        ${graceBlock}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${BILLING_URL}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Update Payment Method →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Questions? Contact <a href="mailto:support@seamfox.com" style="color: ${COLORS.orange}; text-decoration: none; font-weight: 600;">support@seamfox.com</a>.
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Payment Failed');
};

export const getPaymentFailedText = (props: PaymentFailedProps): string => {
  const { firstName, planName = 'Pro', amount, billingCycle, failureReason, cardLast4, retryDate, graceEndsOn } = props;
  return `Hi ${firstName},

We weren't able to process your Seamfox ${planName} renewal payment. Don't worry — your Pro access is still active for now.

Plan: Seamfox ${planName}
Amount: ${formatPrice(amount, billingCycle)}
${cardLast4 ? `Card: •••• ${cardLast4}\n` : ''}${failureReason ? `Reason: ${failureReason}\n` : ''}${retryDate ? `Next Retry: ${retryDate}\n` : ''}
${graceEndsOn ? `⚠ Action Needed: Update your payment method by ${graceEndsOn} to keep Pro access.\n\n` : ''}Update payment method: ${BILLING_URL}

Questions? Contact support@seamfox.com.

— The Seamfox Team`;
};