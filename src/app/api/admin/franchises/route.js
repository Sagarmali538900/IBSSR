import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';
import { User } from '@/lib/models';
import { sendEmail } from '@/lib/mail';

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    
    // Only superusers can manage franchises
    if (!session || !session.isSuperuser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

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
    const textBody = `Hello,\n\n` +
      `Your administrative/franchise account has been successfully created on the IBSSR Portal.\n\n` +
      `Login Credentials:\n` +
      `- Username: ${username}\n` +
      `- Password: ${password}\n\n` +
      `To log in and access your dashboard:\n` +
      `1. Go to: https://ibssr.vercel.app/login\n` +
      `2. Log in using your username and password.\n\n` +
      `Best regards,\n` +
      `IBSSR Examination Team`;

    try {
      await sendEmail({
        to: email,
        subject,
        text: textBody
      });
    } catch (err) {
      console.error(`Failed to send franchise welcome email to ${email}:`, err.message);
    }

    return NextResponse.json({ success: true, username: newUser.username });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
