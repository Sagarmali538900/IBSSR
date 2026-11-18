import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { User } from '@/models';
import { comparePassword, signToken } from '@/auth';
import { readValidatedJson } from '@/lib/validation';
import { schemas } from '@/lib/schemas';

export async function POST(request) {
  try {
    await dbConnect();
    const validation = await readValidatedJson(request, schemas.login);
    if (!validation.success) return validation.response;
    const { username, password } = validation.data;

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
    console.error('Login request failed:', error);
    const message = error.message?.includes('MONGODB_URI')
      ? error.message
      : error.name === 'MongooseServerSelectionError'
        ? 'The database is unreachable. Check backend/.env.local and confirm MongoDB is running.'
        : 'The login service failed. Check the backend terminal for details.';
    return NextResponse.json({ message }, { status: 503 });
  }
}
