import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }

    async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@neobazaar.com',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password. Click the button below to reset it:</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                        Reset Password
                    </a>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all;">${resetUrl}</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    async sendWelcomeEmail(email: string, name: string): Promise<void> {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@neobazaar.com',
            to: email,
            subject: 'Welcome to NeoBazaar',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to NeoBazaar, ${name}!</h2>
                    <p>Thank you for registering with us.</p>
                    <p>We're excited to have you on board.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    }
}
