import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'dj' | 'technical' | 'billing';
  tags: string[];
  helpful?: number;
  notHelpful?: number;
}

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
}

const mockFAQs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I find karaoke shows near me?',
    answer: 'Use the Shows tab to browse nearby karaoke events. You can filter by date, distance, and venue type. Make sure to enable location permissions for the most accurate results.',
    category: 'general',
    tags: ['search', 'location', 'shows'],
    helpful: 45,
    notHelpful: 2,
  },
  {
    id: '2',
    question: 'What\'s the difference between free and DJ subscriptions?',
    answer: 'Free users can browse shows and submit basic information. DJ subscribers ($29/month) can manage their own shows, access analytics, get priority support, and use advanced DJ tools.',
    category: 'billing',
    tags: ['subscription', 'pricing', 'features'],
    helpful: 67,
    notHelpful: 3,
  },
  {
    id: '3',
    question: 'How do I submit information about a karaoke show?',
    answer: 'Tap the "+" button on the Shows screen, then fill out the show details including venue, time, and any special information. Your submission helps the community stay informed!',
    category: 'general',
    tags: ['submit', 'shows', 'community'],
    helpful: 32,
    notHelpful: 1,
  },
  {
    id: '4',
    question: 'Can I manage multiple karaoke venues as a DJ?',
    answer: 'Yes! DJ subscribers can manage shows at multiple venues. Add each venue from your DJ dashboard and manage all your shows from one place.',
    category: 'dj',
    tags: ['venues', 'management', 'multiple'],
    helpful: 28,
    notHelpful: 0,
  },
  {
    id: '5',
    question: 'Why can\'t I see the DJ features?',
    answer: 'DJ features are only available with an active DJ subscription. Upgrade your account in Settings > Subscription to access show management, analytics, and other DJ tools.',
    category: 'dj',
    tags: ['subscription', 'features', 'access'],
    helpful: 51,
    notHelpful: 4,
  },
  {
    id: '6',
    question: 'How do I change my notification settings?',
    answer: 'Go to Settings > Notifications to customize which notifications you receive. You can enable/disable push notifications, email alerts, and SMS updates.',
    category: 'technical',
    tags: ['notifications', 'settings', 'customize'],
    helpful: 23,
    notHelpful: 1,
  },
  {
    id: '7',
    question: 'Is my payment information secure?',
    answer: 'Yes! We use Stripe for secure payment processing. Your card information is encrypted and never stored on our servers. All transactions are protected by industry-standard security.',
    category: 'billing',
    tags: ['security', 'payments', 'stripe'],
    helpful: 89,
    notHelpful: 1,
  },
  {
    id: '8',
    question: 'How do I cancel my DJ subscription?',
    answer: 'Go to Settings > Billing > Subscription and tap "Cancel Subscription". You\'ll keep access until the end of your current billing period.',
    category: 'billing',
    tags: ['cancel', 'subscription', 'billing'],
    helpful: 34,
    notHelpful: 2,
  },
  {
    id: '9',
    question: 'The app is crashing or running slowly. What should I do?',
    answer: 'Try restarting the app first. If issues persist, go to Settings > Help > Report a Bug to send us crash logs, or contact support with your device information.',
    category: 'technical',
    tags: ['crash', 'performance', 'troubleshooting'],
    helpful: 42,
    notHelpful: 3,
  },
  {
    id: '10',
    question: 'Can I use KaraokeHub on multiple devices?',
    answer: 'Yes! Your account syncs across all your devices. Log in with the same email and password on any device to access your shows, favorites, and settings.',
    category: 'technical',
    tags: ['sync', 'devices', 'account'],
    helpful: 38,
    notHelpful: 1,
  },
];

const HelpScreen = observer(() => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const categories = [
    { key: 'all', label: 'All Topics' },
    { key: 'general', label: 'General' },
    { key: 'dj', label: 'DJ Features' },
    { key: 'technical', label: 'Technical' },
    { key: 'billing', label: 'Billing' },
  ];

  const helpTopics: HelpTopic[] = [
    {
      id: 'getting-started',
      title: 'Getting Started Guide',
      description: 'Learn the basics of using KaraokeHub',
      icon: 'play-circle',
      action: () => Linking.openURL('https://karaokehub.com/getting-started'),
    },
    {
      id: 'dj-guide',
      title: 'DJ Setup Guide',
      description: 'Complete guide to setting up your DJ account',
      icon: 'musical-note',
      action: () => Linking.openURL('https://karaokehub.com/dj-guide'),
    },
    {
      id: 'video-tutorials',
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides',
      icon: 'videocam',
      action: () => Linking.openURL('https://youtube.com/karaokehub'),
    },
    {
      id: 'community-forum',
      title: 'Community Forum',
      description: 'Connect with other users and DJs',
      icon: 'people',
      action: () => Linking.openURL('https://community.karaokehub.com'),
    },
    {
      id: 'report-bug',
      title: 'Report a Bug',
      description: 'Help us improve by reporting issues',
      icon: 'bug',
      action: () => setShowContactModal(true),
    },
    {
      id: 'feature-request',
      title: 'Request a Feature',
      description: 'Suggest new features and improvements',
      icon: 'bulb',
      action: () => setShowContactModal(true),
    },
  ];

  // Filter FAQs based on search and category
  const filteredFAQs = mockFAQs.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleContactSupport = () => {
    const subject = encodeURIComponent(contactSubject || 'Support Request');
    const body = encodeURIComponent(contactMessage || 'Please describe your issue...');
    Linking.openURL(`mailto:support@karaokehub.com?subject=${subject}&body=${body}`);
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+1-800-KARAOKE');
  };

  const handleFeedback = (faqId: string, isHelpful: boolean) => {
    // TODO: Submit feedback to analytics
    console.log(`FAQ ${faqId} marked as ${isHelpful ? 'helpful' : 'not helpful'}`);
  };

  const ContactModal = () => (
    <Modal
      visible={showContactModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowContactModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowContactModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Contact Support</Text>
          <TouchableOpacity onPress={handleContactSupport}>
            <Text style={styles.modalSendText}>Send</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Subject</Text>
          <TextInput
            style={styles.textInput}
            value={contactSubject}
            onChangeText={setContactSubject}
            placeholder="Brief description of your issue"
            placeholderTextColor="#AAAAAA"
          />

          <Text style={styles.inputLabel}>Message</Text>
          <TextInput
            style={[styles.textInput, styles.messageInput]}
            value={contactMessage}
            onChangeText={setContactMessage}
            placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
            placeholderTextColor="#AAAAAA"
            multiline
            numberOfLines={6}
          />

          <View style={styles.contactOptions}>
            <TouchableOpacity style={styles.contactOption} onPress={handleCallSupport}>
              <Ionicons name="call" size={20} color="#007AFF" />
              <View style={styles.contactOptionText}>
                <Text style={styles.contactOptionTitle}>Call Support</Text>
                <Text style={styles.contactOptionDescription}>1-800-KARAOKE (Mon-Fri 9am-5pm PST)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactOption}>
              <Ionicons name="chatbubble" size={20} color="#007AFF" />
              <View style={styles.contactOptionText}>
                <Text style={styles.contactOptionTitle}>Live Chat</Text>
                <Text style={styles.contactOptionDescription}>Available 24/7 for urgent issues</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const FAQItem = ({ item }: { item: FAQItem }) => {
    const isExpanded = expandedFAQ === item.id;
    
    return (
      <View style={styles.faqItem}>
        <TouchableOpacity
          style={styles.faqQuestion}
          onPress={() => setExpandedFAQ(isExpanded ? null : item.id)}
        >
          <Text style={styles.faqQuestionText}>{item.question}</Text>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#AAAAAA" 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <Text style={styles.faqAnswerText}>{item.answer}</Text>
            
            <View style={styles.faqTags}>
              {item.tags.map((tag, index) => (
                <View key={index} style={styles.faqTag}>
                  <Text style={styles.faqTagText}>#{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.faqFeedback}>
              <Text style={styles.feedbackQuestion}>Was this helpful?</Text>
              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleFeedback(item.id, true)}
                >
                  <Ionicons name="thumbs-up" size={16} color="#4CAF50" />
                  <Text style={styles.feedbackText}>{item.helpful || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleFeedback(item.id, false)}
                >
                  <Ionicons name="thumbs-down" size={16} color="#FF6B6B" />
                  <Text style={styles.feedbackText}>{item.notHelpful || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="help-circle" size={32} color="#007AFF" style={styles.headerIcon} />
        <View>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>Find answers and get help when you need it</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Help</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.urgentButton} onPress={() => setShowContactModal(true)}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            <Text style={styles.urgentButtonText}>Need Urgent Help?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Help Topics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help Topics</Text>
        <View style={styles.helpTopics}>
          {helpTopics.map((topic) => (
            <TouchableOpacity key={topic.id} style={styles.helpTopic} onPress={topic.action}>
              <Ionicons name={topic.icon as any} size={24} color="#007AFF" />
              <View style={styles.helpTopicContent}>
                <Text style={styles.helpTopicTitle}>{topic.title}</Text>
                <Text style={styles.helpTopicDescription}>{topic.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* FAQ Search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#AAAAAA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor="#AAAAAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryChip,
                selectedCategory === category.key && styles.selectedCategoryChip
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.key && styles.selectedCategoryChipText
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Count */}
        <Text style={styles.resultsText}>
          {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* FAQ List */}
      <FlatList
        data={filteredFAQs}
        renderItem={FAQItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.faqList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#333333" />
            <Text style={styles.emptyTitle}>No FAQs Found</Text>
            <Text style={styles.emptyDescription}>
              Try adjusting your search terms or browse all categories
            </Text>
          </View>
        )}
      />

      <ContactModal />
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickActions: {
    gap: 12,
  },
  urgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  urgentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpTopics: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  helpTopic: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  helpTopicContent: {
    flex: 1,
    marginLeft: 16,
  },
  helpTopicTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  helpTopicDescription: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  categoriesContainer: {
    paddingRight: 16,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
  },
  resultsText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  faqList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  faqItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  faqQuestionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  faqAnswerText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  faqTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  faqTag: {
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  faqTagText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  faqFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackQuestion: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSendText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  contactOptions: {
    marginTop: 32,
    gap: 16,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  contactOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  contactOptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactOptionDescription: {
    color: '#AAAAAA',
    fontSize: 14,
  },
});

export default HelpScreen;