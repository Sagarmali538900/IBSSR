import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam, Section, Question, Option, CandidateAnswer, ExamSession, ExamResult } from '@/lib/models';

export async function POST(request) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const formData = await request.formData();
    const file = formData.get('file');
    const overwriteExamId = formData.get('examId'); // Optional

    if (!file || typeof file === 'string' || !file.name) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let parsedData;

    if (file.name.endsWith('.json')) {
      // 1. JSON parsing
      try {
        const text = buffer.toString('utf-8');
        const json = JSON.parse(text);
        
        if (!json.title) {
          return NextResponse.json({ message: "Invalid JSON format: missing 'title' field." }, { status: 400 });
        }

        const sectionsDict = {};
        const sectionsList = json.sections || [];
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
          title: json.title,
          description: json.description || '',
          sections: sectionsDict
        };
      } catch (err) {
        return NextResponse.json({ message: `Error parsing JSON: ${err.message}` }, { status: 400 });
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // 2. Excel parsing
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        const sectionsMap = {};
        let examTitle = '';
        let examDesc = '';

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip headers

          const val = (colNum) => {
            const cell = row.getCell(colNum);
            return cell ? cell.value : null;
          };

          const rowExamTitle = val(1);
          const rowExamDesc = val(2);
          const secName = val(3);
          const secDesc = val(4);
          const secMin = val(5);
          const secSec = val(6);
          const secOrder = val(7);
          const qText = val(8);
          const qType = val(9);
          const qOrder = val(10);
          const qImage = val(11);
          const optText = val(12);
          const optImage = val(13);
          const optScore = val(14);

          if (!examTitle && rowExamTitle) {
            examTitle = rowExamTitle.toString().trim();
            if (rowExamDesc) {
              examDesc = rowExamDesc.toString().trim();
            }
          }

          if (!secName) return;

          const secNameStr = secName.toString().trim();
          const secOrderNum = secOrder !== null ? Number(secOrder) : Object.keys(sectionsMap).length + 1;
          const secKey = `${secNameStr}_${secOrderNum}`;

          if (!sectionsMap[secKey]) {
            sectionsMap[secKey] = {
              name: secNameStr,
              description: secDesc ? secDesc.toString().trim() : '',
              durationMinutes: secMin !== null ? Number(secMin) : 10,
              durationSeconds: secSec !== null ? Number(secSec) : 0,
              order: secOrderNum,
              questions: {}
            };
          }

          const secData = sectionsMap[secKey];

          if (qText) {
            const qTextStr = qText.toString().trim();
            const qOrderNum = qOrder !== null ? Number(qOrder) : Object.keys(secData.questions).length + 1;
            const qKey = `${qTextStr}_${qOrderNum}`;

            if (!secData.questions[qKey]) {
              secData.questions[qKey] = {
                text: qTextStr,
                questionType: qType ? qType.toString().trim() : 'single_select',
                order: qOrderNum,
                image: qImage ? qImage.toString().trim() : null,
                options: []
              };
            }

            const qData = secData.questions[qKey];

            if (optText !== null && optText !== undefined) {
              qData.options.push({
                text: optText.toString().trim(),
                image: optImage ? optImage.toString().trim() : null,
                score: optScore !== null ? Number(optScore) : 0.0
              });
            }
          }
        });

        if (!examTitle) {
          return NextResponse.json({ message: 'Excel file is missing an Exam Title.' }, { status: 400 });
        }

        parsedData = {
          title: examTitle,
          description: examDesc,
          sections: sectionsMap
        };
      } catch (err) {
        return NextResponse.json({ message: `Error parsing Excel: ${err.message}` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: 'Unsupported file format. Please upload .json or .xlsx.' }, { status: 400 });
    }

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

      exam.title = parsedData.title;
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
      exam = await Exam.create({
        title: parsedData.title,
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
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

