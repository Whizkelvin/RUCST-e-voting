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
        subject: '🔐 Voter Verification OTP - E-Voting Portal',
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
                color: #333;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background: #f9f9f9;
              }
              .header {
                background: linear-gradient(135deg, #6b46c0 0%, #4c1d95 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .header p {
                margin: 5px 0 0;
                opacity: 0.9;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              .role-badge {
                display: inline-block;
                background: #6b46c0;
                color: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                margin: 10px 0;
              }
              .otp-code {
                font-size: 42px;
                font-weight: bold;
                color: #6b46c0;
                text-align: center;
                padding: 20px;
                background: #f3e8ff;
                border-radius: 8px;
                letter-spacing: 8px;
                margin: 20px 0;
                font-family: monospace;
              }
              .warning {
                background: #fff3e0;
                border-left: 4px solid #ff9800;
                padding: 12px;
                margin: 20px 0;
                font-size: 14px;
              }
              .security-tip {
                background: #e8f5e9;
                border-left: 4px solid #4caf50;
                padding: 12px;
                margin: 20px 0;
                font-size: 14px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
                padding-top: 20px;
                border-top: 1px solid #eee;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Voter Verification Required</h1>
                <p>Regent University E-Voting Portal</p>
              </div>
              <div class="content">
                <h2>Dear ${name || 'Voteristrator'},</h2>
                
                <div class="role-badge">
                  Role: ${role || 'Voteristrator'}
                </div>
                
                <p>You are attempting to access the <strong>Voter Dashboard</strong> of the Regent University E-Voting System.</p>
                
                <p>Please use the following One-Time Password (OTP) to complete your login:</p>
                
                <div class="otp-code">
                  ${otp}
                </div>
                
                <div class="warning">
                  <strong>⚠️ Important Security Notice:</strong> 
                  <ul style="margin: 5px 0 0 20px;">
                    <li>This OTP is valid for <strong>${expiresIn || 5} minutes</strong></li>
                    <li>This OTP can only be used once</li>
                    <li>Never share this OTP with anyone</li>
                  </ul>
                </div>
                
                <div class="security-tip">
                  <strong>🔒 Security Tip:</strong> If you didn't request this login, please:
                  <ul style="margin: 5px 0 0 20px;">
                    <li>Contact IT Security immediately</li>
                    <li>Change your password</li>
                    <li>Review recent account activity</li>
                  </ul>
                </div>
                
                <p>This is an automated security measure to protect the integrity of the voting system.</p>
                
                <p>Best regards,<br>
                <strong>Regent University Electoral Commission</strong><br>
                <span style="font-size: 12px;">IT Security Team</span></p>
              </div>
              <div class="footer">
                <p>This is an automated security notification. Please do not reply to this email.</p>
                <p>If you need assistance, contact the IT Help Desk.</p>
                <p>&copy; ${new Date().getFullYear()} Regent University. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Voter Verification OTP - Regent University E-Voting Portal

          Dear ${name || 'Voteristrator'},

          Role: ${role || 'Voteristrator'}

          You are attempting to access the Voter Dashboard.

          Your OTP verification code is: ${otp}

          Security Notice:
          - This OTP is valid for ${expiresIn || 5} minutes
          - This OTP can only be used once
          - Never share this OTP with anyone

          If you didn't request this login, please contact IT Security immediately.

          Best regards,
          Regent University Electoral Commission
          IT Security Team
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