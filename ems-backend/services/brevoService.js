import { BrevoClient } from '@getbrevo/brevo'

export const sendOtpEmail = async ({recipientEmail, recipientName, otp}) => {

    const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY
    })
    await brevo.transactionalEmails.sendTransacEmail({
        sender: {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        },
        to: [
            {
                email: recipientEmail,
                name: recipientName
            }
        ],
        subject: 'Your Event Management System OTP',
        textContent: `Your verification code is ${otp}. It expires in ${
    process.env.OTP_EXPIRES_MINUTES || 5
} minutes.`,

        htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;">
                <tr>
                    <td align="center">
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden;"
                        >
                            <tr>
                                <td style="background:#4169E1; padding:24px; text-align:center; color:#ffffff;">
                                    <h1 style="margin:0; font-size:24px;">
                                        Event Management System
                                    </h1>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:32px; text-align:center; color:#333333;">
                                    <h2>Login Verification</h2>

                                    <p>
                                        Use the verification code below to complete your login:
                                    </p>

                                    <div style="
                                        margin:24px 0;
                                        padding:16px;
                                        background:#f1f3f5;
                                        border-radius:8px;
                                        font-size:32px;
                                        font-weight:bold;
                                        letter-spacing:8px;
                                        color:#4169E1;
                                    ">
                                        ${otp}
                                    </div>

                                    <p>
                                        This code expires in ${
                                            process.env.OTP_EXPIRES_MINUTES || 5
                                        } minutes.
                                    </p>

                                    <p style="font-size:13px; color:#777777;">
                                        If you did not request this code, you can ignore this email.
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:16px; text-align:center; background:#f8f9fa; color:#777777; font-size:12px;">
                                    This is an automated email. Please do not reply.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    })
};