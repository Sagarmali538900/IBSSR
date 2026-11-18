import dbConnect from '@/db';

export async function GET() {
  try {
    await dbConnect();
    return Response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database readiness check failed:', error);
    return Response.json({ status: 'error', database: 'unavailable' }, { status: 503 });
  }
}
