import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter {
    if (!this.transporter) {
      if (config.smtp.user && config.smtp.pass) {
        if (config.smtp.host === 'smtp.gmail.com' || config.smtp.user.includes('@gmail.com')) {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: config.smtp.user,
              pass: config.smtp.pass,
            },
          });
        } else {
          this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: {
              user: config.smtp.user,
              pass: config.smtp.pass,
            },
          });
        }
      } else {
        // Fallback for local testing when SMTP credentials are not yet set
        console.warn('?? [EmailService] SMTP credentials not configured. Logging emails to console.');
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'windows',
          buffer: true,
        });
      }
    }
    return this.transporter;
  }

  static async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    const transporter = this.getTransporter();

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px;">
          <h2 style="color: #58a6ff; margin-top: 0;">Welcome to CloudLab, ${name}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #8b949e;">
            Thank you for creating your account. To unlock your practical DevOps and Cloud labs, please verify your email address.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${verifyUrl}" style="background-color: #238636; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 16px; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 14px; color: #8b949e;">
            Or paste this link into your browser: <br/>
            <a href="${verifyUrl}" style="color: #58a6ff; word-break: break-all;">${verifyUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #30363d; margin: 24px 0;" />
          <p style="font-size: 12px; color: #484f58; margin: 0;">
            This link will expire in 24 hours. If you did not sign up for CloudLab, please ignore this email.
          </p>
        </div>
      </div>
    `;

    try {
      const info: any = await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject: 'Verify your CloudLab account',
        html,
      });

      if (!config.smtp.user) {
        console.log(`\n================ EMAIL NOTIFICATION ================\nTo: ${to}\nAction: Verify Email\nLink: ${verifyUrl}\n====================================================\n`);
      } else {
        console.log(`?? [EmailService] Verification email sent to ${to} (MessageId: ${info.messageId})`);
      }
    } catch (err: any) {
      console.error(`? [EmailService] Failed to send verification email to ${to}:`, err.message);
    }
  }

  static async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    const transporter = this.getTransporter();

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px;">
          <h2 style="color: #f85149; margin-top: 0;">Password Reset Request</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #8b949e;">
            Hello ${name}, we received a request to reset your CloudLab password. Click the button below to choose a new secure password.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #da3633; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 16px; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #8b949e;">
            Or copy this link: <br/>
            <a href="${resetUrl}" style="color: #58a6ff; word-break: break-all;">${resetUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #30363d; margin: 24px 0;" />
          <p style="font-size: 12px; color: #484f58; margin: 0;">
            This link is valid for 1 hour. If you didn't request a reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    try {
      const info: any = await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject: 'Reset your CloudLab password',
        html,
      });

      if (!config.smtp.user) {
        console.log(`\n================ EMAIL NOTIFICATION ================\nTo: ${to}\nAction: Password Reset\nLink: ${resetUrl}\n====================================================\n`);
      } else {
        console.log(`?? [EmailService] Password reset email sent to ${to} (MessageId: ${info.messageId})`);
      }
    } catch (err: any) {
      console.error(`? [EmailService] Failed to send password reset email to ${to}:`, err.message);
    }
  }
}
