import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { Alert, View } from 'react-native';
import { authStore } from '../stores';

interface AuthGuardProps {
  children: React.ReactNode;
  routeName?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = observer(({ children, routeName = 'this feature' }) => {
  const navigation = useNavigation();

  useEffect(() => {
    if (!authStore.isAuthenticated) {
      Alert.alert(
        'Login Required',
        `You need to login to access ${routeName}. Would you like to login now?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // Navigate back to Shows tab
              navigation.navigate('Shows' as never);
            },
          },
          {
            text: 'Login',
            onPress: () => {
              navigation.navigate('Auth' as never);
            },
          },
        ],
      );
    }
  }, [authStore.isAuthenticated, navigation, routeName]);

  if (!authStore.isAuthenticated) {
    // Return empty view while alert is shown
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return <>{children}</>;
});

export default AuthGuard;
