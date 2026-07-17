import ExcelJS from 'exceljs';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Exam, Section, Question, Option } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    const { id: examId } = await params;
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    await dbConnect();
    const exam = await Exam.findById(examId).populate('createdBy', 'username');
    if (!exam) {
      return new Response('Exam not found', { status: 404 });
    }

    // Role check
    if (!session.isSuperuser && exam.createdBy?._id?.toString() !== session.userId) {
      return new Response('Forbidden', { status: 403 });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exam Structure');

    // Setup headers
    const columns = [
      { header: 'Exam Title', key: 'examTitle' },
      { header: 'Exam Description', key: 'examDesc' },
      { header: 'Section Name', key: 'secName' },
      { header: 'Section Description', key: 'secDesc' },
      { header: 'Section Duration (Minutes)', key: 'secMin' },
      { header: 'Section Duration (Seconds)', key: 'secSec' },
      { header: 'Section Order', key: 'secOrder' },
      { header: 'Question Text', key: 'qText' },
      { header: 'Question Type', key: 'qType' },
      { header: 'Question Order', key: 'qOrder' },
      { header: 'Question Image Path', key: 'qImage' },
      { header: 'Option Text', key: 'optText' },
      { header: 'Option Image Path', key: 'optImage' },
      { header: 'Option Score', key: 'optScore' }
    ];
    worksheet.columns = columns;

    // Apply header styles
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' } // Muted blue
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 30;

    const sections = await Section.find({ examId }).sort({ order: 1 });
    if (sections.length === 0) {
      worksheet.addRow([exam.title, exam.description || '']);
    } else {
      for (const section of sections) {
        const questions = await Question.find({ sectionId: section._id }).sort({ order: 1 });
        if (questions.length === 0) {
          worksheet.addRow([
            exam.title,
            exam.description || '',
            section.name,
            section.description || '',
            section.durationMinutes,
            section.durationSeconds,
            section.order
          ]);
        } else {
          for (const question of questions) {
            const options = await Option.find({ questionId: question._id });
            if (options.length === 0) {
              worksheet.addRow([
                exam.title,
                exam.description || '',
                section.name,
                section.description || '',
                section.durationMinutes,
                section.durationSeconds,
                section.order,
                question.text,
                question.questionType,
                question.order,
                question.image || ''
              ]);
            } else {
              for (const option of options) {
                worksheet.addRow([
                  exam.title,
                  exam.description || '',
                  section.name,
                  section.description || '',
                  section.durationMinutes,
                  section.durationSeconds,
                  section.order,
                  question.text,
                  question.questionType,
                  question.order,
                  question.image || '',
                  option.text,
                  option.image || '',
                  option.score
                ]);
              }
            }
          }
        }
      }
    }

    // Auto-adjust column widths
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const valLen = cell.value ? cell.value.toString().length : 0;
        if (valLen > maxLen) {
          maxLen = valLen;
        }
      });
      column.width = Math.max(maxLen + 2, 12);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${exam.title.trim().replace(/\s+/g, '_')}_exam.xlsx`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
