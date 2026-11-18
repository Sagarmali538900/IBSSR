import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { User } from '@/models';
import { hashPassword } from '@/auth';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function POST(request) {
  try {
    const validation = await readValidatedJson(request, schemas.passwordResetConfirm);
    if (!validation.success) return validation.response;
    const { token, password } = validation.data;

    await dbConnect();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() }, isActive: true });
    if (!user) {
      return NextResponse.json({ message: 'This reset link is invalid or expired. Request a new one.' }, { status: 400 });
    }

    user.password = await hashPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    return NextResponse.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('Password reset confirmation failed:', error);
    return NextResponse.json({ message: 'Password reset failed. Please try again.' }, { status: 503 });
  }
}
