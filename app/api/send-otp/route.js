// app/api/send-Voter-otp/route.js

export async function POST(request) {
  try {
    const { email, otp, name, role, expiresIn } = await request.json();

    // Validate inputs
    if (!email || !otp) {
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
          name: 'Regent University',
          email: process.env.BREVO_FROM_EMAIL || 'noreply@regent.edu.gh'
        },
        to: [{ email: email, name: name || 'Administrator' }],
        subject: 'Voter Verification OTP - E-Voting Portal',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Voter OTP Verification</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background: #f9fafb;
              }
              .header {
                background: #064e3b;
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
              }
              .header p {
                margin: 8px 0 0;
                opacity: 0.9;
                font-size: 14px;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
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
              .role-badge {
                display: inline-block;
                background: #064e3b;
                color: white;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin: 10px 0;
              }
              .otp-code {
                font-size: 44px;
                font-weight: bold;
                color: #064e3b;
                text-align: center;
                padding: 20px;
                background: #ecfdf5;
                border-radius: 8px;
                letter-spacing: 8px;
                margin: 20px 0;
                font-family: monospace;
                border: 1px solid #d1fae5;
              }
              .warning-box {
                background: #fffbeb;
                border-left: 4px solid #d97706;
                padding: 12px 16px;
                margin: 20px 0;
                font-size: 14px;
                border-radius: 6px;
              }
              .warning-box strong {
                color: #92400e;
              }
              .security-box {
                background: #f0fdf4;
                border-left: 4px solid #059669;
                padding: 12px 16px;
                margin: 20px 0;
                font-size: 14px;
                border-radius: 6px;
              }
              .security-box strong {
                color: #065f46;
              }
              ul {
                margin: 8px 0 0 20px;
                padding: 0;
              }
              li {
                margin: 4px 0;
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
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Voter Verification Required</h1>
                <p>Regent University E-Voting Portal</p>
              </div>
              <div class="content">
                <div class="greeting">
                  Dear <strong>${name || 'Administrator'}</strong>,
                </div>
                
                <div class="role-badge">
                  Role: ${role || 'Administrator'}
                </div>
                
                <p>You are attempting to access the Voter Dashboard of the Regent University E-Voting System.</p>
                
                <p>Please use the following One-Time Password (OTP) to complete your login:</p>
                
                <div class="otp-code">
                  ${otp}
                </div>
                
                <div class="warning-box">
                  <strong>Important Security Notice:</strong>
                  <ul>
                    <li>This OTP is valid for <strong>${expiresIn || 5} minutes</strong></li>
                    <li>This OTP can only be used once</li>
                    <li>Never share this OTP with anyone</li>
                  </ul>
                </div>
                
                <div class="security-box">
                  <strong>Security Recommendation:</strong>
                  <ul>
                    <li>Contact IT Security if you did not request this</li>
                    <li>Change your password immediately if suspicious</li>
                    <li>Review your recent account activity</li>
                  </ul>
                </div>
                
                <p>This is an automated security measure to protect the integrity of the voting system.</p>
                
                <div class="signature">
                  Best regards,<br>
                  <strong>Regent University Electoral Commission</strong><br>
                  <span style="font-size: 12px;">IT Security Team</span>
                </div>
              </div>
              <div class="footer">
                This is an automated security notification. Please do not reply to this email.<br>
                For assistance, contact the IT Help Desk.<br>
                &copy; ${new Date().getFullYear()} Regent University College of Science and Technology. All rights reserved.
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
VOTER VERIFICATION OTP - REGENT UNIVERSITY E-VOTING PORTAL

Dear ${name || 'Administrator'},

Role: ${role || 'Administrator'}

You are attempting to access the Voter Dashboard.

Your OTP verification code is: ${otp}

SECURITY NOTICE:
- This OTP is valid for ${expiresIn || 5} minutes
- This OTP can only be used once
- Never share this OTP with anyone

If you did not request this login, please contact IT Security immediately, change your password, and review recent account activity.

This is an automated security measure.

Best regards,
Regent University Electoral Commission
IT Security Team

This is an automated notification. Please do not reply.
        `
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Voter OTP sent successfully to:', email);
    
    return Response.json({ 
      success: true, 
      message: 'Voter OTP sent successfully',
      messageId: data.messageId 
    });
    
  } catch (error) {
    console.error('Error sending Voter OTP:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}