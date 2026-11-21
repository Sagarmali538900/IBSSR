import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid ID is required.');
const email = z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.');
const shortText = (label, max = 120) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));
const password = z.string().min(12, 'Password must be at least 12 characters.').max(128, 'Password must be 128 characters or fewer.');
const imageReference = z.string().max(2048).refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), 'Image reference must be a local path or HTTP(S) URL.').nullable();
const numeric = (schema) => z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? Number.NaN : value, z.coerce.number().pipe(schema));
const blobUrl = z.string().url().max(2048).refine((value) => {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'blob.vercel-storage.com' || hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}, 'Select a valid Vercel Blob asset.');
const dateOfBirth = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth.').refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Enter a valid date of birth.').refine((value) => value <= new Date().toISOString().slice(0, 10), 'Date of birth cannot be in the future.');

export const schemas = {
  login: z.object({ username: shortText('Username', 80), password: z.string().min(1, 'Password is required.').max(128, 'Password must be 128 characters or fewer.') }),
  passwordResetRequest: z.object({ email }),
  passwordResetConfirm: z.object({ token: z.string().min(32, 'This reset link is invalid or expired.').max(256), password }),
  exam: z.object({ title: shortText('Title', 160), description: optionalText(4000) }),
  section: z.object({
    name: shortText('Section name', 120),
    description: optionalText(2000),
    durationMinutes: numeric(z.number().int().min(0).max(1440)).optional().default(10),
    durationSeconds: numeric(z.number().int().min(0).max(59)).optional().default(0),
    order: numeric(z.number().int().min(0).max(10000)).optional().default(0),
  }).superRefine((value, context) => {
    if (value.durationMinutes === 0 && value.durationSeconds === 0) context.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Section duration must be greater than zero.' });
  }),
  candidateEntry: z.object({
    step: z.coerce.number().int().min(1).max(2),
    examCode: shortText('Exam access code', 40),
    fullName: optionalText(120),
    email: email.optional(),
    mobileNumber: optionalText(24),
    dob: dateOfBirth.optional(),
    education: optionalText(160),
  }).superRefine((value, context) => {
    if (value.step === 2) {
      if (!value.fullName) context.addIssue({ code: 'custom', path: ['fullName'], message: 'Full name is required.' });
      if (!value.email) context.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address.' });
      if (!value.mobileNumber || !/^\+?[\d\s().-]{7,24}$/.test(value.mobileNumber)) context.addIssue({ code: 'custom', path: ['mobileNumber'], message: 'Enter a valid phone number.' });
      if (!value.dob) context.addIssue({ code: 'custom', path: ['dob'], message: 'Date of birth is required.' });
      if (!value.education) context.addIssue({ code: 'custom', path: ['education'], message: 'Education is required.' });
    }
  }),
  saveAnswer: z.object({ sessionId: objectId, questionId: objectId, optionIds: z.array(objectId).max(100).optional().default([]) }),
  submitSection: z.object({
    sessionId: objectId,
    answers: z.record(z.string().regex(/^[a-f\d]{24}$/i), z.array(objectId).max(100)).optional().default({}),
  }),
  createAssignments: z.object({
    examId: objectId,
    examCode: z.string().trim().max(40).optional().or(z.literal('')),
    emailsText: shortText('At least one email', 20000),
  }).superRefine(({ emailsText }, context) => {
    const addresses = emailsText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    if (!addresses.length) context.addIssue({ code: 'custom', path: ['emailsText'], message: 'Enter at least one email address.' });
    const invalid = addresses.find((address) => !email.safeParse(address).success);
    if (invalid) context.addIssue({ code: 'custom', path: ['emailsText'], message: `Enter a valid email address: ${invalid}` });
  }),
  updateAssignment: z.object({ examCode: shortText('Assignment code', 40), assignedEmail: email }),
  franchise: z.object({ username: shortText('Username', 80), email, password }),
  storageCleanup: z.object({
    target: z.enum(['blob', 'collections']),
    selectedCollections: z.array(z.string().trim().min(1).max(120)).max(100).optional().default([]),
    selectedBlobUrls: z.array(blobUrl).max(500).optional().default([]),
    olderThanDays: z.coerce.number().int().min(0).max(36500).optional().default(0),
  }).superRefine((value, context) => {
    if (value.target === 'blob' && value.selectedBlobUrls.length === 0) context.addIssue({ code: 'custom', path: ['selectedBlobUrls'], message: 'Select at least one file.' });
    if (value.target === 'collections' && value.selectedCollections.length === 0) context.addIssue({ code: 'custom', path: ['selectedCollections'], message: 'Select at least one collection.' });
  }),
  pdfTemplate: z.object({ key: z.enum(['cover', 'key_benefits', 'career_model', 'back_cover']), imageUrl: z.string().url().max(2048) }),
  questionFields: z.object({
    text: shortText('Question text', 5000),
    questionType: z.enum(['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice']),
    estimatedTimeSeconds: z.coerce.number().int().min(0).max(3600).optional().default(0),
    order: z.coerce.number().int().min(0).max(10000),
    options: z.array(z.object({ id: objectId.optional(), text: shortText('Option text', 1000), score: z.coerce.number().finite().min(-100000).max(100000) })).min(1).max(100),
  }),
  examImport: z.object({
    title: shortText('Title', 160),
    description: optionalText(4000),
    sections: z.array(z.object({
      name: shortText('Section name', 120),
      description: optionalText(2000),
      duration_minutes: z.coerce.number().int().min(0).max(1440).optional(),
      duration_seconds: z.coerce.number().int().min(0).max(59).optional(),
      order: z.coerce.number().int().min(0).max(10000).optional(),
      questions: z.array(z.object({
        text: shortText('Question text', 5000),
        question_type: z.enum(['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice']).optional(),
        estimated_time_seconds: z.coerce.number().int().min(0).max(3600).optional(),
        order: z.coerce.number().int().min(0).max(10000).optional(),
        image: imageReference.optional(),
        options: z.array(z.object({ text: shortText('Option text', 1000), image: imageReference.optional(), score: z.coerce.number().finite().min(-100000).max(100000).optional() })).min(1, 'Each question must have at least one answer choice.').max(100),
      })).min(1, 'Each section must contain at least one question.').max(1000),
    }).superRefine((section, context) => {
      if (section.duration_minutes === 0 && (section.duration_seconds ?? 0) === 0) {
        context.addIssue({ code: 'custom', path: ['duration_minutes'], message: 'Section duration must be greater than zero.' });
      }
    })).min(1, 'An assessment must contain at least one section.').max(500),
  }),
  normalizedExamImport: z.object({
    title: shortText('Title', 160),
    description: optionalText(4000),
    sections: z.record(z.string(), z.object({
      name: shortText('Section name', 120), description: optionalText(2000),
      durationMinutes: z.coerce.number().int().min(0).max(1440), durationSeconds: z.coerce.number().int().min(0).max(59), order: z.coerce.number().int().min(0).max(10000),
      questions: z.record(z.string(), z.object({
        text: shortText('Question text', 5000), questionType: z.enum(['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice']), estimatedTimeSeconds: z.coerce.number().int().min(0).max(3600).optional().default(0), order: z.coerce.number().int().min(0).max(10000), image: imageReference,
        options: z.array(z.object({ text: shortText('Option text', 1000), image: imageReference, score: z.coerce.number().finite().min(-100000).max(100000) })).min(1, 'Each question must have at least one answer choice.').max(100),
      })).superRefine((questions, context) => {
        const count = Object.keys(questions).length;
        if (count < 1) context.addIssue({ code: 'custom', message: 'Each section must contain at least one question.' });
        if (count > 1000) context.addIssue({ code: 'custom', message: 'Each section can contain at most 1,000 questions.' });
      }),
    }).superRefine((section, context) => {
      if (section.durationMinutes === 0 && section.durationSeconds === 0) {
        context.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Section duration must be greater than zero.' });
      }
    })).superRefine((sections, context) => {
      if (Object.keys(sections).length < 1) context.addIssue({ code: 'custom', message: 'An assessment must contain at least one section.' });
      if (Object.keys(sections).length > 500) context.addIssue({ code: 'custom', message: 'An assessment can include at most 500 sections.' });
    }),
  }),
  storageExportQuery: z.object({
    type: z.enum(['full', 'collections', 'blob_manifest']).optional().default('full'),
    names: z.string().max(5000).optional().default(''),
    urls: z.array(blobUrl).max(500).optional(),
  }),
  resultsQuery: z.object({ q: z.string().max(100, 'Search text must be 100 characters or fewer.').optional().default('') }),
};

export const ids = { objectId };
