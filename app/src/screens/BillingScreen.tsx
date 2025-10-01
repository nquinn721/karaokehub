import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores';

// Mock billing data - in real app this would come from Stripe API
const mockPaymentMethods = [
  {
    id: 'pm_1',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
    isDefault: true,
  },
  {
    id: 'pm_2',
    type: 'card',
    card: {
      brand: 'mastercard',
      last4: '5555',
      exp_month: 8,
      exp_year: 2026,
    },
    isDefault: false,
  },
];

const mockInvoices = [
  {
    id: 'in_1',
    status: 'paid',
    amount: 2900,
    currency: 'usd',
    created: '2024-12-01',
    invoice_pdf: 'https://invoice.stripe.com/i/acct_1234/in_1',
    description: 'DJ Monthly Subscription',
    period_start: '2024-12-01',
    period_end: '2024-12-31',
  },
  {
    id: 'in_2',
    status: 'paid',
    amount: 2900,
    currency: 'usd',
    created: '2024-11-01',
    invoice_pdf: 'https://invoice.stripe.com/i/acct_1234/in_2',
    description: 'DJ Monthly Subscription',
    period_start: '2024-11-01',
    period_end: '2024-11-30',
  },
  {
    id: 'in_3',
    status: 'paid',
    amount: 2900,
    currency: 'usd',
    created: '2024-10-01',
    invoice_pdf: 'https://invoice.stripe.com/i/acct_1234/in_3',
    description: 'DJ Monthly Subscription',
    period_start: '2024-10-01',
    period_end: '2024-10-31',
  },
];

const BillingScreen = observer(() => {
  const [activeTab, setActiveTab] = useState<'overview' | 'methods' | 'history'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  const isDJ = authStore.user?.djId && authStore.user?.isDjSubscriptionActive;
  const nextBillingDate = '2025-01-01';
  const currentPlan = 'DJ Monthly';
  const currentAmount = 29.00;

  const formatAmount = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCardIcon = (brand: string): 'card' => {
    return 'card'; // All card types use the same icon
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#AAAAAA';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'failed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const handleAddPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'This will open Stripe payment method setup',
      [{ text: 'OK' }]
    );
  };

  const handleSetDefaultPaymentMethod = (methodId: string) => {
    Alert.alert(
      'Set as Default',
      'Set this payment method as your default for future billing?',
      [
        { text: 'Cancel' },
        { text: 'Set Default', onPress: () => Alert.alert('Success', 'Default payment method updated') }
      ]
    );
  };

  const handleRemovePaymentMethod = (methodId: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => Alert.alert('Success', 'Payment method removed') }
      ]
    );
  };

  const handleDownloadInvoice = (invoiceUrl: string) => {
    Linking.openURL(invoiceUrl);
  };

  const handleUpdateBilling = () => {
    Alert.alert(
      'Update Billing Info',
      'This will open billing information update form',
      [{ text: 'OK' }]
    );
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your DJ subscription? You will lose access to all DJ features at the end of your current billing period.',
      [
        { text: 'Keep Subscription' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive', 
          onPress: () => Alert.alert('Subscription Cancelled', 'Your subscription will end on ' + nextBillingDate) 
        }
      ]
    );
  };

  const OverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Current Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        {isDJ ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View>
                <Text style={styles.subscriptionPlan}>{currentPlan}</Text>
                <Text style={styles.subscriptionAmount}>${currentAmount}/month</Text>
              </View>
              <View style={styles.subscriptionStatus}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.subscriptionStatusText}>Active</Text>
              </View>
            </View>
            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Next billing date:</Text>
                <Text style={styles.detailValue}>{formatDate(nextBillingDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Billing cycle:</Text>
                <Text style={styles.detailValue}>Monthly</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noSubscriptionCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <Text style={styles.noSubscriptionText}>
              You don't have an active DJ subscription. Upgrade to access powerful DJ tools and features.
            </Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade to DJ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleUpdateBilling}>
            <Ionicons name="person" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Update Billing Info</Text>
            <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={handleAddPaymentMethod}>
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Add Payment Method</Text>
            <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="download" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Download Recent Invoice</Text>
            <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
          </TouchableOpacity>
          
          {isDJ && (
            <TouchableOpacity 
              style={[styles.quickActionButton, styles.dangerAction]} 
              onPress={handleCancelSubscription}
            >
              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
              <Text style={[styles.quickActionText, styles.dangerText]}>Cancel Subscription</Text>
              <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Billing Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total paid this year:</Text>
            <Text style={styles.summaryValue}>$87.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Invoices:</Text>
            <Text style={styles.summaryValue}>3 paid</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment methods:</Text>
            <Text style={styles.summaryValue}>{mockPaymentMethods.length}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const PaymentMethodsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPaymentMethod}>
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.paymentMethodsList}>
          {mockPaymentMethods.map((method) => (
            <View key={method.id} style={styles.paymentMethodCard}>
              <View style={styles.paymentMethodInfo}>
                <View style={styles.paymentMethodHeader}>
                  <Ionicons name={getCardIcon(method.card.brand)} size={24} color="#007AFF" />
                  <View style={styles.cardDetails}>
                    <Text style={styles.cardBrand}>{method.card.brand.toUpperCase()}</Text>
                    <Text style={styles.cardNumber}>•••• •••• •••• {method.card.last4}</Text>
                  </View>
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardExpiry}>
                  Expires {method.card.exp_month.toString().padStart(2, '0')}/{method.card.exp_year}
                </Text>
              </View>
              
              <View style={styles.paymentMethodActions}>
                {!method.isDefault && (
                  <TouchableOpacity 
                    style={styles.methodActionButton}
                    onPress={() => handleSetDefaultPaymentMethod(method.id)}
                  >
                    <Text style={styles.methodActionText}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.methodActionButton, styles.dangerAction]}
                  onPress={() => handleRemovePaymentMethod(method.id)}
                >
                  <Text style={[styles.methodActionText, styles.dangerText]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const BillingHistoryTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing History</Text>
        <View style={styles.invoicesList}>
          {mockInvoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceDescription}>{invoice.description}</Text>
                  <Text style={styles.invoiceDate}>{formatDate(invoice.created)}</Text>
                </View>
                <View style={styles.invoiceAmount}>
                  <Text style={styles.invoicePrice}>{formatAmount(invoice.amount, invoice.currency)}</Text>
                  <View style={styles.invoiceStatus}>
                    <Ionicons 
                      name={getStatusIcon(invoice.status)} 
                      size={16} 
                      color={getStatusColor(invoice.status)} 
                    />
                    <Text style={[styles.invoiceStatusText, { color: getStatusColor(invoice.status) }]}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.invoicePeriod}>
                <Text style={styles.invoicePeriodText}>
                  Billing period: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.downloadButton}
                onPress={() => handleDownloadInvoice(invoice.invoice_pdf)}
              >
                <Ionicons name="download" size={16} color="#007AFF" />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="card" size={32} color="#007AFF" style={styles.headerIcon} />
        <View>
          <Text style={styles.title}>Billing & Payments</Text>
          <Text style={styles.subtitle}>Manage your DJ subscription and payment methods</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'home' },
          { key: 'methods', label: 'Payment Methods', icon: 'card' },
          { key: 'history', label: 'History', icon: 'list' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.key ? '#FFFFFF' : '#AAAAAA'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'methods' && <PaymentMethodsTab />}
        {activeTab === 'history' && <BillingHistoryTab />}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
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
    maxWidth: '90%',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginRight: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subscriptionPlan: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subscriptionAmount: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscriptionStatusText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noSubscriptionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  noSubscriptionText: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    gap: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1E1E1E',
    gap: 12,
  },
  quickActionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  dangerAction: {
    backgroundColor: '#1E1E1E',
  },
  dangerText: {
    color: '#FF6B6B',
  },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodsList: {
    gap: 16,
  },
  paymentMethodCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
  },
  paymentMethodInfo: {
    marginBottom: 16,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
  },
  cardBrand: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardNumber: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardExpiry: {
    color: '#AAAAAA',
    fontSize: 12,
    marginLeft: 36,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    gap: 12,
  },
  methodActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  methodActionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  invoicesList: {
    gap: 16,
  },
  invoiceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  invoiceDate: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  invoicePrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoicePeriod: {
    marginBottom: 16,
  },
  invoicePeriodText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  downloadButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BillingScreen;