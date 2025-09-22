import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Avatar {
  id: string;
  name: string;
  isFree: boolean;
  price?: number;
}

interface AvatarSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  currentAvatar: string;
  avatars: Avatar[];
  userCoins: number;
}

const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  currentAvatar,
  avatars,
  userCoins,
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Avatar</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {avatars.map((avatar) => {
              const isSelected = currentAvatar === avatar.id;
              const canAfford = avatar.isFree || (avatar.price && userCoins >= avatar.price);

              return (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarItem,
                    isSelected && styles.selectedItem,
                    !canAfford && styles.disabledItem,
                  ]}
                  onPress={() => onSelect(avatar.id)}
                  disabled={!canAfford}
                >
                  <View style={styles.avatarInfo}>
                    <View style={styles.avatarIcon}>
                      <Ionicons name="person" size={24} color="#007AFF" />
                    </View>
                    <Text style={[styles.avatarName, !canAfford && styles.disabledText]}>
                      {avatar.name}
                    </Text>
                  </View>

                  <View style={styles.avatarPrice}>
                    {avatar.isFree ? (
                      <Text style={styles.freeText}>Free</Text>
                    ) : (
                      <Text style={[styles.priceText, !canAfford && styles.disabledText]}>
                        {avatar.price} coins
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
  avatarItem: {
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
  avatarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF20',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    color: '#666666',
  },
  avatarPrice: {
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

export default AvatarSelectionModal;
