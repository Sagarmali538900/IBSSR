import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'Account is deactivated. Contact administrator.' }, { status: 403 });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    const token = await signToken({
      userId: user._id.toString(),
      username: user.username,
      isSuperuser: user.isSuperuser,
      isActive: user.isActive
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
