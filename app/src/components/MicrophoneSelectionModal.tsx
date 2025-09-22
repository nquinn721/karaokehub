import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Microphone {
  id: string;
  name: string;
  isFree: boolean;
  price?: number;
  rarity?: string;
}

interface MicrophoneSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (microphoneId: string) => void;
  currentMicrophone: string;
  microphones: Microphone[];
  userCoins: number;
}

const MicrophoneSelectionModal: React.FC<MicrophoneSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  currentMicrophone,
  microphones,
  userCoins,
}) => {
  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common':
        return '#AAAAAA';
      case 'rare':
        return '#007AFF';
      case 'epic':
        return '#9C27B0';
      case 'legendary':
        return '#FF9800';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Microphone</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {microphones.map((microphone) => {
              const isSelected = currentMicrophone === microphone.id;
              const canAfford =
                microphone.isFree || (microphone.price && userCoins >= microphone.price);
              const rarityColor = getRarityColor(microphone.rarity);

              return (
                <TouchableOpacity
                  key={microphone.id}
                  style={[
                    styles.microphoneItem,
                    isSelected && styles.selectedItem,
                    !canAfford && styles.disabledItem,
                  ]}
                  onPress={() => onSelect(microphone.id)}
                  disabled={!canAfford}
                >
                  <View style={styles.microphoneInfo}>
                    <View style={[styles.microphoneIcon, { borderColor: rarityColor }]}>
                      <Ionicons name="mic" size={24} color={rarityColor} />
                    </View>
                    <View style={styles.microphoneText}>
                      <Text style={[styles.microphoneName, !canAfford && styles.disabledText]}>
                        {microphone.name}
                      </Text>
                      {microphone.rarity && (
                        <Text style={[styles.rarityText, { color: rarityColor }]}>
                          {microphone.rarity}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.microphonePrice}>
                    {microphone.isFree ? (
                      <Text style={styles.freeText}>Free</Text>
                    ) : (
                      <Text style={[styles.priceText, !canAfford && styles.disabledText]}>
                        {microphone.price} coins
                      </Text>
                    )}
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    padding: 20,
  },
  microphoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedItem: {
    backgroundColor: '#007AFF20',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  disabledItem: {
    opacity: 0.5,
    backgroundColor: '#1A1A1A',
  },
  microphoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  microphoneIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  microphoneText: {
    flex: 1,
  },
  microphoneName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  disabledText: {
    color: '#666666',
  },
  microphonePrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  priceText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
});

export default MicrophoneSelectionModal;
