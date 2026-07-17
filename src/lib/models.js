import mongoose from 'mongoose';

// 1. User Model Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  isSuperuser: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  dateJoined: { type: Date, default: Date.now }
});

// 2. Exam Model Schema
const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 3. Section Model Schema
const SectionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  durationMinutes: { type: Number, default: 10 },
  durationSeconds: { type: Number, default: 0 },
  order: { type: Number, default: 0 }
});

// 4. Question Model Schema
const QuestionSchema = new mongoose.Schema({
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  text: { type: String, required: true },
  image: { type: String, default: null },
  questionType: { type: String, enum: ['single_select', 'multi_select'], default: 'single_select' },
  order: { type: Number, default: 0 }
});

// 5. Option Model Schema
const OptionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  text: { type: String, required: true },
  image: { type: String, default: null },
  score: { type: Number, default: 0.0 }
});

// 6. ExamAssignment Model Schema
const ExamAssignmentSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  examCode: { type: String, required: true },
  assignedEmail: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  createdAt: { type: Date, default: Date.now }
});
ExamAssignmentSchema.index({ examCode: 1, assignedEmail: 1 }, { unique: true });

// 7. Candidate Model Schema
const CandidateSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 8. ExamSession Model Schema
const ExamSessionSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamAssignment', index: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  currentSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  sectionStartedAt: { type: Date, default: null },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }
});

// 9. CandidateAnswer Model Schema
const CandidateAnswerSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSession', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  selectedOptionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Option' }],
  answeredAt: { type: Date, default: Date.now }
});
CandidateAnswerSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

// 10. ExamResult Model Schema
const ExamResultSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSession', required: true, unique: true, index: true },
  overallScorePercentage: { type: Number, default: 0.0 },
  completedAt: { type: Date, default: Date.now }
});

// 11. SectionResult Model Schema
const SectionResultSchema = new mongoose.Schema({
  examResultId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamResult', required: true, index: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  scorePercentage: { type: Number, default: 0.0 }
});

// 12. SentEmailLog Model Schema
const SentEmailLogSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Sent' }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
export const Section = mongoose.models.Section || mongoose.model('Section', SectionSchema);
export const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export const Option = mongoose.models.Option || mongoose.model('Option', OptionSchema);
export const ExamAssignment = mongoose.models.ExamAssignment || mongoose.model('ExamAssignment', ExamAssignmentSchema);
export const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);
export const ExamSession = mongoose.models.ExamSession || mongoose.model('ExamSession', ExamSessionSchema);
export const CandidateAnswer = mongoose.models.CandidateAnswer || mongoose.model('CandidateAnswer', CandidateAnswerSchema);
export const ExamResult = mongoose.models.ExamResult || mongoose.model('ExamResult', ExamResultSchema);
export const SectionResult = mongoose.models.SectionResult || mongoose.model('SectionResult', SectionResultSchema);
export const SentEmailLog = mongoose.models.SentEmailLog || mongoose.model('SentEmailLog', SentEmailLogSchema);
