import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import dbConnect from '@/db';
import { verifyToken } from '@/auth';
import { Exam, Section, Question, Option, CandidateAnswer, ExamSession, ExamResult } from '@/models';
import { ids, schemas } from '@/lib/schemas';
import { examTitleExists, EXAM_TITLE_TAKEN_MESSAGE, isExamTitleDuplicateError, normalizeExamTitle } from '@/lib/examTitle';

const EXCEL_HEADERS = [
  'Exam Title',
  'Exam Description',
  'Section Name',
  'Section Description',
  'Section Duration (Minutes)',
  'Section Duration (Seconds)',
  'Section Order',
  'Question Text',
  'Question Type',
  'Question Order',
  'Question Image Path',
  'Option Text',
  'Option Image Path',
  'Option Score',
  'Suggested Time (Seconds)',
];

const QUESTION_TYPES = new Set(['single_select', 'multi_select', 'rating_scale', 'image_choice', 'multi_image_choice']);
const isBlankCell = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

const SAMPLE_EXAM = {
  title: 'Sample Cognitive Assessment',
  description: 'A sample assessment showing the required import structure.',
  sections: [{
    name: 'Sample Section',
    description: 'Instructions for this sample section.',
    duration_minutes: 15,
    duration_seconds: 0,
    order: 1,
    questions: [{
      text: 'Which response best describes your level of agreement?',
      question_type: 'single_select',
      estimated_time_seconds: 60,
      order: 1,
      image: null,
      options: [
        { text: 'Agree', image: null, score: 1 },
        { text: 'Disagree', image: null, score: 0 },
      ],
    }],
  }],
};

function getExcelColumnIndexes(worksheet) {
  const headerRow = worksheet.getRow(1);
  const expectedHeaders = new Map(EXCEL_HEADERS.map((header) => [header.toLowerCase(), header]));
  const indexes = new Map();

  for (let column = 1; column <= headerRow.cellCount; column += 1) {
    const rawHeader = headerRow.getCell(column).value;
    if (isBlankCell(rawHeader)) continue;
    if (typeof rawHeader !== 'string') {
      throw new Error(`Column ${column} in the header row must contain a text label.`);
    }

    const normalizedHeader = rawHeader.trim().replace(/\s+/g, ' ').toLowerCase();
    const expectedHeader = expectedHeaders.get(normalizedHeader);
    if (!expectedHeader) {
      throw new Error(`Unexpected spreadsheet column "${rawHeader.trim()}". Use the exported exam template.`);
    }
    if (indexes.has(expectedHeader)) {
      throw new Error(`The spreadsheet has a duplicate "${expectedHeader}" column.`);
    }
    indexes.set(expectedHeader, column);
  }

  const missingHeaders = EXCEL_HEADERS.filter((header) => !indexes.has(header));
  if (missingHeaders.length) {
    throw new Error(`The spreadsheet is missing required columns: ${missingHeaders.join(', ')}.`);
  }

  return indexes;
}

function readExcelText(row, columnIndexes, header, rowNumber, { required = false } = {}) {
  const value = row.getCell(columnIndexes.get(header)).value;
  if (isBlankCell(value)) {
    if (required) throw new Error(`Row ${rowNumber}: ${header} is required.`);
    return '';
  }
  if (typeof value !== 'string') {
    throw new Error(`Row ${rowNumber}: ${header} must be plain text.`);
  }
  return value.trim();
}

function readExcelNumber(row, columnIndexes, header, rowNumber, defaultValue, { min, max, integer = true, required = false } = {}) {
  const value = row.getCell(columnIndexes.get(header)).value;
  if (isBlankCell(value)) {
    if (required) throw new Error(`Row ${rowNumber}: ${header} is required.`);
    return defaultValue;
  }
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`Row ${rowNumber}: ${header} must be a number.`);
  }

  const number = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(number)) throw new Error(`Row ${rowNumber}: ${header} must be a valid number.`);
  if (integer && !Number.isInteger(number)) throw new Error(`Row ${rowNumber}: ${header} must be a whole number.`);
  if (number < min || number > max) throw new Error(`Row ${rowNumber}: ${header} must be between ${min} and ${max}.`);
  return number;
}

function formatImportValidationIssue(issue) {
  const location = issue.path
    .map((part) => typeof part === 'number' ? `item ${part + 1}` : part)
    .join(' → ');

  if (issue.code === 'invalid_type' && issue.expected === 'string') {
    const received = issue.input === null ? 'null' : Array.isArray(issue.input) ? 'an array' : typeof issue.input;
    return `${location || 'Imported data'} must be text; received ${received}.`;
  }

  return location ? `${location}: ${issue.message}` : issue.message;
}

export async function GET(request) {
  const format = new URL(request.url).searchParams.get('format') || 'json';
  if (format === 'json') {
    return new Response(JSON.stringify(SAMPLE_EXAM, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sample-exam-import.json"',
      },
    });
  }

  if (format !== 'xlsx') {
    return NextResponse.json({ message: 'Choose the json or xlsx sample format.' }, { status: 400 });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exam Structure');
    worksheet.addRow(EXCEL_HEADERS);

    for (const section of SAMPLE_EXAM.sections) {
      for (const question of section.questions) {
        for (const option of question.options) {
          worksheet.addRow([
            SAMPLE_EXAM.title,
            SAMPLE_EXAM.description,
            section.name,
            section.description,
            section.duration_minutes,
            section.duration_seconds,
            section.order,
            question.text,
            question.question_type,
            question.order,
            question.image,
            option.text,
            option.image,
            option.score,
            question.estimated_time_seconds,
          ]);
        }
      }
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="sample-exam-import.xlsx"',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Could not generate the Excel sample file.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let formData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ message: 'Upload a valid assessment file.' }, { status: 400 }); }
    const file = formData.get('file');
    const overwriteExamId = formData.get('examId'); // Optional

    if (!file || typeof file === 'string' || !file.name) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'Choose a non-empty file up to 10 MB.' }, { status: 400 });
    }
    if (overwriteExamId && !ids.objectId.safeParse(overwriteExamId).success) {
      return NextResponse.json({ message: 'Invalid assessment ID.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let parsedData;

    const lowerFileName = file.name.toLowerCase();
    if (lowerFileName.endsWith('.json')) {
      // 1. JSON parsing
      try {
        const text = buffer.toString('utf-8');
        const json = JSON.parse(text);
        const importValidation = schemas.examImport.safeParse(json);
        if (!importValidation.success) {
          const issue = importValidation.error.issues[0];
          return NextResponse.json({ message: issue ? formatImportValidationIssue(issue) : 'The assessment file contains invalid data.' }, { status: 400 });
        }
        const validJson = importValidation.data;

        const sectionsDict = {};
        const sectionsList = validJson.sections || [];
        sectionsList.forEach((sec, secIdx) => {
          if (!sec.name) return;
          const secOrder = sec.order !== undefined ? sec.order : secIdx + 1;
          const secKey = `${sec.name}_${secOrder}`;

          sectionsDict[secKey] = {
            name: sec.name,
            description: sec.description || '',
            durationMinutes: sec.duration_minutes !== undefined ? sec.duration_minutes : 10,
            durationSeconds: sec.duration_seconds !== undefined ? sec.duration_seconds : 0,
            order: secOrder,
            questions: {}
          };

          const questionsList = sec.questions || [];
          questionsList.forEach((q, qIdx) => {
            if (!q.text) return;
            const qOrder = q.order !== undefined ? q.order : qIdx + 1;
            const qKey = `${q.text}_${qOrder}`;

            sectionsDict[secKey].questions[qKey] = {
              text: q.text,
              questionType: q.question_type || 'single_select',
              estimatedTimeSeconds: q.estimated_time_seconds || 0,
              order: qOrder,
              image: q.image || null,
              options: []
            };

            const optionsList = q.options || [];
            optionsList.forEach((opt) => {
              if (opt.text !== undefined && opt.text !== null) {
                sectionsDict[secKey].questions[qKey].options.push({
                  text: opt.text.toString().trim(),
                  image: opt.image || null,
                  score: opt.score !== undefined ? Number(opt.score) : 0.0
                });
              }
            });
          });
        });

        parsedData = {
          title: validJson.title,
          description: validJson.description || '',
          sections: sectionsDict
        };
      } catch (err) {
        return NextResponse.json({ message: `Error parsing JSON: ${err.message}` }, { status: 400 });
      }
    } else if (lowerFileName.endsWith('.xlsx')) {
      // 2. Excel parsing
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        return NextResponse.json({ message: 'This file is not a valid .xlsx workbook. Choose an Excel workbook saved in .xlsx format.' }, { status: 400 });
      }

      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(buffer);
      } catch {
        return NextResponse.json({ message: 'The .xlsx workbook could not be opened. Check that it is a valid Excel file and try again.' }, { status: 400 });
      }

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return NextResponse.json({ message: 'The Excel workbook must contain a first worksheet.' }, { status: 400 });
      }
      if (worksheet.rowCount > 10000) {
        return NextResponse.json({ message: 'The spreadsheet must contain no more than 10,000 rows.' }, { status: 400 });
      }

      let columnIndexes;
      try {
        columnIndexes = getExcelColumnIndexes(worksheet);
      } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }

      const sectionsMap = {};
      let examTitle = '';
      let examDesc = '';
      let dataRowCount = 0;
      const knownColumnNumbers = new Set(columnIndexes.values());

      try {
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
          const row = worksheet.getRow(rowNumber);
          for (let column = 1; column <= row.cellCount; column += 1) {
            if (!knownColumnNumbers.has(column) && !isBlankCell(row.getCell(column).value)) {
              throw new Error(`Row ${rowNumber}: Data was found in a column without a supported header.`);
            }
          }
          const rowHasData = EXCEL_HEADERS.some((header) => !isBlankCell(row.getCell(columnIndexes.get(header)).value));
          if (!rowHasData) continue;
          dataRowCount += 1;

          const rowExamTitle = readExcelText(row, columnIndexes, 'Exam Title', rowNumber, { required: !examTitle });
          const rowExamDesc = readExcelText(row, columnIndexes, 'Exam Description', rowNumber);
          if (rowExamTitle) {
            if (examTitle && examTitle !== rowExamTitle) throw new Error(`Row ${rowNumber}: Exam Title does not match the other data rows.`);
            examTitle = rowExamTitle;
          }
          if (rowExamDesc) {
            if (examDesc && examDesc !== rowExamDesc) throw new Error(`Row ${rowNumber}: Exam Description does not match the other data rows.`);
            examDesc = rowExamDesc;
          }

          const secNameStr = readExcelText(row, columnIndexes, 'Section Name', rowNumber, { required: true });
          const secDescription = readExcelText(row, columnIndexes, 'Section Description', rowNumber);
          const secMin = readExcelNumber(row, columnIndexes, 'Section Duration (Minutes)', rowNumber, 10, { min: 0, max: 1440 });
          const secSec = readExcelNumber(row, columnIndexes, 'Section Duration (Seconds)', rowNumber, 0, { min: 0, max: 59 });
          const secOrderNum = readExcelNumber(row, columnIndexes, 'Section Order', rowNumber, undefined, { min: 0, max: 10000, required: true });
          if (secMin === 0 && secSec === 0) throw new Error(`Row ${rowNumber}: Section duration must be greater than zero.`);

          const qTextStr = readExcelText(row, columnIndexes, 'Question Text', rowNumber, { required: true });
          const questionType = readExcelText(row, columnIndexes, 'Question Type', rowNumber, { required: true });
          if (!QUESTION_TYPES.has(questionType)) {
            throw new Error(`Row ${rowNumber}: Question Type must be one of: ${Array.from(QUESTION_TYPES).join(', ')}.`);
          }
          const optText = readExcelText(row, columnIndexes, 'Option Text', rowNumber, { required: true });

          const qOrderNum = readExcelNumber(row, columnIndexes, 'Question Order', rowNumber, undefined, { min: 0, max: 10000, required: true });
          const qImage = readExcelText(row, columnIndexes, 'Question Image Path', rowNumber) || null;
          const optImage = readExcelText(row, columnIndexes, 'Option Image Path', rowNumber) || null;
          const optScore = readExcelNumber(row, columnIndexes, 'Option Score', rowNumber, 0, { min: -100000, max: 100000, integer: false });
          const qTime = readExcelNumber(row, columnIndexes, 'Suggested Time (Seconds)', rowNumber, 0, { min: 0, max: 3600 });

          const secKey = `${secNameStr}_${secOrderNum}`;

          if (!sectionsMap[secKey]) {
            if (Object.keys(sectionsMap).length >= 500) throw new Error('An assessment can include at most 500 sections.');
            sectionsMap[secKey] = {
              name: secNameStr,
              description: secDescription,
              durationMinutes: secMin,
              durationSeconds: secSec,
              order: secOrderNum,
              questions: {}
            };
          } else if (
            sectionsMap[secKey].description !== secDescription ||
            sectionsMap[secKey].durationMinutes !== secMin ||
            sectionsMap[secKey].durationSeconds !== secSec
          ) {
            throw new Error(`Row ${rowNumber}: Section details must be consistent across its rows.`);
          }

          const secData = sectionsMap[secKey];
          const qKey = `${qTextStr}_${qOrderNum}`;

          if (!secData.questions[qKey]) {
            if (Object.keys(secData.questions).length >= 1000) throw new Error(`Section "${secNameStr}" can contain at most 1,000 questions.`);
            secData.questions[qKey] = {
              text: qTextStr,
              questionType,
              estimatedTimeSeconds: qTime,
              order: qOrderNum,
              image: qImage,
              options: []
            };
          } else {
            const existingQuestion = secData.questions[qKey];
            if (existingQuestion.questionType !== questionType || existingQuestion.estimatedTimeSeconds !== qTime || existingQuestion.image !== qImage) {
              throw new Error(`Row ${rowNumber}: Question details must be consistent across its answer-choice rows.`);
            }
          }

          const qData = secData.questions[qKey];
          if (qData.options.some((option) => option.text.toLowerCase() === optText.toLowerCase())) {
            throw new Error(`Row ${rowNumber}: Answer choices must be unique within a question.`);
          }
          if (qData.options.length >= 100) throw new Error(`Row ${rowNumber}: A question can have at most 100 answer choices.`);
          qData.options.push({ text: optText, image: optImage || null, score: optScore });
        }
      } catch (error) {
        return NextResponse.json({ message: error.message || 'The spreadsheet contains invalid data.' }, { status: 400 });
      }

      if (!dataRowCount || !Object.keys(sectionsMap).length) {
        return NextResponse.json({ message: 'The spreadsheet must include at least one complete section, question, and answer choice.' }, { status: 400 });
      }
      if (!examTitle) {
        return NextResponse.json({ message: 'Excel file is missing an Exam Title.' }, { status: 400 });
      }

      parsedData = { title: examTitle, description: examDesc, sections: sectionsMap };
    } else if (lowerFileName.endsWith('.xls')) {
      return NextResponse.json({ message: 'Legacy .xls files are not supported. Open the file in Excel and save it as .xlsx.' }, { status: 400 });
    } else {
      return NextResponse.json({ message: 'Unsupported file format. Please upload .json or .xlsx.' }, { status: 400 });
    }

    const normalizedValidation = schemas.normalizedExamImport.safeParse(parsedData);
    if (!normalizedValidation.success) {
      const issue = normalizedValidation.error.issues[0];
      return NextResponse.json({ message: issue ? formatImportValidationIssue(issue) : 'The assessment file contains invalid data.' }, { status: 400 });
    }
    parsedData = normalizedValidation.data;

    await dbConnect();

    // 3. Save parsed data to DB
    let exam;
    if (overwriteExamId) {
      exam = await Exam.findById(overwriteExamId);
      if (!exam) {
        return NextResponse.json({ message: 'Exam to overwrite not found.' }, { status: 404 });
      }

      // Role check
      if (!session.isSuperuser && exam.createdBy?.toString() !== session.userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      const duplicateTitle = await examTitleExists(parsedData.title, exam._id);
      if (normalizeExamTitle(parsedData.title) !== normalizeExamTitle(exam.title) && duplicateTitle) {
        return NextResponse.json({ code: 'ASSESSMENT_TITLE_TAKEN', field: 'title', message: EXAM_TITLE_TAKEN_MESSAGE }, { status: 409 });
      }

      exam.title = parsedData.title;
      if (!duplicateTitle) exam.titleKey = normalizeExamTitle(parsedData.title);
      exam.description = parsedData.description;
      exam.updatedAt = new Date();
      await exam.save();

      // Delete old sections and cascading items
      const oldSections = await Section.find({ examId: overwriteExamId }).select('_id');
      const oldSectionIds = oldSections.map(s => s._id);

      const oldQuestions = await Question.find({ sectionId: { $in: oldSectionIds } }).select('_id');
      const oldQuestionIds = oldQuestions.map(q => q._id);

      await Option.deleteMany({ questionId: { $in: oldQuestionIds } });
      await CandidateAnswer.deleteMany({ questionId: { $in: oldQuestionIds } });
      await Question.deleteMany({ sectionId: { $in: oldSectionIds } });
      await Section.deleteMany({ examId: overwriteExamId });
      
      const sessionsList = await ExamSession.find({ examId: overwriteExamId }).select('_id');
      const sessionIds = sessionsList.map(s => s._id);
      await ExamResult.deleteMany({ sessionId: { $in: sessionIds } });
      await ExamSession.deleteMany({ examId: overwriteExamId });

    } else {
      // Create new exam
      if (await examTitleExists(parsedData.title)) {
        return NextResponse.json({ code: 'ASSESSMENT_TITLE_TAKEN', field: 'title', message: EXAM_TITLE_TAKEN_MESSAGE }, { status: 409 });
      }
      exam = await Exam.create({
        title: parsedData.title,
        titleKey: normalizeExamTitle(parsedData.title),
        description: parsedData.description,
        createdBy: session.userId
      });
    }

    // Insert new sections, questions, options
    for (const secKey of Object.keys(parsedData.sections)) {
      const secVal = parsedData.sections[secKey];
      const section = await Section.create({
        examId: exam._id,
        name: secVal.name,
        description: secVal.description,
        durationMinutes: secVal.durationMinutes,
        durationSeconds: secVal.durationSeconds,
        order: secVal.order
      });

      for (const qKey of Object.keys(secVal.questions)) {
        const qVal = secVal.questions[qKey];
        const question = await Question.create({
          sectionId: section._id,
          text: qVal.text,
          questionType: qVal.questionType,
          estimatedTimeSeconds: qVal.estimatedTimeSeconds || 0,
          order: qVal.order,
          image: qVal.image
        });

        for (const optVal of qVal.options) {
          await Option.create({
            questionId: question._id,
            text: optVal.text,
            score: optVal.score,
            image: optVal.image
          });
        }
      }
    }

    return NextResponse.json({ success: true, examId: exam._id.toString() });
  } catch (error) {
    if (isExamTitleDuplicateError(error)) {
      return NextResponse.json({ code: 'ASSESSMENT_TITLE_TAKEN', field: 'title', message: EXAM_TITLE_TAKEN_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

