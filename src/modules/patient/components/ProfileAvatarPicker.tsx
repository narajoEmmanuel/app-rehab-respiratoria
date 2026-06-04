/**
 * Purpose: Circular avatar with Instagram-style bottom sheet for photo management.
 * Module: patient
 */

import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
} from 'expo-file-system/src/legacy/FileSystem';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileAvatarView } from '@/src/modules/patient/components/ProfileAvatarView';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';

const ACCENT_DARK = '#168C86';
const SHEET_RADIUS = 24;
const SCREEN_WIDTH = Dimensions.get('window').width;
const AVATAR_PICKER_QUALITY = 0.78;

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

function isLocalDocumentFile(uri: string): boolean {
  if (!documentDirectory) return false;
  return uri.startsWith(documentDirectory);
}

async function tryDeleteLocalFile(uri: string | null): Promise<void> {
  if (!uri) return;
  if (!isLocalDocumentFile(uri)) return;
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) {
      await deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.warn('ProfileAvatarPicker: could not delete old avatar file', e);
  }
}

async function persistPickedUri(
  asset: ImagePicker.ImagePickerAsset,
  patientId?: number,
  previousUri?: string | null,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (asset.base64) {
      const mime =
        asset.mimeType && asset.mimeType.startsWith('image/')
          ? asset.mimeType
          : 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    return asset.uri ?? null;
  }

  const src = asset.uri;
  if (!src) return null;
  const base = documentDirectory;
  if (!base) return src;

  const idSegment =
    typeof patientId === 'number' && Number.isFinite(patientId) && patientId > 0
      ? String(patientId)
      : 'anonymous';
  const avatarName = `profile_avatar_${idSegment}_${Date.now()}.jpg`;
  const dest = `${base}${avatarName}`;

  try {
    // Picker crop + JPEG quality keeps avatar files small without extra dependencies.
    await copyAsync({ from: src, to: dest });
    await tryDeleteLocalFile(previousUri ?? null);
    return dest;
  } catch (e) {
    console.warn('ProfileAvatarPicker: persistPickedUri failed', e);
    return src;
  }
}

function showPermissionAlert(kind: 'photos' | 'camera') {
  const msg =
    kind === 'photos'
      ? 'Activa el acceso a tus fotos para elegir una imagen de perfil.'
      : 'Activa el acceso a la cámara para tomar una foto de perfil.';

  const buttons: { text: string; style?: 'cancel' | 'default'; onPress?: () => void }[] = [
    { text: 'Entendido', style: 'cancel' },
  ];
  if (Platform.OS !== 'web') {
    buttons.push({
      text: 'Abrir ajustes',
      onPress: () => void Linking.openSettings(),
    });
  }
  Alert.alert('Permiso requerido', msg, buttons);
}

type Props = {
  patientId?: number;
  displayName: string;
  avatarUri: string | null;
  onAvatarUriChange: (uri: string | null) => void | Promise<void>;
  avatarSize?: number;
  editButtonLabel?: string;
};

type SheetOption = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  destructive?: boolean;
  onPress: () => void;
};

export function ProfileAvatarPicker({
  patientId,
  displayName,
  avatarUri,
  onAvatarUriChange,
  avatarSize = 96,
  editButtonLabel = 'Editar perfil',
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pendingNativeActionLabel, setPendingNativeActionLabel] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [optimisticUri, setOptimisticUri] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const displayUri = optimisticUri ?? avatarUri;
  const isBusy = pendingNativeActionLabel != null || isSavingPhoto;
  const feedbackLabel = isSavingPhoto ? 'Guardando foto...' : pendingNativeActionLabel;

  const openSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetVisible(true);
    void ImagePicker.getMediaLibraryPermissionsAsync();
    void ImagePicker.getCameraPermissionsAsync();
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const runAfterSheetClose = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setPendingNativeActionLabel(label);
      setSheetVisible(false);
      await waitForNextFrame();
      try {
        await action();
      } finally {
        setPendingNativeActionLabel(null);
      }
    },
    [],
  );

  const commitAvatarChange = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      setOptimisticUri(asset.uri ?? null);
      setIsSavingPhoto(true);
      try {
        const nextUri = await persistPickedUri(asset, patientId, avatarUri);
        if (!nextUri) return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await onAvatarUriChange(nextUri);
      } finally {
        setOptimisticUri(null);
        setIsSavingPhoto(false);
      }
    },
    [avatarUri, onAvatarUriChange, patientId],
  );

  const pickImageFromLibrary = useCallback(async () => {
    try {
      let granted = false;
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (current.granted) {
        granted = true;
      } else {
        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = requested.granted;
      }
      if (!granted) {
        showPermissionAlert('photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: AVATAR_PICKER_QUALITY,
        exif: false,
        base64: Platform.OS === 'web',
        allowsMultipleSelection: false,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      await commitAvatarChange(asset);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo cargar la imagen.';
      Alert.alert('Foto de perfil', message);
    }
  }, [commitAvatarChange]);

  const takePhotoWithCamera = useCallback(async () => {
    try {
      let granted = false;
      const current = await ImagePicker.getCameraPermissionsAsync();
      if (current.granted) {
        granted = true;
      } else {
        const requested = await ImagePicker.requestCameraPermissionsAsync();
        granted = requested.granted;
      }
      if (!granted) {
        showPermissionAlert('camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: AVATAR_PICKER_QUALITY,
        exif: false,
        base64: false,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      await commitAvatarChange(asset);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo tomar la foto.';
      Alert.alert('Foto de perfil', message);
    }
  }, [commitAvatarChange]);

  const handleViewPhoto = useCallback(() => {
    closeSheet();
    setPreviewVisible(true);
  }, [closeSheet]);

  const handleDeletePhoto = useCallback(() => {
    closeSheet();
    Alert.alert(
      'Eliminar foto actual',
      'La foto se quitará solo de este dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsSavingPhoto(true);
              try {
                await tryDeleteLocalFile(avatarUri);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await onAvatarUriChange(null);
              } finally {
                setIsSavingPhoto(false);
              }
            })();
          },
        },
      ],
    );
  }, [avatarUri, closeSheet, onAvatarUriChange]);

  const sheetOptions: SheetOption[] = [];

  if (displayUri) {
    sheetOptions.push({
      key: 'view',
      label: 'Ver foto actual',
      icon: 'eye.fill',
      onPress: handleViewPhoto,
    });
  }

  sheetOptions.push(
    {
      key: 'gallery',
      label: 'Elegir de galería',
      icon: 'photo.fill',
      onPress: () => {
        void runAfterSheetClose('Abriendo galería...', pickImageFromLibrary);
      },
    },
    {
      key: 'camera',
      label: 'Tomar foto',
      icon: 'camera.fill',
      onPress: () => {
        void runAfterSheetClose('Abriendo cámara...', takePhotoWithCamera);
      },
    },
  );

  if (avatarUri) {
    sheetOptions.push({
      key: 'delete',
      label: 'Eliminar foto actual',
      icon: 'trash.fill',
      destructive: true,
      onPress: handleDeletePhoto,
    });
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openSheet}
        disabled={isBusy}
        style={({ pressed }) => pressed && styles.avatarPressed}
        accessibilityRole="button"
        accessibilityLabel={editButtonLabel}>
        <ProfileAvatarView displayName={displayName} avatarUri={displayUri} size={avatarSize} />
      </Pressable>

      <Pressable
        onPress={openSheet}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.editPill,
          pressed && styles.editPillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={editButtonLabel}>
        <Text style={styles.editPillText}>{editButtonLabel}</Text>
      </Pressable>

      {feedbackLabel ? (
        <View style={styles.feedbackChip}>
          <ActivityIndicator size="small" color={ACCENT_DARK} />
          <Text style={styles.feedbackChipText}>{feedbackLabel}</Text>
        </View>
      ) : null}

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={closeSheet}>
          <Pressable
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>Foto de perfil</Text>
            <Text style={styles.sheetSubtitle}>
              Personaliza cómo apareces en RESPIRA+.
            </Text>

            <View style={styles.optionsList}>
              {sheetOptions.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && styles.optionRowPressed,
                  ]}
                  onPress={opt.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}>
                  <View
                    style={[
                      styles.optionIconWrap,
                      opt.destructive && styles.optionIconWrapDestructive,
                    ]}>
                    <IconSymbol
                      name={opt.icon}
                      size={20}
                      color={opt.destructive ? '#B91C1C' : ACCENT_DARK}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      opt.destructive && styles.optionLabelDestructive,
                    ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.cancelSeparator} />

            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.cancelBtnPressed,
              ]}
              onPress={closeSheet}
              accessibilityRole="button"
              accessibilityLabel="Cancelar">
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {displayUri ? (
        <Modal
          visible={previewVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewVisible(false)}
          statusBarTranslucent>
          <View style={styles.previewOverlay}>
            <Pressable
              style={styles.previewCloseBtn}
              onPress={() => setPreviewVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar vista previa">
              <IconSymbol name="xmark" size={22} color="#FFFFFF" />
            </Pressable>
            <Image
              source={{ uri: displayUri }}
              style={styles.previewImage}
              contentFit="contain"
              transition={200}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  avatarPressed: {
    opacity: 0.8,
  },

  editPill: {
    marginTop: spacing.sm + 2,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDEBE9',
  },
  editPillPressed: {
    backgroundColor: '#F0F8F7',
  },
  editPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_DARK,
    letterSpacing: 0.1,
  },

  feedbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  feedbackChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },

  optionsList: {
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
  },
  optionRowPressed: {
    backgroundColor: '#F3F4F6',
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionIconWrapDestructive: {
    backgroundColor: 'rgba(185, 28, 28, 0.06)',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  optionLabelDestructive: {
    color: '#B91C1C',
  },

  cancelSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  cancelBtnPressed: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 12,
  },
});
