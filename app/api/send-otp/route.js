// app/api/send-otp/route.js
export async function POST(request) {
  try {
    const { email, otp, name, expiresIn } = await request.json();

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
        to: [{ email: email, name: name || 'Voter' }],
        subject: 'Your OTP Code for E-Voting Portal',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>OTP Verification</title>
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
                background: linear-gradient(135deg, #1a4d2a 0%, #0f2b1a 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              .otp-code {
                font-size: 36px;
                font-weight: bold;
                color: #1a4d2a;
                text-align: center;
                padding: 20px;
                background: #f0f7f0;
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
                <h1>Regent University</h1>
                <p>E-Voting Portal</p>
              </div>
              <div class="content">
                <h2>Hello ${name || 'Voter'},</h2>
                <p>You have requested to access the voting portal. Please use the following One-Time Password (OTP) to verify your identity:</p>
                
                <div class="otp-code">
                  ${otp}
                </div>
                
                <div class="warning">
                  <strong>⚠️ Important:</strong> This OTP is valid for <strong>${expiresIn || 10} minutes</strong> and can only be used once.
                </div>
                
                <p>If you didn't request this, please ignore this email or contact the IT administrator immediately.</p>
                
                <p>Best regards,<br>
                <strong>Regent University Electoral Commission</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} Regent University. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', data);
    
    return Response.json({ 
      success: true, 
      message: 'OTP sent successfully',
      messageId: data.messageId 
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}