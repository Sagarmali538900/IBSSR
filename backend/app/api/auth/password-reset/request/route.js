import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { User } from '@/models';
import { sendEmail } from '@/mail';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

const normalizeEmail = (email) => email.trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function POST(request) {
  try {
    const validation = await readValidatedJson(request, schemas.passwordResetRequest);
    if (!validation.success) return validation.response;
    const normalizedEmail = normalizeEmail(validation.data.email);

    const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!smtpReady && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Password reset email is temporarily unavailable. Contact your administrator.' }, { status: 503 });
    }
    const responseMessage = smtpReady
      ? 'If an active account uses that email, reset instructions will be sent shortly.'
      : 'If an active account uses that email, the local reset link will be printed in the backend terminal.';

    await dbConnect();
    const users = await User.find({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } }).limit(2);
    const user = users.length === 1 && users[0].isActive ? users[0] : null;
    if (!user) {
      return NextResponse.json({ message: responseMessage });
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      if (!smtpReady) {
        console.info(`[DEV PASSWORD RESET] User ${user.username}: ${resetUrl}`);
      } else {
        await sendEmail({
          to: user.email,
          subject: 'Reset your IBSSR portal password',
          text: `A password reset was requested for your IBSSR account. Open this link within one hour to choose a new password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>A password reset was requested for your IBSSR account.</p><p><a href="${resetUrl}">Choose a new password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
        });
      }
    } catch (error) {
      if (user.passwordResetTokenHash === tokenHash) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();
      }
      console.error('Password reset email failed:', error);
      return NextResponse.json({ message: responseMessage });
    }

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error('Password reset request failed:', error);
    return NextResponse.json({ message: 'Password reset could not be started. Check backend configuration and try again.' }, { status: 503 });
  }
}
