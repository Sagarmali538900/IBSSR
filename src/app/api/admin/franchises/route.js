import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';
import { User } from '@/lib/models';

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

    return NextResponse.json({ success: true, username: newUser.username });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
