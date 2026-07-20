/**
 * Generates the HTML and text content for the Psychological Assessment Assignment email.
 */
export function getAssignmentEmail(examTitle, assignedDate, accessCode) {
  const year = new Date().getFullYear();
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f4f6fa;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fa;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #eef2f6;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      color: #1e293b;
    }
    .details-box {
      background-color: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 20px;
      margin: 25px 0;
    }
    .details-label {
      font-weight: 600;
      color: #64748b;
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .details-value {
      color: #0f172a;
      font-weight: 700;
      font-size: 16px;
    }
    .code-badge {
      background-color: #e0e7ff;
      color: #4338ca;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 18px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px dashed #818cf8;
      display: inline-block;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0 15px 0;
    }
    .btn {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 4px 10px rgba(99, 102, 241, 0.25);
      font-size: 15px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>IBSSR Assessment Portal</h1>
      </div>
      <div class="content">
        <h2>Psychological Assessment Assigned</h2>
        <p>Hello,</p>
        <p>You have been assigned to take a psychological assessment. Please review your assessment details and credentials below:</p>
        
        <div class="details-box">
          <div style="margin-bottom: 16px;">
            <span class="details-label">Assessment Name</span>
            <span class="details-value">${examTitle}</span>
          </div>
          <div style="margin-bottom: 16px;">
            <span class="details-label">Date & Time Assigned</span>
            <span class="details-value">${assignedDate} (IST)</span>
          </div>
          <div>
            <span class="details-label">Your Access Code</span>
            <span class="code-badge">${accessCode}</span>
          </div>
        </div>
        
        <p style="font-size: 14px; color: #64748b;">Note: Please ensure you are in a quiet, distraction-free environment with a stable internet connection before beginning the assessment.</p>
        
        <div class="btn-container">
          <a href="https://ibssr.vercel.app" class="btn" target="_blank">Start Assessment</a>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from the IBSSR Examination System.</p>
        <p>&copy; ${year} IBSSR. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hello,\n\nYou have been assigned to take the psychological assessment '${examTitle}' on the IBSSR Portal.\n\nAssessment Details:\n- Exam: ${examTitle}\n- Date & Time Assigned: ${assignedDate} (IST)\n- Access Code: ${accessCode}\n\nInstructions:\n1. Go to the portal: https://ibssr.vercel.app\n2. Enter your Access Code: ${accessCode}\n3. Complete the registration form and start the test.\n\nBest regards,\nIBSSR Examination Team`;

  return { html, text };
}

/**
 * Generates the HTML and text content for the Franchise welcome email.
 */
export function getFranchiseWelcomeEmail(username, password) {
  const year = new Date().getFullYear();
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f4f6fa;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fa;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #eef2f6;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      color: #1e293b;
    }
    .details-box {
      background-color: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 20px;
      margin: 25px 0;
    }
    .details-row {
      margin-bottom: 14px;
    }
    .details-row:last-child {
      margin-bottom: 0;
    }
    .details-label {
      font-weight: 600;
      color: #64748b;
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      text-transform: uppercase;
    }
    .details-value {
      color: #0f172a;
      font-weight: 700;
      font-size: 15px;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0 15px 0;
    }
    .btn {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 4px 10px rgba(99, 102, 241, 0.25);
      font-size: 15px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>IBSSR Assessment Portal</h1>
      </div>
      <div class="content">
        <h2>Franchise Account Created</h2>
        <p>Hello,</p>
        <p>An administrative franchise account has been successfully created for you on the IBSSR Portal. You can now manage exams, candidate assignments, and view assessment results.</p>
        
        <div class="details-box">
          <div class="details-row">
            <span class="details-label">Login URL</span>
            <span class="details-value"><a href="https://ibssr.vercel.app/login" style="color: #6366f1; text-decoration: none;">https://ibssr.vercel.app/login</a></span>
          </div>
          <div class="details-row">
            <span class="details-label">Username</span>
            <span class="details-value">${username}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Temporary Password</span>
            <span class="details-value" style="font-family: monospace; font-size: 16px; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</span>
          </div>
        </div>
        
        <div class="btn-container">
          <a href="https://ibssr.vercel.app/login" class="btn" target="_blank">Log In to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from the IBSSR Examination System.</p>
        <p>&copy; ${year} IBSSR. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hello,\n\nYour administrative/franchise account has been successfully created on the IBSSR Portal.\n\nLogin Credentials:\n- Username: ${username}\n- Password: ${password}\n- Login URL: https://ibssr.vercel.app/login\n\nBest regards,\nIBSSR Examination Team`;

  return { html, text };
}

/**
 * Generates the HTML and text content for the Candidate Assessment Results email.
 */
export function getResultsEmail(candidateName, examTitle, overallScore, sectionResults) {
  const year = new Date().getFullYear();
  
  const sectionRows = sectionResults.map(sr => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">${sr.sectionId?.name || 'Unknown'}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 700; text-align: right;">${sr.scorePercentage}%</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f4f6fa;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fa;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #eef2f6;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      color: #1e293b;
      text-align: center;
    }
    .score-circle {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: radial-gradient(circle, #e0e7ff 0%, #c7d2fe 100%);
      margin: 25px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 4px solid #6366f1;
      box-shadow: 0 6px 12px rgba(99, 102, 241, 0.15);
    }
    .score-pct {
      font-size: 32px;
      font-weight: 800;
      color: #4338ca;
      line-height: 1;
    }
    .score-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0 10px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .table th {
      background-color: #f8fafc;
      color: #64748b;
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>IBSSR Assessment Portal</h1>
      </div>
      <div class="content">
        <h2>Assessment Completed Successfully</h2>
        <p>Hello <strong>${candidateName}</strong>,</p>
        <p>Thank you for taking the <strong>${examTitle}</strong> assessment. Your scorecard has been processed successfully.</p>
        
        <div class="score-circle">
          <span class="score-pct">${overallScore}%</span>
          <span class="score-label">Overall Score</span>
        </div>

        <h3 style="margin-top: 30px; margin-bottom: 10px; color: #1e293b;">Section-wise Breakdown</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Section Name</th>
              <th style="text-align: right;">Score %</th>
            </tr>
          </thead>
          <tbody>
            ${sectionRows}
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p>This is an automated message from the IBSSR Examination System.</p>
        <p>&copy; ${year} IBSSR. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  let text = `Hello ${candidateName},\n\nThank you for completing the '${examTitle}' on our portal.\n\n--- ASSESSMENT RESULTS ---\nOverall Score: ${overallScore}%\n\nSection-wise breakdown:\n`;
  for (const secRes of sectionResults) {
    text += `- ${secRes.sectionId?.name || 'Unknown'}: ${secRes.scorePercentage}%\n`;
  }
  text += `\nThank you,\nIBSSR Examination Team\n`;

  return { html, text };
}
