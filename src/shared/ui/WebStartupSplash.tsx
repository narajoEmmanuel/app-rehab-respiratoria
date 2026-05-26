import { Image, StyleSheet, View } from 'react-native';

const INICIO_LOGO = require('../../../assets/images/inicio.png');

export function WebStartupSplash() {
  return (
    <View style={styles.container}>
      <Image source={INICIO_LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7F6',
  },
  logo: {
    width: 240,
    height: 240,
  },
});
