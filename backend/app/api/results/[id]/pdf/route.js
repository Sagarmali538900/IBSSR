import { NextResponse } from 'next/server';
import { generatePdfReport } from '@/pdfGenerator';
import { ExamResult } from '@/models';
import dbConnect from '@/db';
import { ids } from '@/lib/schemas';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!ids.objectId.safeParse(id).success) return new Response('Invalid result ID.', { status: 400 });
  
  await dbConnect();
  
  let sessionId = id;
  // If the passed ID is the result ID, resolve the actual session ID
  try {
    const result = await ExamResult.findById(id);
    if (result) {
      sessionId = result.sessionId.toString();
    }
  } catch (err) {
    // Treat as session ID directly
  }

  try {
    const pdfBuffer = await generatePdfReport(sessionId);
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="IBSSR_Assessment_Report_${sessionId}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF download:', error);
    return NextResponse.json(
      { message: 'Error generating PDF report', error: error.message },
      { status: 500 }
    );
  }
}
