interface OtpTemplateProps {
  otp: number | string;
  otpValidation: number;
}

export const getOtpText = ({ otp, otpValidation }: OtpTemplateProps): string => {
  return `Hello!

Your Seamfox verification code is:

${otp}

This code will expire in ${otpValidation} ${otpValidation === 1 ? 'minute' : 'minutes'}.

If you did not request this code, please ignore this email or contact our support team.

Thank you,
The Seamfox Team`;
};

export const getOTPTemplate = ({ otp, otpValidation }: OtpTemplateProps): string => {
  const minutesLabel = otpValidation === 1 ? 'minute' : 'minutes';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Seamfox Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(2, 42, 69, 0.08);">

          <tr>
            <td style="background: linear-gradient(135deg, #022A45 0%, #033857 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                Seamfox
              </h1>
              <p style="margin: 6px 0 0; color: #FED9C2; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px;">
                Verification Code
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 40px 24px;">
              <h2 style="margin: 0 0 16px; color: #022A45; font-size: 20px; font-weight: 600;">
                Hello!
              </h2>
              <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                Use the verification code below to complete your action. This code is valid for <strong style="color: #022A45;">${otpValidation} ${minutesLabel}</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #fff8f4; border: 2px dashed #CD4E1A; border-radius: 12px; padding: 20px 32px;">
                      <p style="margin: 0 0 4px; color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                        Your Code
                      </p>
                      <p style="margin: 0; color: #022A45; font-size: 36px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 0; background-color: #fff8f4; border-left: 4px solid #CD4E1A; border-radius: 6px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0; color: #022A45; font-size: 13px; line-height: 1.5;">
                      <strong>⏱ Expires in ${otpValidation} ${minutesLabel}.</strong> For security, do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                If you didn't request this code, you can safely ignore this email. Someone may have entered your address by mistake.
              </p>
            </td>
          </tr>

          <tr>
            <td style="border-top: 1px solid #e4e8ed; padding: 24px 40px; background-color: #fafbfc;">
              <p style="margin: 0 0 8px; color: #022A45; font-size: 13px; font-weight: 600;">
                Need help?
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                Contact our support team at <a href="mailto:support@seamfox.com" style="color: #CD4E1A; text-decoration: none; font-weight: 600;">support@seamfox.com</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #022A45; padding: 16px 40px; text-align: center;">
              <p style="margin: 0; color: #FED9C2; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
                © ${new Date().getFullYear()} Seamfox · Commodity Talent Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
