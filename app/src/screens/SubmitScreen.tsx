import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores';

const SubmitScreen = observer(() => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="add-circle" size={80} color="#007AFF" />
        </View>
        
        <Text style={styles.title}>Submit Show</Text>
        <Text style={styles.subtitle}>
          Upload images or manually add karaoke shows to help the community find great venues
        </Text>
        
        {!authStore.isAuthenticated && (
          <View style={styles.authNotice}>
            <Ionicons name="information-circle" size={20} color="#FFA500" />
            <Text style={styles.authNoticeText}>
              You can browse shows without an account, but you'll need to sign in to submit new venues
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.submitButton}>
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.submitButtonText}>Upload Photos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.submitButton, styles.manualButton]}>
          <Ionicons name="create" size={24} color="#007AFF" />
          <Text style={[styles.submitButtonText, styles.manualButtonText]}>Manual Entry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  authNoticeText: {
    fontSize: 14,
    color: '#DDDDDD',
    marginLeft: 10,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  manualButtonText: {
    color: '#007AFF',
  },
});

export default SubmitScreen;
