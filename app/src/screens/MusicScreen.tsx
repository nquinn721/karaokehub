import { StyleSheet, Text, View } from 'react-native';
import CustomHeader from '../components/CustomHeader';

const MusicScreen = () => {
  return (
    <View style={styles.container}>
      <CustomHeader title="Music Library" showMenu={false} />
      <View style={styles.content}>
        <Text style={styles.title}>Music Library</Text>
        <Text style={styles.subtitle}>Search and preview karaoke songs</Text>
      </View>
    </View>
  );
};

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
  },
});

export default MusicScreen;
