import { Exam } from '@/models';

export const EXAM_TITLE_TAKEN_MESSAGE = 'An assessment with this title already exists. Choose a different title.';
export const normalizeExamTitle = (title) => String(title || '').trim().toLocaleLowerCase('en-US');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function examTitleExists(title, excludeId = null) {
  const normalizedTitle = normalizeExamTitle(title);
  if (!normalizedTitle) return false;

  const query = {
    title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
  };
  if (excludeId) query._id = { $ne: excludeId };

  return Boolean(await Exam.exists(query));
}

export function isExamTitleDuplicateError(error) {
  return error?.code === 11000 && Boolean(error.keyPattern?.titleKey || error.keyValue?.titleKey);
}
