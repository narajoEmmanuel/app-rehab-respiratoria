import { StyleSheet, Text, View } from 'react-native';

type GameStatusBannerProps = {
  primaryText: string;
  secondaryText?: string;
};

export function GameStatusBanner({ primaryText, secondaryText }: GameStatusBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.primary}>{primaryText}</Text>
      {secondaryText ? <Text style={styles.secondary}>{secondaryText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 12,
  },
  primary: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondary: {
    marginTop: 4,
    color: '#d7ffd5',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
