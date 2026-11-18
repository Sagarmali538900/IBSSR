import { NextResponse } from 'next/server';

export async function readValidatedJson(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ message: 'Request body must be valid JSON.', errors: {} }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.') || 'body', issue.message]));
    const message = result.error.issues[0]?.message || 'Please check the submitted information.';
    return {
      success: false,
      response: NextResponse.json({ message, errors }, { status: 400 }),
    };
  }

  return { success: true, data: result.data };
}

export function formatZodErrors(error) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'body', issue.message]));
}

export function validateImageUpload(file) {
  if (!file || typeof file === 'string') return { success: true };
  if (file.size < 1 || file.size > 5 * 1024 * 1024) {
    return { success: false, message: 'Each image must be smaller than 5 MB.' };
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    return { success: false, message: 'Use a JPEG, PNG, WebP, or GIF image.' };
  }
  return { success: true };
}
