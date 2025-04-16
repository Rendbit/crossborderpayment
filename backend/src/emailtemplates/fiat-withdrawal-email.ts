/**
 * Generates an HTML email template for notifying a user about a fiat withdrawal.
 * @param {string} subject - The subject of the email.
 * @param {string} appName - The name of the application.
 * @param {string} username - The username of the customer.
 * @param {string} email - The customer's email address.
 * @param {string} amount - The amount withdrawn.
 * @param {string} currency - The currency of the withdrawn amount.
 * @param {string} userAddress - The customer's Stellar public address.
 * @param {string} receiverAddress - The receiver's Stellar public address.
 * @param {Date} txDate - The date of the transaction.
 * @param {string} txHash - The transaction hash.
 * @returns {string} - The HTML email template.
 */

export function FiatWithdrawalEmail(
  subject: string,
  appName: string,
  username: string,
  email: string,
  amount: string,
  currency: string,
  userAddress: string,
  receiverAddress: string,
  txHash: string,
  accountNumber: string,
  accountName: string,
  bankName: string,
  txDate: Date
): string {
  return `
      <!-- Email Wrapper -->
      <table 
        width="100%" 
        border="0" 
        cellspacing="0" 
        cellpadding="0" 
        style="background-color: #e3f2fd; padding: 30px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333333;"
      >
        <tr>
          <td align="center">
            <!-- Email Container -->
            <table 
              width="100%" 
              max-width="600px" 
              border="0" 
              cellspacing="0" 
              cellpadding="0" 
              style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);"
            >
              <!-- Header -->
              <tr>
                <td align="center" style="background-color: #0052cc; padding: 30px; border-top-left-radius: 12px; border-top-right-radius: 12px; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 700;">${subject}</h1>
                </td>
              </tr>
    
              <!-- Body -->
              <tr>
                <td style="padding: 30px;">
                  <p style="font-size: 18px; margin: 0 0 20px 0; line-height: 1.6;">
                    Dear <strong>${appName}</strong>,
                  </p>
                  <p style="font-size: 18px; margin: 0 0 20px 0; line-height: 1.6;">
                    We're reaching out to inform you that ${username} recently made a fiat withdrawal request to ${receiverAddress}, and it has been processed. Below are the details of the transaction:
                  </p>
    
                  <!-- Transaction Details -->
                  <table 
                    width="100%" 
                    border="0" 
                    cellspacing="0" 
                    cellpadding="15" 
                    style="font-size: 16px; color: #333333; border-collapse: collapse;"
                  >
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Amount:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${currency} ${amount}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Username:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${username}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Email:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${email}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Sender's Address:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${userAddress}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Receiver's Address:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${receiverAddress}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Hash:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${txHash}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Account Name:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${accountName}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Account Number:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${accountNumber}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Bank Name:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${bankName}</td>
                    </tr>
                    <tr>
                      <td style="background-color: #e3f2fd; border: 1px solid #bbdefb; font-weight: 600;">Date:</td>
                      <td style="background-color: #ffffff; border: 1px solid #bbdefb;">${txDate}</td>
                    </tr>
                  </table>
    
                  <!-- Footer -->
                  <p style="font-size: 16px; color: #666666; text-align: center; margin-top: 30px;">
                    Thank you for using <strong>${appName}</strong>. If you need any assistance, feel free to contact our support team.
                  </p>
                  <p style="font-size: 16px; text-align: center;">
                    Best regards,<br>
                    The <strong>${appName}</strong> Team
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    
      <!-- Mobile Responsive Styles -->
      <style>
        @media only screen and (max-width: 600px) {
          table[style*="max-width: 600px"] {
            width: 100% !important;
          }
  
          h1 {
            font-size: 22px !important;
          }
  
          td {
            padding: 20px !important;
          }
  
          p, table {
            font-size: 15px !important;
          }
        }
      </style>
  `;
}
