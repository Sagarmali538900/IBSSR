import { NextResponse } from 'next/server';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { User } from '@/models';
import { ids } from '@/lib/schemas';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!ids.objectId.safeParse(id).success) return NextResponse.json({ message: 'Invalid partner ID.' }, { status: 400 });
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    
    // Only superusers can manage franchises
    if (!session || !session.isSuperuser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Toggling
    user.isActive = !user.isActive;
    await user.save();

    const status = user.isActive ? 'enabled' : 'disabled';
    return NextResponse.json({ success: true, message: `Franchise user '${user.username}' has been ${status}.` });

  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
