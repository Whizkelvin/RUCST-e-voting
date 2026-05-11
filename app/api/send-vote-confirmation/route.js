// app/api/send-vote-confirmation/route.js

export async function POST(request) {
  try {
    const { email, name, electionTitle, votesSummary, transactionId } = await request.json();

    // Validate inputs
    if (!email || !votesSummary) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Brevo API Key
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      console.error('BREVO_API_KEY not configured');
      return Response.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Format votes list for email
    const votesListHtml = votesSummary.map(vote => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 500; color: #374151;">${vote.position}</td>
        <td style="padding: 12px; color: #065f46;">${vote.candidate}</td>
      <tr>
    `).join('');

    // Send email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: 'Regent University Electoral Commission',
          email: process.env.BREVO_FROM_EMAIL || 'noreply@regent.edu.gh'
        },
        to: [{ email: email, name: name || 'Voter' }],
        subject: 'Vote Confirmation - Regent University E-Voting System',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Vote Confirmation</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 550px;
                margin: 0 auto;
                padding: 20px;
                background: #f9fafb;
              }
              .header {
                background: #064e3b;
                color: white;
                padding: 25px 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 22px;
                font-weight: 600;
              }
              .header p {
                margin: 8px 0 0;
                opacity: 0.9;
                font-size: 14px;
              }
              .content {
                background: white;
                padding: 25px 30px;
                border-radius: 0 0 8px 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              }
              .greeting {
                font-size: 16px;
                color: #1f2937;
                margin-bottom: 8px;
              }
              .greeting strong {
                color: #064e3b;
              }
              .confirmation-message {
                background: #ecfdf5;
                border: 1px solid #d1fae5;
                border-radius: 8px;
                padding: 16px;
                margin: 20px 0;
                text-align: center;
              }
              .confirmation-message p {
                margin: 0;
                color: #064e3b;
                font-weight: 500;
              }
              .confirmation-message small {
                font-size: 12px;
                color: #6b7280;
                font-weight: normal;
              }
              .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #064e3b;
                margin: 20px 0 12px 0;
                padding-bottom: 6px;
                border-bottom: 2px solid #d1fae5;
              }
              .votes-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .votes-table th {
                background: #f3f4f6;
                padding: 10px 12px;
                text-align: left;
                font-weight: 600;
                color: #374151;
                font-size: 13px;
              }
              .votes-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 14px;
              }
              .info-box {
                background: #f9fafb;
                border-left: 3px solid #064e3b;
                padding: 12px 16px;
                margin: 20px 0;
                border-radius: 6px;
              }
              .info-box p {
                margin: 6px 0;
                font-size: 13px;
                color: #4b5563;
              }
              .info-box strong {
                color: #1f2937;
              }
              .thankyou {
                margin: 20px 0 10px 0;
                font-size: 15px;
                color: #1f2937;
              }
              .signature {
                margin-top: 25px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 13px;
                color: #4b5563;
              }
              .signature strong {
                color: #064e3b;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 11px;
                color: #9ca3af;
                padding-top: 15px;
              }
              .transaction-id {
                font-family: monospace;
                font-size: 11px;
                background: #f3f4f6;
                padding: 6px 10px;
                border-radius: 5px;
                display: inline-block;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Vote Confirmation</h1>
                <p>Regent University E-Voting System</p>
              </div>
              <div class="content">
                
                <div class="greeting">
                  Dear <strong>${name || 'Voter'}</strong>,
                </div>
                
                <p>This email is to confirm that your vote has been successfully recorded in the <strong>${electionTitle || 'Student Elections'}</strong>.</p>
                
                <div class="confirmation-message">
                  <p>Your vote has been counted successfully</p>
                  <small>Date and Time: ${new Date().toLocaleString()}</small>
                </div>
                
                <div class="section-title">What You Voted For</div>
                
                <table class="votes-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Candidate You Selected</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${votesListHtml}
                  </tbody>
                </table>
                
                <div class="info-box">
                  <p><strong>Important Information You Should Know</strong></p>
                  <p>1. Your vote has been stored securely and cannot be changed once submitted.</p>
                  <p>2. Your vote is completely anonymous - no one can trace this vote back to you.</p>
                  <p>3. This email serves as your proof that you participated in the election.</p>
                </div>
                
                <p class="thankyou">Thank you for taking part in this election and exercising your right to vote. Your participation helps shape the future of our university.</p>
                
                <div class="signature">
                  <strong>Regent University Electoral Commission</strong><br>
                  If you have any questions or concerns about this election, please contact the Electoral Commission or the IT Help Desk.
                </div>
                
                <div class="transaction-id">
                  Reference ID: ${transactionId || 'N/A'}
                </div>
                
              </div>
              <div class="footer">
                This is an automated confirmation message. Please do not reply to this email.<br>
                &copy; ${new Date().getFullYear()} Regent University College of Science and Technology. All rights reserved.
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
VOTE CONFIRMATION - Regent University E-Voting System

Dear ${name || 'Voter'},

This email confirms that your vote has been successfully recorded in the ${electionTitle || 'Student Elections'}.

Date and Time: ${new Date().toLocaleString()}



IMPORTANT INFORMATION:
- Your vote has been stored securely and cannot be changed once submitted.
- Your vote is completely anonymous - no one can trace this vote back to you.
- This email serves as your proof that you participated in the election.

Thank you for taking part in this election and exercising your right to vote.

Regent University Electoral Commission


This is an automated confirmation. Please do not reply to this email.
        `
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', data);
      throw new Error(data.message || 'Failed to send confirmation email');
    }

    console.log('Vote confirmation email sent to:', email);
    
    return Response.json({ 
      success: true, 
      message: 'Vote confirmation sent successfully',
      messageId: data.messageId 
    });
    
  } catch (error) {
    console.error('Error sending vote confirmation:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}