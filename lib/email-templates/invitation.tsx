import * as React from 'react'

interface InvitationEmailProps {
  inviterName: string
  inviteeName: string
  role: string
  organizationName?: string
  inviteUrl: string
  expiresInDays: number
}

export const InvitationEmail: React.FC<InvitationEmailProps> = ({
  inviterName,
  inviteeName,
  role,
  organizationName = 'SuperSales',
  inviteUrl,
  expiresInDays
}) => {
  const roleDisplayNames: Record<string, string> = {
    sales_rep: 'Sales Representative',
    sales_manager: 'Sales Manager',
    head_of_sales: 'Head of Sales',
    admin: 'Administrator',
    manager: 'Manager',
    viewer: 'Viewer'
  }

  const roleDisplay = roleDisplayNames[role] || role

  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
          }
          .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .role-badge {
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin: 10px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
          }
          .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e9ecef;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .expiry-warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 12px 16px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1>🎉 You're Invited!</h1>
          </div>

          <div className="content">
            <p className="greeting">Hi {inviteeName},</p>

            <p className="message">
              <strong>{inviterName}</strong> has invited you to join <strong>{organizationName}</strong>
              on SuperSales, our advanced sales analytics and AI coaching platform.
            </p>

            <div className="info-box">
              <p><strong>Your Role:</strong> <span className="role-badge">{roleDisplay}</span></p>
              <p><strong>Organization:</strong> {organizationName}</p>
            </div>

            <p className="message">
              With SuperSales, you'll be able to:
            </p>
            <ul style={{ fontSize: '15px', color: '#555', lineHeight: '1.8' }}>
              <li>📞 Track and analyze all your sales calls</li>
              <li>🤖 Get AI-powered coaching and feedback</li>
              <li>📊 Monitor your performance metrics in real-time</li>
              <li>🎯 Improve your closing rates and objection handling</li>
              <li>🏆 Compete with your team on the leaderboard</li>
            </ul>

            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a href={inviteUrl} className="cta-button">
                Accept Invitation & Join Team
              </a>
            </div>

            <div className="expiry-warning">
              ⏰ <strong>Important:</strong> This invitation expires in {expiresInDays} days.
              Please accept it before it expires.
            </div>

            <p style={{ fontSize: '14px', color: '#666', marginTop: '30px' }}>
              If you have any questions, feel free to reply to this email or contact your team administrator.
            </p>
          </div>

          <div className="footer">
            <p>
              <strong>SuperSales</strong> - AI-Powered Sales Analytics & Coaching
            </p>
            <p style={{ marginTop: '10px' }}>
              Need help? <a href="mailto:support@supersales.com">Contact Support</a>
            </p>
            <p style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
              This invitation was sent to {inviteeName}. If you received this email by mistake,
              you can safely ignore it.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

export default InvitationEmail
