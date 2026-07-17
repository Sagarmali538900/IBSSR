import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { User } from '@/lib/models';
import FranchisesClient from './FranchisesClient';

export default async function FranchisesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifyToken(token) : null;
  
  // Guard page for Owner / Superuser only
  if (!session || !session.isSuperuser) {
    notFound();
  }

  await dbConnect();

  // Find all franchise users (not superusers)
  const franchises = await User.find({ isSuperuser: false })
    .sort({ dateJoined: -1 });

  // Serialize Mongoose docs
  const serializedFranchises = franchises.map(f => ({
    id: f._id.toString(),
    username: f.username,
    email: f.email,
    isActive: f.isActive,
    dateJoined: f.dateJoined.toISOString()
  }));

  return <FranchisesClient franchises={serializedFranchises} />;
}
