import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores';

const { width } = Dimensions.get('window');

// Mock event data - in real app this would come from API
const mockEvent = {
  id: 'event_1',
  title: 'Friday Night Karaoke Blast',
  description: 'Join us for the best karaoke night in town! Professional sound system, huge song library, and great drink specials. Perfect for beginners and seasoned performers alike.',
  venue: {
    name: 'The Blue Moon Tavern',
    address: '123 Music Street, Downtown, CA 90210',
    phone: '+1 (555) 123-4567',
    website: 'https://bluemoontavern.com',
    imageUrl: 'https://via.placeholder.com/400x200/1E3A8A/FFFFFF?text=Blue+Moon+Tavern',
    rating: 4.5,
    reviewCount: 127,
  },
  datetime: {
    date: '2024-12-15',
    startTime: '20:00',
    endTime: '02:00',
    timezone: 'PST',
  },
  dj: {
    id: 'dj_1',
    name: 'DJ Mike Rodriguez',
    avatar: 'https://via.placeholder.com/60x60/FF6B6B/FFFFFF?text=MR',
    bio: 'Professional karaoke host with 8+ years experience. Specializing in crowd engagement and creating memorable nights!',
    rating: 4.8,
    showCount: 156,
  },
  features: [
    'Professional Sound System',
    '50,000+ Song Library',
    'HD Video Display',
    'Wireless Microphones',
    'Drink Specials',
    'Free Parking',
    'Food Available',
    'Birthday Celebrations',
  ],
  pricing: {
    entry: 'Free',
    drinks: 'Happy Hour 7-9 PM',
    food: 'Full Menu Available',
  },
  capacity: 80,
  attendeeCount: 34,
  tags: ['Popular', 'Downtown', 'Late Night', 'Full Bar'],
  socialLinks: {
    facebook: 'https://facebook.com/bluemoontavern',
    instagram: 'https://instagram.com/bluemoontavern',
    twitter: 'https://twitter.com/bluemoontavern',
  },
  reviews: [
    {
      id: 'review_1',
      userName: 'Sarah Chen',
      userAvatar: 'https://via.placeholder.com/40x40/4CAF50/FFFFFF?text=SC',
      rating: 5,
      date: '2024-12-01',
      text: 'Amazing night! DJ Mike was fantastic and really got the crowd going. Great song selection and the sound quality was perfect.',
    },
    {
      id: 'review_2',
      userName: 'James Wilson',
      userAvatar: 'https://via.placeholder.com/40x40/2196F3/FFFFFF?text=JW',
      rating: 4,
      date: '2024-11-28',
      text: 'Good vibes and friendly crowd. The venue has a nice atmosphere and the drinks are reasonably priced.',
    },
    {
      id: 'review_3',
      userName: 'Maria Lopez',
      userAvatar: 'https://via.placeholder.com/40x40/9C27B0/FFFFFF?text=ML',
      rating: 5,
      date: '2024-11-25',
      text: 'This is my go-to karaoke spot! Always a great time and the staff is super friendly. Highly recommend!',
    },
  ],
  isAttending: false,
  isFavorite: false,
  lastUpdated: '2024-12-10T15:30:00Z',
};

const EventDetailsScreen = observer(() => {
  const [event, setEvent] = useState(mockEvent);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [expandedDescription, setExpandedDescription] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2024-01-01T${time}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleToggleAttending = () => {
    setEvent(prev => ({ ...prev, isAttending: !prev.isAttending }));
    Alert.alert(
      event.isAttending ? 'Removed from Calendar' : 'Added to Calendar',
      event.isAttending 
        ? 'Event removed from your calendar' 
        : 'Event added to your calendar with notifications'
    );
  };

  const handleToggleFavorite = () => {
    setEvent(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
  };

  const handleCallVenue = () => {
    Linking.openURL(`tel:${event.venue.phone}`);
  };

  const handleGetDirections = () => {
    const address = encodeURIComponent(event.venue.address);
    Linking.openURL(`https://maps.google.com/?q=${address}`);
  };

  const handleVisitWebsite = () => {
    Linking.openURL(event.venue.website);
  };

  const handleContactDJ = () => {
    Alert.alert(
      'Contact DJ',
      `Send a message to ${event.dj.name}?`,
      [
        { text: 'Cancel' },
        { text: 'Send Message', onPress: () => Alert.alert('Message', 'Message feature coming soon!') }
      ]
    );
  };

  const handleShareEvent = async () => {
    try {
      await Share.share({
        message: `Check out this karaoke event: ${event.title} at ${event.venue.name} on ${formatDate(event.datetime.date)}!`,
        url: `https://karaokehub.com/events/${event.id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSubmitReview = () => {
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review before submitting.');
      return;
    }

    // TODO: Submit review to API
    Alert.alert('Review Submitted', 'Thank you for your review!');
    setShowReviewModal(false);
    setReviewText('');
    setReviewRating(5);
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color="#FFD700"
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const ShareModal = () => (
    <Modal
      visible={showShareModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowShareModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.shareModal}>
          <Text style={styles.shareTitle}>Share Event</Text>
          <View style={styles.shareOptions}>
            <TouchableOpacity style={styles.shareOption}>
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              <Text style={styles.shareOptionText}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
              <Text style={styles.shareOptionText}>Twitter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              <Text style={styles.shareOptionText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption} onPress={handleShareEvent}>
              <Ionicons name="share" size={24} color="#007AFF" />
              <Text style={styles.shareOptionText}>More</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.shareCancel}
            onPress={() => setShowShareModal(false)}
          >
            <Text style={styles.shareCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const ReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowReviewModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowReviewModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Write Review</Text>
          <TouchableOpacity onPress={handleSubmitReview}>
            <Text style={styles.modalSubmitText}>Submit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.reviewContent}>
          <Text style={styles.reviewLabel}>Rating</Text>
          <View style={styles.ratingSelector}>
            {[1, 2, 3, 4, 5].map(rating => (
              <TouchableOpacity
                key={rating}
                onPress={() => setReviewRating(rating)}
              >
                <Ionicons
                  name={rating <= reviewRating ? 'star' : 'star-outline'}
                  size={32}
                  color="#FFD700"
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.reviewLabel}>Your Review</Text>
          <TextInput
            style={styles.reviewTextInput}
            multiline
            numberOfLines={6}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share your experience at this karaoke night..."
            placeholderTextColor="#AAAAAA"
          />
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: event.venue.imageUrl }} style={styles.heroImage} />
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heroActions}>
            <TouchableOpacity 
              style={styles.heroActionButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.heroActionButton}
              onPress={handleToggleFavorite}
            >
              <Ionicons 
                name={event.isFavorite ? 'heart' : 'heart-outline'} 
                size={20} 
                color={event.isFavorite ? '#FF6B6B' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Event Header */}
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color="#007AFF" />
            <Text style={styles.metaText}>{formatDate(event.datetime.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={16} color="#007AFF" />
            <Text style={styles.metaText}>
              {formatTime(event.datetime.startTime)} - {formatTime(event.datetime.endTime)}
            </Text>
          </View>
        </View>

        <View style={styles.attendanceInfo}>
          <View style={styles.attendanceItem}>
            <Ionicons name="people" size={16} color="#4CAF50" />
            <Text style={styles.attendanceText}>
              {event.attendeeCount} attending • {event.capacity - event.attendeeCount} spots left
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleToggleAttending}
        >
          <Ionicons 
            name={event.isAttending ? 'calendar' : 'calendar-outline'} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.primaryButtonText}>
            {event.isAttending ? 'Remove from Calendar' : 'Add to Calendar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About This Event</Text>
        <Text 
          style={styles.description}
          numberOfLines={expandedDescription ? undefined : 3}
        >
          {event.description}
        </Text>
        <TouchableOpacity onPress={() => setExpandedDescription(!expandedDescription)}>
          <Text style={styles.expandText}>
            {expandedDescription ? 'Show Less' : 'Show More'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        {event.tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Venue Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue</Text>
        <View style={styles.venueCard}>
          <View style={styles.venueHeader}>
            <View style={styles.venueInfo}>
              <Text style={styles.venueName}>{event.venue.name}</Text>
              <View style={styles.venueRating}>
                {renderStars(Math.floor(event.venue.rating))}
                <Text style={styles.ratingText}>
                  {event.venue.rating} ({event.venue.reviewCount} reviews)
                </Text>
              </View>
              <Text style={styles.venueAddress}>{event.venue.address}</Text>
            </View>
          </View>

          <View style={styles.venueActions}>
            <TouchableOpacity style={styles.venueActionButton} onPress={handleCallVenue}>
              <Ionicons name="call" size={20} color="#007AFF" />
              <Text style={styles.venueActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.venueActionButton} onPress={handleGetDirections}>
              <Ionicons name="navigate" size={20} color="#007AFF" />
              <Text style={styles.venueActionText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.venueActionButton} onPress={handleVisitWebsite}>
              <Ionicons name="globe" size={20} color="#007AFF" />
              <Text style={styles.venueActionText}>Website</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* DJ Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Host</Text>
        <View style={styles.djCard}>
          <Image source={{ uri: event.dj.avatar }} style={styles.djAvatar} />
          <View style={styles.djInfo}>
            <Text style={styles.djName}>{event.dj.name}</Text>
            <View style={styles.djStats}>
              {renderStars(Math.floor(event.dj.rating), 14)}
              <Text style={styles.djStatsText}>
                {event.dj.rating} • {event.dj.showCount} shows hosted
              </Text>
            </View>
            <Text style={styles.djBio}>{event.dj.bio}</Text>
          </View>
          <TouchableOpacity style={styles.contactDjButton} onPress={handleContactDJ}>
            <Ionicons name="chatbubble" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What to Expect</Text>
        <View style={styles.featuresList}>
          {event.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        <View style={styles.pricingCard}>
          <View style={styles.pricingItem}>
            <Text style={styles.pricingLabel}>Entry:</Text>
            <Text style={styles.pricingValue}>{event.pricing.entry}</Text>
          </View>
          <View style={styles.pricingItem}>
            <Text style={styles.pricingLabel}>Drinks:</Text>
            <Text style={styles.pricingValue}>{event.pricing.drinks}</Text>
          </View>
          <View style={styles.pricingItem}>
            <Text style={styles.pricingLabel}>Food:</Text>
            <Text style={styles.pricingValue}>{event.pricing.food}</Text>
          </View>
        </View>
      </View>

      {/* Reviews */}
      <View style={styles.section}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <TouchableOpacity 
            style={styles.writeReviewButton}
            onPress={() => setShowReviewModal(true)}
          >
            <Text style={styles.writeReviewText}>Write Review</Text>
          </TouchableOpacity>
        </View>
        
        {event.reviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Image source={{ uri: review.userAvatar }} style={styles.reviewAvatar} />
              <View style={styles.reviewUserInfo}>
                <Text style={styles.reviewUserName}>{review.userName}</Text>
                <View style={styles.reviewMeta}>
                  {renderStars(review.rating, 12)}
                  <Text style={styles.reviewDate}>{formatDate(review.date)}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </View>

      <ShareModal />
      <ReviewModal />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  heroContainer: {
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 250,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroActionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  eventHeader: {
    padding: 16,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  attendanceInfo: {
    marginTop: 8,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  expandText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  tag: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  venueCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  venueHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  venueAddress: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  venueActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  venueActionButton: {
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  venueActionText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  djCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  djAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  djInfo: {
    flex: 1,
  },
  djName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  djStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  djStatsText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  djBio: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 18,
  },
  contactDjButton: {
    padding: 8,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  pricingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  pricingValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  writeReviewText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    color: '#AAAAAA',
    fontSize: 10,
  },
  reviewText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  shareTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareOption: {
    alignItems: 'center',
    gap: 8,
  },
  shareOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  shareCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareCancelText: {
    color: '#007AFF',
    fontSize: 16,
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
  modalSubmitText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewContent: {
    flex: 1,
    padding: 16,
  },
  reviewLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  reviewTextInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
    height: 120,
  },
});

export default EventDetailsScreen;