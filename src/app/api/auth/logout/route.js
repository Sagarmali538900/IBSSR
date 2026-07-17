import { NextResponse } from 'next/server';

export async function GET(request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('session');
  return response;
}

export async function POST(request) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('session');
  return response;
}
