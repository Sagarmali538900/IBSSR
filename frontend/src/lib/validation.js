import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.');
const requiredText = (label, max = 120) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid ID is required.');
const numeric = (schema, invalidMessage = 'Enter a valid number.') => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? Number.NaN : value,
  z.coerce.number({ error: invalidMessage }).pipe(schema),
);
const dateOfBirth = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth.').refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Enter a valid date of birth.').refine((value) => value <= new Date().toISOString().slice(0, 10), 'Date of birth cannot be in the future.');

export const inputSchemas = {
  login: z.object({ username: requiredText('Username', 80), password: z.string().min(1, 'Password is required.').max(128, 'Password must be 128 characters or fewer.') }),
  resetRequest: z.object({ email }),
  resetConfirm: z.object({ token: z.string().min(32, 'This reset link is invalid or expired.'), password: z.string().min(12, 'Password must be at least 12 characters.').max(128, 'Password must be 128 characters or fewer.') }),
  accessCode: z.object({ examCode: requiredText('Exam access code', 40) }),
  candidateRegistration: z.object({
    examCode: requiredText('Exam access code', 40),
    fullName: requiredText('Full name', 120),
    email,
    mobileNumber: z.string().trim().regex(/^\+?[\d\s().-]{7,24}$/, 'Enter a valid phone number.'),
    dob: dateOfBirth,
    education: requiredText('Education', 160),
  }),
  exam: z.object({ title: requiredText('Title', 160), description: z.string().trim().max(4000, 'Description must be 4,000 characters or fewer.') }),
  section: z.object({
    name: requiredText('Section name', 120),
    description: z.string().trim().max(2000, 'Description must be 2,000 characters or fewer.'),
    durationMinutes: numeric(z.number().int('Minutes must be a whole number.').min(0, 'Minutes cannot be negative.').max(1440, 'Minutes cannot exceed 1,440.'), 'Enter the section minutes.'),
    durationSeconds: numeric(z.number().int('Seconds must be a whole number.').min(0, 'Seconds cannot be negative.').max(59, 'Seconds must be 59 or less.'), 'Enter the section seconds.'),
    order: numeric(z.number().int('Order must be a whole number.').min(0, 'Sorting order cannot be negative.').max(10000, 'Sorting order cannot exceed 10,000.'), 'Enter a sorting order.'),
  }).superRefine((value, context) => {
    if (value.durationMinutes === 0 && value.durationSeconds === 0) context.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Section duration must be greater than zero.' });
  }),
  question: z.object({
    text: requiredText('Question text', 5000),
    questionType: z.enum(['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice']),
    estimatedTimeSeconds: numeric(z.number().int('Suggested time must be in whole seconds.').min(0).max(3600)),
    order: numeric(z.number().int('Order must be a whole number.').min(0).max(10000)),
    options: z.array(z.object({ text: z.string().trim().max(1000), score: numeric(z.number().finite('Score must be a number.').min(-100000).max(100000)) })).max(100)
      .superRefine((options, context) => {
        const filled = options.filter((option) => option.text.length > 0);
        if (!filled.length) context.addIssue({ code: 'custom', message: 'Add at least one answer option.' });
      }),
  }),
  franchise: z.object({ username: requiredText('Username', 80), email, password: z.string().min(12, 'Password must be at least 12 characters.').max(128, 'Password must be 128 characters or fewer.') }),
  assignment: z.object({ examId: objectId, examCode: z.string().trim().max(40, 'Assignment code must be 40 characters or fewer.'), emailsText: requiredText('At least one email', 20000) }).superRefine(({ emailsText }, context) => {
    const emails = emailsText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    if (!emails.length) context.addIssue({ code: 'custom', path: ['emailsText'], message: 'Enter at least one email address.' });
    const invalid = emails.find((value) => !email.safeParse(value).success);
    if (invalid) context.addIssue({ code: 'custom', path: ['emailsText'], message: `Enter a valid email address: ${invalid}` });
  }),
  assignmentEdit: z.object({ examCode: requiredText('Assignment code', 40), assignedEmail: email }),
  saveAnswer: z.object({ sessionId: objectId, questionId: objectId, optionIds: z.array(objectId).max(100) }),
  submitSection: z.object({ sessionId: objectId, answers: z.record(z.string().regex(/^[a-f\d]{24}$/i), z.array(objectId).max(100)) }),
  storageCleanup: z.object({
    target: z.enum(['blob', 'collections']),
    selectedCollections: z.array(requiredText('Collection', 120)).max(100),
    selectedBlobUrls: z.array(z.string().url('Selected asset URL is invalid.').max(2048).refine((value) => {
      try {
        const hostname = new URL(value).hostname;
        return hostname.endsWith('.blob.vercel-storage.com') || hostname === 'blob.vercel-storage.com';
      } catch {
        return false;
      }
    }, 'Select a valid Vercel Blob asset.')).max(500),
    olderThanDays: z.coerce.number().int('Retention period must be a whole number.').min(0).max(36500),
  }).superRefine((value, context) => {
    const count = value.target === 'blob' ? value.selectedBlobUrls.length : value.selectedCollections.length;
    if (!count) context.addIssue({ code: 'custom', path: [value.target === 'blob' ? 'selectedBlobUrls' : 'selectedCollections'], message: 'Select at least one item.' });
  }),
  importFile: z.any().superRefine((file, context) => {
    if (typeof File === 'undefined' || !(file instanceof File)) {
      context.addIssue({ code: 'custom', message: 'Choose an assessment file.' });
      return;
    }
    if (!/\.(json|xlsx?)$/i.test(file.name)) context.addIssue({ code: 'custom', message: 'Choose a .json, .xlsx, or .xls file.' });
    if (file.size < 1 || file.size > 10 * 1024 * 1024) context.addIssue({ code: 'custom', message: 'The file must be non-empty and 10 MB or smaller.' });
  }),
};

export function validateInput(schema, value) {
  const result = schema.safeParse(value);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, message: result.error.issues[0]?.message || 'Please check the submitted information.' };
}

export function validateImageFiles(files) {
  for (const file of files.filter(Boolean)) {
    if (typeof File === 'undefined' || !(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return 'Use a JPEG, PNG, WebP, or GIF image.';
    if (file.size < 1 || file.size > 5 * 1024 * 1024) return 'Each image must be smaller than 5 MB.';
  }
  return null;
}
