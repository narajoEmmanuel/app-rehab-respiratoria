import { Image, StyleSheet, View } from 'react-native';

const RESPIRA_LOGO = require('../../../assets/images/respira-logo.png');

export function WebStartupSplash() {
  return (
    <View style={styles.container}>
      <Image source={RESPIRA_LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF9',
  },
  logo: {
    width: 220,
    height: 220,
  },
});
