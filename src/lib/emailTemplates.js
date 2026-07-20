/**
 * Generates the HTML and text content for the Psychological Assessment Assignment email.
 */
export function getAssignmentEmail(examTitle, assignedDate, accessCode) {
  const year = new Date().getFullYear();
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background-color: #f4f6fa;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fa;
      padding: 40px 20px;
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
      font-size: 22px;
      font-weight: 700;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 18px;
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
      font-size: 12px;
      text-transform: uppercase;
    }
    .details-value {
      color: #0f172a;
      font-weight: 700;
      font-size: 15px;
    }
    .code-badge {
      background-color: #e0e7ff;
      color: #4338ca;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 18px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px dashed #818cf8;
      display: inline-block;
      margin-top: 4px;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0 15px 0;
    }
    .btn {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: 700;
      display: inline-block;
    }
    .footer {
      background-color: #f8fafc;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
    /* Hide preheader text for clean email inbox preview */
    .preheader {
      display: none;
      max-height: 0px;
      overflow: hidden;
      mso-hide: all;
    }
  </style>
</head>
<body>
  <!-- Hidden preheader text to improve inbox delivery -->
  <div class="preheader">Your assessment access code is: ${accessCode}. Click to start the test.</div>
  
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>IBSSR Assessment Portal</h1>
      </div>
      <div class="content">
        <h2>You have been invited to take an assessment</h2>
        <p>Dear Candidate,</p>
        <p>An administrator or franchise has assigned a psychological assessment to you on the IBSSR Portal. Please check the details below:</p>
        
        <div class="details-box">
          <div style="margin-bottom: 16px;">
            <span class="details-label">Assessment Title</span>
            <span class="details-value">${examTitle}</span>
          </div>
          <div style="margin-bottom: 16px;">
            <span class="details-label">Assigned On</span>
            <span class="details-value">${assignedDate} (IST)</span>
          </div>
          <div>
            <span class="details-label">Your Unique Access Code</span>
            <span class="code-badge">${accessCode}</span>
          </div>
        </div>
        
        <p style="font-size: 13px; color: #64748b;">Important: We recommend choosing a quiet area and ensuring your internet connection is stable before initiating the assessment.</p>
        
        <div class="btn-container">
          <a href="https://ibssr.vercel.app" class="btn" target="_blank">Start Assessment</a>
        </div>
      </div>
      <div class="footer">
        <p>You received this email because an assessment was registered for your address on the IBSSR platform.</p>
        <p><strong>Institute of Behavior and Social Science Research (IBSSR)</strong></p>
        <p>Pune, Maharashtra, India | support@ibssr.org</p>
        <p>&copy; ${year} IBSSR. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Dear Candidate,\n\nYou have been assigned to take the psychological assessment '${examTitle}' on the IBSSR Portal.\n\nAssessment Details:\n- Exam Name: ${examTitle}\n- Date Assigned: ${assignedDate} (IST)\n- Unique Access Code: ${accessCode}\n\nTo start, go to: https://ibssr.vercel.app and enter your code.\n\nRegards,\nIBSSR Team`;

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Welcome</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background-color: #f4f6fa;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fa;
      padding: 40px 20px;
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
      font-size: 22px;
      font-weight: 700;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 18px;
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
      font-size: 12px;
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
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: 700;
      display: inline-block;
    }
    .footer {
      background-color: #f8fafc;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
    .preheader {
      display: none;
      max-height: 0px;
      overflow: hidden;
      mso-hide: all;
    }
  </style>
</head>
<body>
  <div class="preheader">Your franchise portal account has been set up successfully.</div>
  
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>IBSSR Assessment Portal</h1>
      </div>
      <div class="content">
        <h2>Your account credentials are ready</h2>
        <p>Dear Partner,</p>
        <p>Your administrative franchise portal account has been set up successfully. You can now use the credentials below to log in and manage your exams:</p>
        
        <div class="details-box">
          <div class="details-row">
            <span class="details-label">Login Dashboard</span>
            <span class="details-value"><a href="https://ibssr.vercel.app/login" style="color: #6366f1; text-decoration: none;">https://ibssr.vercel.app/login</a></span>
          </div>
          <div class="details-row">
            <span class="details-label">Username</span>
            <span class="details-value">${username}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Password Credentials</span>
            <span class="details-value" style="font-family: monospace; font-size: 15px; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</span>
          </div>
        </div>
        
        <div class="btn-container">
          <a href="https://ibssr.vercel.app/login" class="btn" target="_blank">Access Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>This is a transactional message regarding your portal credentials.</p>
        <p><strong>Institute of Behavior and Social Science Research (IBSSR)</strong></p>
        <p>Pune, Maharashtra, India | support@ibssr.org</p>
        <p>&copy; ${year} IBSSR. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hello,\n\nYour franchise account credentials for the IBSSR Portal:\n- Username: ${username}\n- Password: ${password}\n- Login URL: https://ibssr.vercel.app/login\n\nRegards,\nIBSSR Team`;

  return { html, text };
}

/**
 * Generates the HTML and text content for the Candidate Assessment Results email.
 */
export function getResultsEmail(candidateName, examTitle, overallScore, sectionResults) {
  const year = new Date().getFullYear();
  
  const sectionRows = sectionResults.map(sr => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px;">${sr.sectionId?.name || 'Unknown'}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 700; text-align: right; font-size: 14px;">${sr.scorePercentage}%</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background-color: #f4f6fa;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fa;
      padding: 40px 20px;
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
      font-size: 22px;
      font-weight: 700;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 18px;
      font-weight: 700;
      margin-top: 0;
      color: #1e293b;
      text-align: center;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle, #e0e7ff 0%, #c7d2fe 100%);
      margin: 25px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 3px solid #6366f1;
      box-shadow: 0 4px 10px rgba(99, 102, 241, 0.1);
    }
    .score-pct {
      font-size: 30px;
      font-weight: 800;
      color: #4338ca;
      line-height: 1;
    }
    .score-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0 10px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .table th {
      background-color: #f8fafc;
      color: #64748b;
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
    .preheader {
      display: none;
      max-height: 0px;
      overflow: hidden;
      mso-hide: all;
    }
  </style>
</head>
<body>
  <div class="preheader">Your test result scorecard for ${examTitle} is ready. Overall Score: ${overallScore}%.</div>
  
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>IBSSR Assessment Portal</h1>
      </div>
      <div class="content">
        <h2>Your Assessment Report is Ready</h2>
        <p>Dear ${candidateName},</p>
        <p>Thank you for taking the <strong>${examTitle}</strong> assessment. Your detailed scorecard report has been calculated below:</p>
        
        <div class="score-circle">
          <span class="score-pct">${overallScore}%</span>
          <span class="score-label">Overall Score</span>
        </div>

        <h3 style="margin-top: 25px; margin-bottom: 10px; color: #1e293b; font-size: 15px;">Section Breakdown</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Section Name</th>
              <th style="text-align: right;">Score Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${sectionRows}
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p>This is an automated system notification with your examination results.</p>
        <p><strong>Institute of Behavior and Social Science Research (IBSSR)</strong></p>
        <p>Pune, Maharashtra, India | support@ibssr.org</p>
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
