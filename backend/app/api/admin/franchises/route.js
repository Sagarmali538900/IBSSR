import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken, hashPassword } from '@/auth';
import { User } from '@/models';
import { sendEmail } from '@/mail';
import { getFranchiseWelcomeEmail } from '@/emailTemplates';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function GET(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session?.isSuperuser) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const franchises = await User.find({ isSuperuser: false }).sort({ dateJoined: -1 });
    return NextResponse.json({ franchises: franchises.map((f) => ({ id: f._id.toString(), username: f.username, email: f.email, isActive: f.isActive, dateJoined: f.dateJoined.toISOString() })) });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    
    // Only superusers can manage franchises
    if (!session || !session.isSuperuser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const validation = await readValidatedJson(request, schemas.franchise);
    if (!validation.success) return validation.response;
    const { username, email, password } = validation.data;

    // Check duplicate username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ message: 'A user with this username already exists.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      isSuperuser: false,
      isActive: true
    });

    // Send welcome email with login credentials to franchise
    const subject = `IBSSR Portal: Franchise Account Created`;
    const { html, text } = getFranchiseWelcomeEmail(username, password);

    try {
      await sendEmail({
        to: email,
        subject,
        text,
        html
      });
    } catch (err) {
      console.error(`Failed to send franchise welcome email to ${email}:`, err.message);
    }

    return NextResponse.json({ success: true, username: newUser.username });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
