import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

const MusicScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Music Screen - Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark.text,
  },
});

export default MusicScreen;
