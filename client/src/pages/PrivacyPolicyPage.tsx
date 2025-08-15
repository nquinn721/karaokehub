import { Box, Container, Paper, Typography } from '@mui/material';
import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Privacy Policy
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Last updated: August 15, 2025
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            1. Information We Collect
          </Typography>
          <Typography variant="body1" paragraph>
            KaraokeHub collects information you provide directly to us, such as when you create an
            account, submit karaoke show information, or contact us for support. This may include:
          </Typography>
          <Typography variant="body1" component="ul" sx={{ ml: 2 }}>
            <li>Name and email address</li>
            <li>Profile information</li>
            <li>Karaoke show submissions and preferences</li>
            <li>Communication with our support team</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            2. How We Use Your Information
          </Typography>
          <Typography variant="body1" paragraph>
            We use the information we collect to:
          </Typography>
          <Typography variant="body1" component="ul" sx={{ ml: 2 }}>
            <li>Provide and maintain our karaoke discovery service</li>
            <li>Process and display karaoke show information</li>
            <li>Send you updates about karaoke shows you've favorited</li>
            <li>Respond to your comments and questions</li>
            <li>Improve our services and user experience</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            3. Facebook Event Data
          </Typography>
          <Typography variant="body1" paragraph>
            When you provide Facebook event URLs, we may access publicly available event information
            through Facebook's Graph API to extract karaoke show details such as:
          </Typography>
          <Typography variant="body1" component="ul" sx={{ ml: 2 }}>
            <li>Event name, date, and time</li>
            <li>Venue name and location</li>
            <li>Event description</li>
            <li>Host/organizer information</li>
          </Typography>
          <Typography variant="body1" paragraph>
            We only access public event information and do not store your Facebook login credentials
            or access your personal Facebook data.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            4. Information Sharing
          </Typography>
          <Typography variant="body1" paragraph>
            We do not sell, trade, or otherwise transfer your personal information to third parties
            except as described in this policy. We may share information:
          </Typography>
          <Typography variant="body1" component="ul" sx={{ ml: 2 }}>
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and safety</li>
            <li>In connection with a business transfer</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            5. Data Security
          </Typography>
          <Typography variant="body1" paragraph>
            We implement appropriate security measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction. However, no method of
            transmission over the internet is 100% secure.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            6. Your Rights
          </Typography>
          <Typography variant="body1" paragraph>
            You have the right to:
          </Typography>
          <Typography variant="body1" component="ul" sx={{ ml: 2 }}>
            <li>Access and update your account information</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of promotional communications</li>
            <li>Request information about data we have collected</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            7. Cookies and Tracking
          </Typography>
          <Typography variant="body1" paragraph>
            We use cookies and similar technologies to enhance your experience, analyze usage, and
            maintain your login session. You can control cookie settings through your browser.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            8. Changes to This Policy
          </Typography>
          <Typography variant="body1" paragraph>
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last updated" date.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            9. Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            If you have any questions about this privacy policy, please contact us at:
          </Typography>
          <Typography variant="body1">
            Email: privacy@karaokehub.app
            <br />
            Website: https://karaokehub.app
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicyPage;
