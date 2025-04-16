/**
 * Generates an HTML email template for sending welcome emails.
 * @param {string} username - The username of the recipient.
 * @param {string} profileLink - The link to the profile settings.
 * @param {string} communityLink - The link to the community or forum.
 * @param {string} socialMediaLink - The link to social media channels.
 * @param {string} supportEmail - The support email address.
 * @param {string} helpCenterLink - The link to the help center.
 * @returns {string} - The HTML email template.
 */
export function WelcomeEmail(
  subject: string,
  username: string,
  appName: string,
  featureLink: string,
  profileLink: string,
  communityLink: string,
  socialMediaLink: string,
  supportEmail: string
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
        <h1 style="margin: 0; font-size: 24px;">
        ${subject}
        </h1>
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
          Hi <b>${username}</b>,
        </p>
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          Welcome to <b>${appName}</b>! We're thrilled to have you join our community. 🎉
        </p>
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          At <b>${appName}</b>, we're committed to helping you manage your finances smarter, stay fit, and learn new skills. We're here to ensure you have an amazing experience from day one.
        </p>
        
        <!-- Next Steps Section -->
        <h2 style="font-size: 20px; color: #0052cc; margin-bottom: 15px;">Here's what you can do next:</h2>
        
        <ul style="font-size: 16px; color: #333333;">
          <li style="margin-bottom: 10px;">
            <b>Explore Features:</b> Dive into our powerful tools and features designed to make your life easier. Check out <a href="${featureLink}" style="color: #0052cc;">this guide</a> to get started.
          </li>
          <li style="margin-bottom: 10px;">
            <b>Personalize Your Profile:</b> Update your profile with your preferences to get the most tailored experience. Visit your <a href="${profileLink}" style="color: #0052cc;">profile settings</a> to make it uniquely yours.
          </li>
          <li style="margin-bottom: 10px;">
            <b>Join the Community:</b> Connect with other users, share your journey, and learn from others. Our community is active and always ready to help. <a href="${communityLink}" style="color: #0052cc;">Join here</a>.
          </li>
          <li style="margin-bottom: 10px;">
            <b>Stay Updated:</b> Follow us on social media and subscribe to our newsletter for the latest updates, tips, and exclusive offers. <a href="${socialMediaLink}" style="color: #0052cc;">Follow us</a>.
          </li>
        </ul>

        <!-- Help Section -->
        <p style="font-size: 16px; margin: 20px 0 10px 0;">
          <b>Need Help?</b><br>
          If you have any questions, our support team is just a click away. Reach out to us at <a href="mailto:${supportEmail}" style="color: #0052cc;">${supportEmail}</a> for instant answers.
        </p>

        <!-- Footer -->
        <p style="font-size: 16px; color: #777777; text-align: center; margin-top: 30px;">
          Thank you for choosing ${appName}. We can't wait to see what you'll achieve!
        </p>
        <p style="font-size: 16px; text-align: center;">
          Cheers,<br>
          The <b>${appName}</b> Team
        </p>
      </div>
    </div>
  `;
}
