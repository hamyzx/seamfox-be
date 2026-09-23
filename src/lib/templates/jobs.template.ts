const getBaseUrl = (): string =>
   ('http://staging-portal.seamfox.com').replace(/\/$/, '');

const URLS = {
  applications: (): string => `${getBaseUrl()}/candidate/applications`,
  jobs: (): string => `${getBaseUrl()}/candidate/jobs`,
  messages: (): string => `${getBaseUrl()}/candidate/messages`,
  adminJobApplications: (jobId: number | string): string =>
    `${getBaseUrl()}/admin/jobs/${jobId}/applications`,
};

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
  green: '#16a34a',
  greenLight: '#f0fdf4',
};

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
      <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 13px; font-weight: 600;">
        Need help?
      </p>
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

interface ApplicationSubmittedProps {
  firstName: string;
  jobTitle: string;
  companyName: string;
}

export const getApplicationSubmittedTemplate = ({
  firstName,
  jobTitle,
  companyName,
}: ApplicationSubmittedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Your application for <strong style="color: ${COLORS.navy};">${jobTitle}</strong> at <strong style="color: ${COLORS.navy};">${companyName}</strong> has been submitted successfully.
        </p>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          We'll notify you as soon as there's an update from the employer. You can track all your applications from your dashboard.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${URLS.applications()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Track Your Applications
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Application Submitted');
};

export const getApplicationSubmittedText = ({
  firstName,
  jobTitle,
  companyName,
}: ApplicationSubmittedProps): string => {
  return `Hi ${firstName},

Your application for ${jobTitle} at ${companyName} has been submitted successfully.

We'll notify you as soon as there's an update from the employer. Track all your applications from your dashboard.

Dashboard: ${URLS.applications()}

— The Seamfox Team`;
};

interface ShortlistedProps {
  firstName: string;
  jobTitle: string;
  companyName: string;
}

export const getShortlistedTemplate = ({
  firstName,
  jobTitle,
  companyName,
}: ShortlistedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Good news — you've been <strong style="color: ${COLORS.orange};">shortlisted</strong> for <strong style="color: ${COLORS.navy};">${jobTitle}</strong> at <strong style="color: ${COLORS.navy};">${companyName}</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                The employer has reviewed your profile and wants to take things further. They'll be in touch with next steps soon. Keep an eye on your Seamfox inbox.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${URLS.applications()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                View Application
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, "You're Shortlisted");
};

export const getShortlistedText = ({
  firstName,
  jobTitle,
  companyName,
}: ShortlistedProps): string => {
  return `Hi ${firstName},

Good news — you've been shortlisted for ${jobTitle} at ${companyName}.

The employer has reviewed your profile and wants to take things further. They'll be in touch with next steps. Keep an eye on your Seamfox inbox.

View Application: ${URLS.applications()}

— The Seamfox Team`;
};

interface InterviewStageProps {
  firstName: string;
  jobTitle: string;
  companyName: string;
}

export const getInterviewStageTemplate = ({
  firstName,
  jobTitle,
  companyName,
}: InterviewStageProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          You're through to the <strong style="color: ${COLORS.orange};">interview stage</strong> for <strong style="color: ${COLORS.navy};">${jobTitle}</strong> at <strong style="color: ${COLORS.navy};">${companyName}</strong>.
        </p>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          The employer will reach out to confirm details. A few things worth doing now:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 24px; background-color: ${COLORS.peachLight}; border-radius: 8px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                → Review the job description one more time
              </p>
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                → Research the company and their commodity verticals
              </p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                → Make sure your Seamfox profile is fully up to date
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.navy}; font-size: 15px; line-height: 1.6; font-weight: 600; text-align: center;">
          You've got this. 💪
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Interview Stage');
};

export const getInterviewStageText = ({
  firstName,
  jobTitle,
  companyName,
}: InterviewStageProps): string => {
  return `Hi ${firstName},

You're through to the interview stage for ${jobTitle} at ${companyName}.

The employer will reach out to confirm details. A few things worth doing now:
→ Review the job description one more time
→ Research the company and their commodity verticals
→ Make sure your Seamfox profile is fully up to date

You've got this.

— The Seamfox Team`;
};

interface HiredProps {
  firstName: string;
  jobTitle: string;
  companyName: string;
}

export const getHiredTemplate = ({ firstName, jobTitle, companyName }: HiredProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Congratulations! <strong style="color: ${COLORS.navy};">${companyName}</strong> has confirmed you as their hire for <strong style="color: ${COLORS.orange};">${jobTitle}</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.greenLight}; border-left: 4px solid ${COLORS.green}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 8px; color: ${COLORS.navy}; font-size: 15px; font-weight: 600;">
                🎉 You did it!
              </p>
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                This is a big milestone, and we're excited for what's ahead for you.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Once you've accepted the offer, consider sharing your experience on the <strong style="color: ${COLORS.navy};">Nexus</strong> — your story could inspire someone else navigating the commodities job market.
        </p>

        <p style="margin: 24px 0 0; color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.6; text-align: center;">
          Wishing you the best in the new role!
        </p>
      </td>
    </tr>
  `;
  return wrapEmail(content, "You're Hired!");
};

export const getHiredText = ({ firstName, jobTitle, companyName }: HiredProps): string => {
  return `Hi ${firstName},

Congratulations — ${companyName} has confirmed you as their hire for ${jobTitle}.

This is a big milestone, and we're excited for what's ahead for you.

Once you've accepted the offer, consider sharing your experience on the Nexus — your story could inspire someone else navigating the commodities job market.

Wishing you the best in the new role!

— The Seamfox Team`;
};

interface ApplicationClosedProps {
  firstName: string;
  jobTitle: string;
  companyName: string;
}

export const getApplicationClosedTemplate = ({
  firstName,
  jobTitle,
  companyName,
}: ApplicationClosedProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>
        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Thank you for applying for <strong style="color: ${COLORS.navy};">${jobTitle}</strong> at <strong style="color: ${COLORS.navy};">${companyName}</strong> through Seamfox.
        </p>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          The employer has moved forward with another candidate for this role. This was the employer's decision and is not a reflection on your profile or experience.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                The commodities market moves fast, and new opportunities appear every day. Keep your profile updated and stay active within the community.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${URLS.jobs()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Explore Other Jobs
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Application Update');
};

export const getApplicationClosedText = ({
  firstName,
  jobTitle,
  companyName,
}: ApplicationClosedProps): string => {
  return `Hi ${firstName},

Thank you for applying for ${jobTitle} at ${companyName} through Seamfox.

The employer has moved forward with another candidate for this role. This was the employer's decision and is not a reflection on your profile or experience.

The commodities market moves fast, and new opportunities appear every day. Keep your profile updated and stay active within the community.

Explore jobs: ${URLS.jobs()}

— The Seamfox Team`;
};

interface EmployerMessageProps {
  firstName: string;
  companyName?: string;
}

export const getEmployerMessageTemplate = ({
  firstName,
  companyName,
}: EmployerMessageProps): string => {
  const companyLine = companyName
    ? `<strong style="color: ${COLORS.navy};">${companyName} has</strong>`
    : 'An employer has';

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">

        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Hi ${firstName},
        </h2>

        <p style="margin: 0 0 16px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          ${companyLine} sent you a message on Seamfox.
        </p>

        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Log in to read it and reply. Employers can only initiate contact — so if someone's reaching out, they're interested.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a
                href="${URLS.messages()}"
                style="display:inline-block;background-color:${COLORS.orange};color:${COLORS.white};padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;"
              >
                Read Message
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          Messages:
          <a
            href="${URLS.messages()}"
            style="color:${COLORS.orange};text-decoration:none;font-weight:600;"
          >
            ${URLS.messages()}
          </a>
        </p>

        <p style="margin:24px 0 0;color:${COLORS.textDark};font-size:15px;line-height:1.6;">
          — The Seamfox Team
        </p>

      </td>
    </tr>
  `;

  return wrapEmail(content, 'New Message');
};


export const getEmployerMessageText = ({
  firstName,
  companyName,
}: EmployerMessageProps): string => {
  return `Hi ${firstName},

${companyName ? `${companyName} has` : 'An employer has'} sent you a message on Seamfox.

Log in to read it and reply. Employers can only initiate contact — so if someone's reaching out, they're interested.

Messages: ${URLS.messages()}

— The Seamfox Team`;
};

interface InterviewInvitationProps {
  message: string;
}

export const getInterviewInvitationTemplate = ({
  message,
}: InterviewInvitationProps): string => {
  const safeMessage = (message || '')
    .split(/\n{2,}/)
    .map((para) => para.trim().replace(/\n/g, '<br/>'))
    .filter((para) => para.length > 0)
    .map(
      (para) =>
        `<p style="margin: 0 0 14px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">${para}</p>`,
    )
    .join('');
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        ${safeMessage}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px; line-height: 1.6;">
                The employer will share the final interview details with you. Keep an eye on your Seamfox inbox and email.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${URLS.applications()}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                View Application
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Interview Invitation');
};

export const getInterviewInvitationText = ({
  message,
}: InterviewInvitationProps): string => {
  return `${message || ''}

The employer will share the final interview details with you. Keep an eye on your Seamfox inbox and email.

View Application: ${URLS.applications()}

— The Seamfox Team`;
};

interface InterviewScheduledProps {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
}

export const getInterviewScheduledTemplate = ({
  candidateName,
  candidateEmail,
  jobTitle,
}: InterviewScheduledProps): string => {
  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 20px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          Interview Scheduled
        </h2>

        <p style="margin: 0 0 20px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          An interview invitation has been sent to the following candidate.
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
              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px;">
                <strong style="color: ${COLORS.navy};">Candidate:</strong> ${candidateName}
              </p>

              <p style="margin: 0 0 10px; color: ${COLORS.textDark}; font-size: 14px;">
                <strong style="color: ${COLORS.navy};">Position:</strong> ${jobTitle}
              </p>

              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 14px;">
                <strong style="color: ${COLORS.navy};">Email:</strong> ${candidateEmail}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          — The Seamfox Team
        </p>
      </td>
    </tr>
  `;

  return wrapEmail(content, "Interview Scheduled");
};


export const getInterviewScheduledText = ({
  candidateName,
  candidateEmail,
  jobTitle,
}: InterviewScheduledProps): string => {
  return `Interview Scheduled

An interview invitation has been sent to the following candidate.

Candidate Details:
- Candidate: ${candidateName}
- Position: ${jobTitle}
- Email: ${candidateEmail}

— The Seamfox Team`;
};


interface AdminApplicationNotificationProps {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  companyName: string;
  jobId: number | string;
  applicationId: number | string;
  candidateCity?: string;
  candidateCountry?: string;
  yearsOfExperience?: number | string;
  hasCv?: boolean;
}

export const getAdminApplicationNotificationTemplate = ({
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  companyName,
  jobId,
  applicationId,
  candidateCity,
  candidateCountry,
  yearsOfExperience,
  hasCv,
}: AdminApplicationNotificationProps): string => {
  const location = [candidateCity, candidateCountry].filter(Boolean).join(', ') || '—';
  const applicationUrl = URLS.adminJobApplications(jobId);

  const content = `
    <tr>
      <td style="padding: 40px 40px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.navy}; font-size: 22px; font-weight: 600;">
          New Job Application Received
        </h2>
        <p style="margin: 0 0 24px; color: ${COLORS.textDark}; font-size: 15px; line-height: 1.6;">
          A new candidate has applied for <strong style="color: ${COLORS.navy};">${jobTitle}</strong> at <strong style="color: ${COLORS.navy};">${companyName}</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: ${COLORS.peachLight}; border-left: 4px solid ${COLORS.orange}; border-radius: 6px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: ${COLORS.navy}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                Candidate Details
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 4px 0; color: ${COLORS.textMuted}; font-size: 13px; width: 130px;">Name</td>
                  <td style="padding: 4px 0; color: ${COLORS.navy}; font-size: 14px; font-weight: 600;">${candidateName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: ${COLORS.textMuted}; font-size: 13px;">Email</td>
                  <td style="padding: 4px 0; color: ${COLORS.navy}; font-size: 14px;">${candidateEmail}</td>
                </tr>
                ${candidatePhone ? `
                <tr>
                  <td style="padding: 4px 0; color: ${COLORS.textMuted}; font-size: 13px;">Phone</td>
                  <td style="padding: 4px 0; color: ${COLORS.navy}; font-size: 14px;">${candidatePhone}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; color: ${COLORS.textMuted}; font-size: 13px;">Location</td>
                  <td style="padding: 4px 0; color: ${COLORS.navy}; font-size: 14px;">${location}</td>
                </tr>
                ${yearsOfExperience !== undefined && yearsOfExperience !== null ? `
                <tr>
                  <td style="padding: 4px 0; color: ${COLORS.textMuted}; font-size: 13px;">Experience</td>
                  <td style="padding: 4px 0; color: ${COLORS.navy}; font-size: 14px;">${yearsOfExperience} ${Number(yearsOfExperience) === 1 ? 'year' : 'years'}</td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
          <tr>
            <td style="padding: 16px 20px; background-color: #f0f7ff; border-radius: 8px; border: 1px solid #d0e8ff;">
              <p style="margin: 0; color: ${COLORS.textDark}; font-size: 13px; line-height: 1.6;">
                ${hasCv
                  ? `📎 <strong>The candidate's CV is attached to this email.</strong> You can also review their full profile in the admin panel.`
                  : `⚠️ No CV was found on file for this candidate. Review their profile in the admin panel for more details.`}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${applicationUrl}" style="display: inline-block; background-color: ${COLORS.orange}; color: ${COLORS.white}; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Review Application
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(content, 'Admin Notification');
};

export const getAdminApplicationNotificationText = ({
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  companyName,
  jobId,
  applicationId,
  candidateCity,
  candidateCountry,
  yearsOfExperience,
  hasCv,
}: AdminApplicationNotificationProps): string => {
  const location = [candidateCity, candidateCountry].filter(Boolean).join(', ') || '—';
  const applicationUrl = URLS.adminJobApplications(jobId);

  return `New Job Application Received

A new candidate has applied for ${jobTitle} at ${companyName}.

Candidate Details:
- Name: ${candidateName}
- Email: ${candidateEmail}
${candidatePhone ? `- Phone: ${candidatePhone}\n` : ''}- Location: ${location}
${yearsOfExperience !== undefined && yearsOfExperience !== null ? `- Experience: ${yearsOfExperience} ${Number(yearsOfExperience) === 1 ? 'year' : 'years'}\n` : ''}
${hasCv ? "The candidate's CV is attached to this email." : 'No CV was found on file for this candidate.'}

Review Application: ${applicationUrl}

— The Seamfox Team`;
};

export function getApplicationStatusUpdateTemplate({
  candidateName,
  jobTitle,
  companyName,
  statusName,
  applicationUrl,
}: any) {

return `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#f5f7fa;font-family:Arial">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px">
<tr>
<td align="center">

<table width="600" style="background:white;border-radius:12px;overflow:hidden">

<tr>
<td style="background:#022A45;padding:30px;text-align:center">

<h1 style="color:white;margin:0">
Seamfox
</h1>

<p style="color:#FED9C2">
Application Update
</p>

</td>
</tr>


<tr>
<td style="padding:40px">


<h2 style="color:#022A45">
Hi ${candidateName},
</h2>


<p>
There is an update regarding your application.
</p>


<p>
<strong>${jobTitle}</strong>
</p>


<p>
${companyName}
</p>



<div style="
background:#fff8f4;
border-left:4px solid #CD4E1A;
padding:20px;
margin:25px 0;
">


<p>
Current Stage
</p>


<h2 style="color:#CD4E1A">
${statusName}
</h2>


</div>



<div style="text-align:center">

<a href="${applicationUrl}"
style="
background:#CD4E1A;
color:white;
padding:14px 30px;
border-radius:8px;
text-decoration:none;
">
View Application
</a>

</div>


</td>
</tr>



<tr>
<td style="background:#022A45;padding:15px;text-align:center">

<p style="color:#FED9C2">
© ${new Date().getFullYear()} Seamfox
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

}



export function getApplicationStatusUpdateText({
candidateName,
jobTitle,
companyName,
statusName,
}: any) {

return `
Hi ${candidateName},

Your application status has been updated.

Role:
${jobTitle}

Company:
${companyName}

Current Stage:
${statusName}

Regards,
Seamfox Team
`;

}
