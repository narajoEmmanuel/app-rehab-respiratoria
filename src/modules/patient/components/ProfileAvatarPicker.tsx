/**
 * Purpose: Circular avatar with gallery picker and optional clear.
 * Module: patient
 */

import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
} from 'expo-file-system/src/legacy/FileSystem';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { ProfileAvatarView } from '@/src/modules/patient/components/ProfileAvatarView';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

const ACCENT = '#34aba5';

async function persistPickedUri(
  asset: ImagePicker.ImagePickerAsset,
  patientId?: number,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (asset.base64) {
      const mime = asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    return asset.uri ?? null;
  }

  const src = asset.uri;
  if (!src) return null;
  const base = documentDirectory;
  if (!base) return src;
  const avatarName =
    typeof patientId === 'number' && Number.isFinite(patientId) && patientId > 0
      ? `profile_avatar_${String(patientId)}.jpg`
      : 'profile_avatar_anonymous.jpg';
  const dest = `${base}${avatarName}`;
  try {
    const info = await getInfoAsync(dest);
    if (info.exists) {
      await deleteAsync(dest, { idempotent: true });
    }
    await copyAsync({ from: src, to: dest });
    return dest;
  } catch {
    return src;
  }
}

type Props = {
  patientId?: number;
  displayName: string;
  avatarUri: string | null;
  onAvatarUriChange: (uri: string | null) => void;
};

export function ProfileAvatarPicker({ patientId, displayName, avatarUri, onAvatarUriChange }: Props) {
  const [busy, setBusy] = useState(false);

  const pickFromLibrary = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permisos',
          'Para elegir una foto necesitamos acceso a la galería. Puedes activarlo en los ajustes del dispositivo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: Platform.OS === 'web',
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      const nextUri = await persistPickedUri(asset, patientId);
      if (nextUri) onAvatarUriChange(nextUri);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo cargar la imagen.';
      Alert.alert('Foto de perfil', message);
    } finally {
      setBusy(false);
    }
  }, [onAvatarUriChange, patientId]);

  const clearAvatar = useCallback(() => {
    Alert.alert('Quitar foto', '¿Eliminar la foto de perfil de este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => onAvatarUriChange(null),
      },
    ]);
  }, [onAvatarUriChange]);

  return (
    <View style={styles.wrap}>
      <ProfileAvatarView displayName={displayName} avatarUri={avatarUri} />

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
          onPress={() => void pickFromLibrary()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Editar foto de perfil">
          <IconSymbol name="person.crop.circle" size={18} color={ACCENT} />
          <Text style={styles.editBtnText}>{avatarUri ? 'Cambiar foto' : 'Editar foto'}</Text>
        </Pressable>
        {avatarUri ? (
          <Pressable
            style={({ pressed }) => [styles.clearLink, pressed && styles.clearLinkPressed]}
            onPress={clearAvatar}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Quitar foto de perfil">
            <Text style={styles.clearLinkText}>Quitar foto</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  editBtnPressed: { opacity: 0.9 },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
  clearLink: { paddingVertical: spacing.xs },
  clearLinkPressed: { opacity: 0.75 },
  clearLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
});
