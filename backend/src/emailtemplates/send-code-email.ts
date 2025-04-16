/**
 * Generates an HTML email template for sending code-based emails (e.g., verification codes).
 * @param {string} subject - The subject of the email.
 * @param {string} content - The main content of the email.
 * @param {string} code - The code or token to be included in the email.
 * @param {string} username - The username of the recipient.
 * @returns {string} - The HTML email template.
 */
export function SendCodeEmail(
  subject: string,
  content: string,
  code: string,
  username: string,
) {
  return `
    <!-- Email Container -->
    <div
      style="
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
        color: #000000;
        background-color: #f7f9fc;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      "
    >
      <!-- Email Header -->
      <div
        style="
          text-align: center;
          background-color: #0052cc;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          color: #ffffff;
        "
      >
        <h1 style="margin: 0; font-size: 24px;">${subject}</h1>
      </div>

      <!-- Main Content -->
      <div
        style="
          padding: 20px;
          background-color: #ffffff;
          border-radius: 0 0 8px 8px;
        "
      >
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          Hello <b>${username}</b>,
        </p>
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          ${content}
        </p>

        <!-- Code Section -->
        <div
          style="
            text-align: center;
            margin: 30px 0;
            background-color: #f0f0f0;
            padding: 20px;
            border-radius: 8px;
          "
        >
          <span
            style="
              display: inline-block;
              padding: 15px 30px;
              color: #0052cc;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 2px;
              border-radius: 4px;
            "
          >
            ${code}
          </span>
        </div>

        <!-- Footer -->
        <p style="font-size: 14px; color: #777777; text-align: center;">
          If you did not request this code, please ignore this email.
        </p>
      </div>
    </div>
  `;
}
