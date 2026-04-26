import { StyleSheet, View } from 'react-native';

import SubscribePlayPanel from '@/components/subscription/SubscribePlayPanel';

export default function SubscribeScreen() {
  return (
    <View style={styles.root}>
      <SubscribePlayPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
