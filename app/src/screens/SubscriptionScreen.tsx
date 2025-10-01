import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authStore } from '../stores';

const SubscriptionScreen = observer(() => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDJ = authStore.user?.djId && authStore.user?.isDjSubscriptionActive;

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Browse karaoke shows',
        'Submit show information',
        'Basic music search',
        'Community features',
      ],
      limitations: ['Limited show submissions per month', 'Basic search only', 'No DJ tools'],
      current: !isDJ,
      recommended: false,
    },
    {
      id: 'dj-monthly',
      name: 'DJ Monthly',
      price: '$29',
      period: 'per month',
      features: [
        'Everything in Free',
        'Manage your karaoke shows',
        'Advanced show analytics',
        'Custom show descriptions',
        'Priority support',
        'DJ badge and profile',
      ],
      limitations: [],
      current: isDJ,
      recommended: true,
    },
    {
      id: 'dj-yearly',
      name: 'DJ Yearly',
      price: '$290',
      period: 'per year',
      originalPrice: '$348',
      savings: 'Save $58',
      features: [
        'Everything in DJ Monthly',
        'Advanced analytics dashboard',
        'Custom branding options',
        'API access for integrations',
        'Priority feature requests',
        '2 months free!',
      ],
      limitations: [],
      current: false,
      recommended: false,
    },
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);

    try {
      // TODO: Implement actual Stripe subscription flow
      Alert.alert(
        'Coming Soon',
        'Subscription management will be implemented with Stripe integration soon!',
        [{ text: 'OK' }],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'You can manage your subscription, update payment methods, or cancel anytime.',
      [
        { text: 'Cancel' },
        {
          text: 'Manage',
          onPress: () => Alert.alert('Coming Soon', 'Subscription management portal coming soon!'),
        },
      ],
    );
  };

  const PlanCard = ({ plan }: { plan: any }) => (
    <TouchableOpacity
      style={[
        styles.planCard,
        plan.current && styles.currentPlanCard,
        selectedPlan === plan.id && styles.selectedPlanCard,
        plan.recommended && styles.recommendedPlanCard,
      ]}
      onPress={() => handleSelectPlan(plan.id)}
      disabled={plan.current}
    >
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Ionicons name="star" size={12} color="#FFFFFF" />
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}

      {plan.current && (
        <View style={styles.currentBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
          <Text style={styles.currentText}>Current Plan</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
          {plan.originalPrice && <Text style={styles.originalPrice}>{plan.originalPrice}</Text>}
        </View>
        {plan.savings && <Text style={styles.savingsText}>{plan.savings}</Text>}
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Features included:</Text>
        {plan.features.map((feature: string, index: number) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}

        {plan.limitations.length > 0 && (
          <>
            <Text style={[styles.featuresTitle, { marginTop: 12 }]}>Limitations:</Text>
            {plan.limitations.map((limitation: string, index: number) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="close" size={16} color="#FF6B6B" />
                <Text style={[styles.featureText, { color: '#AAAAAA' }]}>{limitation}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      {!plan.current && (
        <View style={styles.selectButton}>
          <Text style={styles.selectButtonText}>
            {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="musical-note" size={32} color="#007AFF" style={styles.headerIcon} />
        <View>
          <Text style={styles.title}>DJ Subscription</Text>
          <Text style={styles.subtitle}>
            {isDJ
              ? 'Manage your DJ subscription and unlock powerful tools'
              : 'Unlock powerful tools to manage your karaoke shows'}
          </Text>
        </View>
      </View>

      {/* Current Status */}
      {isDJ && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statusTitle}>DJ Plan Active</Text>
          </View>
          <Text style={styles.statusDescription}>
            You have full access to all DJ features and tools. Manage your subscription below.
          </Text>
          <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Plans */}
      <View style={styles.plansContainer}>
        <Text style={styles.plansTitle}>Choose Your Plan</Text>
        <Text style={styles.plansSubtitle}>
          Select the plan that best fits your karaoke hosting needs
        </Text>

        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </View>

      {/* Subscribe Button */}
      {selectedPlan && selectedPlan !== 'free' && !isDJ && (
        <TouchableOpacity
          style={[styles.subscribeButton, isLoading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={isLoading}
        >
          <Text style={styles.subscribeButtonText}>
            {isLoading
              ? 'Processing...'
              : `Subscribe to ${plans.find((p) => p.id === selectedPlan)?.name}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
          <Text style={styles.faqAnswer}>
            Yes, you can cancel your subscription at any time. You'll continue to have access until
            the end of your billing period.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>What happens to my shows if I cancel?</Text>
          <Text style={styles.faqAnswer}>
            Your shows will remain visible to users, but you won't be able to edit or manage them
            until you resubscribe.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Do you offer refunds?</Text>
          <Text style={styles.faqAnswer}>
            We offer a 30-day money-back guarantee for new subscriptions. Contact support for
            assistance.
          </Text>
        </View>
      </View>

      {/* Contact Support */}
      <TouchableOpacity style={styles.supportButton}>
        <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
        <Text style={styles.supportButtonText}>Have questions? Contact Support</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

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
    lineHeight: 20,
    maxWidth: '90%',
  },
  statusCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  manageButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  plansContainer: {
    marginBottom: 24,
  },
  plansTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  plansSubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
  },
  currentPlanCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#1E2E1E',
  },
  selectedPlanCard: {
    borderColor: '#007AFF',
    backgroundColor: '#1E1E2E',
  },
  recommendedPlanCard: {
    borderColor: '#FFD700',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  planPrice: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 4,
  },
  planPeriod: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  originalPrice: {
    color: '#AAAAAA',
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  savingsText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  selectButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#333333',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  faqSection: {
    marginBottom: 32,
  },
  faqTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  faqAnswer: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    marginBottom: 40,
    gap: 8,
  },
  supportButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SubscriptionScreen;
