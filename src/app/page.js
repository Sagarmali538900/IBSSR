import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect root to candidate entry portal
  redirect('/candidate/entry');
}
