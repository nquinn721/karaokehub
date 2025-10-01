import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PrivacyPolicyScreen = () => {
  const handleContactSupport = () => {
    Linking.openURL('mailto:privacy@karaokehub.com?subject=Privacy Question');
  };

  const handleOpenWebPolicy = () => {
    Linking.openURL('https://karaokehub.com/privacy-policy');
  };

  const PolicySection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const PolicyText = ({ children }: { children: string }) => (
    <Text style={styles.bodyText}>{children}</Text>
  );

  const BulletPoint = ({ children }: { children: string }) => (
    <View style={styles.bulletPoint}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={32} color="#007AFF" style={styles.headerIcon} />
        <View>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>Last updated: January 2024</Text>
        </View>
      </View>

      {/* Quick Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.summaryTitle}>Quick Summary</Text>
        </View>
        <Text style={styles.summaryText}>
          We respect your privacy and are committed to protecting your personal data. We only
          collect information necessary to provide our karaoke services and never sell your data to
          third parties.
        </Text>
      </View>

      {/* Policy Content */}
      <PolicySection title="1. Information We Collect">
        <PolicyText>
          We collect information you provide directly to us and information we obtain automatically
          when you use our services.
        </PolicyText>

        <Text style={styles.subsectionTitle}>Information You Provide:</Text>
        <BulletPoint>Account information (email, username, profile details)</BulletPoint>
        <BulletPoint>Karaoke show details you submit</BulletPoint>
        <BulletPoint>Communications with our support team</BulletPoint>
        <BulletPoint>Payment information (processed securely by Stripe)</BulletPoint>

        <Text style={styles.subsectionTitle}>Information We Collect Automatically:</Text>
        <BulletPoint>Device information and operating system</BulletPoint>
        <BulletPoint>App usage analytics and performance data</BulletPoint>
        <BulletPoint>Location data (only when searching for nearby shows)</BulletPoint>
        <BulletPoint>Crash reports and error logs</BulletPoint>
      </PolicySection>

      <PolicySection title="2. How We Use Your Information">
        <PolicyText>
          We use the information we collect to provide, maintain, and improve our services:
        </PolicyText>

        <BulletPoint>Provide and personalize the KaraokeHub experience</BulletPoint>
        <BulletPoint>Process DJ subscriptions and payments</BulletPoint>
        <BulletPoint>Send important service updates and notifications</BulletPoint>
        <BulletPoint>Improve app performance and fix bugs</BulletPoint>
        <BulletPoint>Prevent fraud and maintain security</BulletPoint>
        <BulletPoint>Comply with legal obligations</BulletPoint>
      </PolicySection>

      <PolicySection title="3. Information Sharing">
        <PolicyText>
          We do not sell, trade, or rent your personal information to third parties. We may share
          information in limited circumstances:
        </PolicyText>

        <BulletPoint>
          With service providers who help operate our app (hosting, analytics, payment processing)
        </BulletPoint>
        <BulletPoint>When required by law or to protect rights and safety</BulletPoint>
        <BulletPoint>With your consent for specific purposes</BulletPoint>
        <BulletPoint>In connection with a business transfer or merger</BulletPoint>
      </PolicySection>

      <PolicySection title="4. Data Security">
        <PolicyText>
          We implement appropriate security measures to protect your information:
        </PolicyText>

        <BulletPoint>Encryption of data in transit and at rest</BulletPoint>
        <BulletPoint>Regular security audits and monitoring</BulletPoint>
        <BulletPoint>Limited access to personal data on need-to-know basis</BulletPoint>
        <BulletPoint>Secure payment processing through Stripe</BulletPoint>
      </PolicySection>

      <PolicySection title="5. Your Privacy Rights">
        <PolicyText>You have rights regarding your personal information:</PolicyText>

        <BulletPoint>Access: Request a copy of your personal data</BulletPoint>
        <BulletPoint>Correction: Update or correct inaccurate information</BulletPoint>
        <BulletPoint>Deletion: Request deletion of your account and data</BulletPoint>
        <BulletPoint>Portability: Export your data in a readable format</BulletPoint>
        <BulletPoint>Opt-out: Unsubscribe from marketing communications</BulletPoint>
      </PolicySection>

      <PolicySection title="6. Cookies and Tracking">
        <PolicyText>Our app uses various technologies to enhance your experience:</PolicyText>

        <BulletPoint>Essential cookies for app functionality</BulletPoint>
        <BulletPoint>Analytics cookies to understand usage patterns</BulletPoint>
        <BulletPoint>Performance cookies to optimize app speed</BulletPoint>
        <BulletPoint>You can manage cookie preferences in your device settings</BulletPoint>
      </PolicySection>

      <PolicySection title="7. Children's Privacy">
        <PolicyText>
          Our services are not intended for children under 13. We do not knowingly collect personal
          information from children under 13. If you believe we have collected such information,
          please contact us immediately.
        </PolicyText>
      </PolicySection>

      <PolicySection title="8. International Data Transfers">
        <PolicyText>
          Your information may be processed and stored in countries other than your own. We ensure
          appropriate safeguards are in place to protect your data during international transfers.
        </PolicyText>
      </PolicySection>

      <PolicySection title="9. Data Retention">
        <PolicyText>
          We retain your information only as long as necessary to provide services and comply with
          legal obligations:
        </PolicyText>

        <BulletPoint>Account data: Until you delete your account</BulletPoint>
        <BulletPoint>Show information: As long as publicly visible</BulletPoint>
        <BulletPoint>Analytics data: Up to 26 months</BulletPoint>
        <BulletPoint>Support communications: Up to 3 years</BulletPoint>
      </PolicySection>

      <PolicySection title="10. Changes to This Policy">
        <PolicyText>
          We may update this Privacy Policy from time to time. We will notify you of any material
          changes by:
        </PolicyText>

        <BulletPoint>Posting the new policy in the app</BulletPoint>
        <BulletPoint>Sending email notifications for significant changes</BulletPoint>
        <BulletPoint>Requiring acceptance for major updates</BulletPoint>
      </PolicySection>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Questions About Privacy?</Text>
        <Text style={styles.contactDescription}>
          If you have any questions about this Privacy Policy or our data practices, we're here to
          help.
        </Text>

        <View style={styles.contactOptions}>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Ionicons name="mail" size={20} color="#007AFF" />
            <Text style={styles.contactButtonText}>Email Privacy Team</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactButton} onPress={handleOpenWebPolicy}>
            <Ionicons name="globe" size={20} color="#007AFF" />
            <Text style={styles.contactButtonText}>View Web Version</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This policy is effective as of January 1, 2024 and was last updated on January 15, 2024.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionContent: {
    gap: 12,
  },
  subsectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  bodyText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    color: '#007AFF',
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  contactTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  contactOptions: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: 20,
  },
  footerText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PrivacyPolicyScreen;
