import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

const AboutScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>About Screen - Coming Soon</Text>
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

export default AboutScreen;
