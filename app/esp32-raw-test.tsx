/**
 * Diagnóstico: WebSocket crudo al ESP32 sin `useEsp32WebSocketSensor` ni `parseSensorMessage`.
 * No autoconecta ni reconecta; acceso por ruta `/esp32-raw-test`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_WS_URL = 'ws://192.168.4.1:81';
const MPS_WINDOW_MS = 5000;
const MAX_RAW_PREVIEW = 360;

type RawTestStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

type Esp32RawSnapshot = {
  source?: string;
  distanceMm?: number;
  rawDistanceMm?: number;
  distanceValid?: boolean;
  timestamp?: number;
};

function statusLabel(status: RawTestStatus): string {
  switch (status) {
    case 'idle':
      return 'idle';
    case 'connecting':
      return 'connecting';
    case 'connected':
      return 'connected';
    case 'error':
      return 'error';
    case 'disconnected':
      return 'disconnected';
    default:
      return status;
  }
}

function formatNumber(value: number | undefined, suffix = ''): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value}${suffix}`;
}

function formatBoolean(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'true' : 'false';
}

function truncate(raw: string | null, max = MAX_RAW_PREVIEW): string {
  if (!raw) return '—';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}…`;
}

export default function Esp32RawTestRoute() {
  const [url, setUrl] = useState(DEFAULT_WS_URL);
  const [status, setStatus] = useState<RawTestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closeCode, setCloseCode] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [messagesPerSecond, setMessagesPerSecond] = useState(0);
  const [lastRawMessage, setLastRawMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Esp32RawSnapshot>({});

  const socketRef = useRef<WebSocket | null>(null);
  const messageTimestampsRef = useRef<number[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const existing = socketRef.current;
      if (existing) {
        try {
          existing.onopen = null;
          existing.onmessage = null;
          existing.onerror = null;
          existing.onclose = null;
          existing.close();
        } catch {
          // Silenciar errores de cierre al desmontar.
        }
        socketRef.current = null;
      }
    };
  }, []);

  const recordMessage = useCallback((rawData: string) => {
    if (!isMountedRef.current) return;
    const now = Date.now();
    const buffer = messageTimestampsRef.current;
    buffer.push(now);
    while (buffer.length > 0 && now - buffer[0] > MPS_WINDOW_MS) {
      buffer.shift();
    }
    const windowSeconds = MPS_WINDOW_MS / 1000;
    setMessageCount((prev) => prev + 1);
    setMessagesPerSecond(Number((buffer.length / windowSeconds).toFixed(1)));
    setLastRawMessage(rawData);

    try {
      const parsed = JSON.parse(rawData) as Record<string, unknown>;
      setSnapshot({
        source: typeof parsed.source === 'string' ? parsed.source : undefined,
        distanceMm:
          typeof parsed.distanceMm === 'number' && Number.isFinite(parsed.distanceMm)
            ? parsed.distanceMm
            : undefined,
        rawDistanceMm:
          typeof parsed.rawDistanceMm === 'number' && Number.isFinite(parsed.rawDistanceMm)
            ? parsed.rawDistanceMm
            : undefined,
        distanceValid: typeof parsed.distanceValid === 'boolean' ? parsed.distanceValid : undefined,
        timestamp:
          typeof parsed.timestamp === 'number' && Number.isFinite(parsed.timestamp)
            ? parsed.timestamp
            : undefined,
      });
    } catch {
      // Mantener el snapshot anterior si el JSON no parsea.
    }
  }, []);

  const onConnect = useCallback(() => {
    if (typeof WebSocket === 'undefined') {
      setStatus('error');
      setErrorMessage('WebSocket no disponible en este entorno.');
      return;
    }

    const existing = socketRef.current;
    if (existing) {
      const state = existing.readyState;
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        return;
      }
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setStatus('error');
      setErrorMessage('La URL no puede estar vacía.');
      return;
    }

    setStatus('connecting');
    setErrorMessage(null);
    setCloseCode(null);
    setCloseReason(null);
    setMessageCount(0);
    setMessagesPerSecond(0);
    setLastRawMessage(null);
    setSnapshot({});
    messageTimestampsRef.current = [];

    let socket: WebSocket;
    try {
      socket = new WebSocket(trimmedUrl);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Error desconocido al crear WebSocket.';
      setStatus('error');
      setErrorMessage(message);
      return;
    }

    socketRef.current = socket;

    socket.onopen = () => {
      if (!isMountedRef.current) return;
      if (socketRef.current !== socket) return;
      setStatus('connected');
      setErrorMessage(null);
    };

    socket.onmessage = (event) => {
      if (!isMountedRef.current) return;
      if (socketRef.current !== socket) return;
      if (typeof event.data !== 'string') return;
      setStatus('connected');
      recordMessage(event.data);
    };

    socket.onerror = () => {
      if (!isMountedRef.current) return;
      if (socketRef.current !== socket) return;
      setStatus('error');
      setErrorMessage('Error en la conexión WebSocket (sin detalle del navegador).');
    };

    socket.onclose = (event) => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      if (!isMountedRef.current) return;
      setCloseCode(typeof event.code === 'number' ? event.code : null);
      setCloseReason(
        typeof event.reason === 'string' && event.reason.length > 0 ? event.reason : null
      );
      setStatus((prev) => (prev === 'error' ? prev : 'disconnected'));
    };
  }, [recordMessage, url]);

  const onDisconnect = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) {
      setStatus('disconnected');
      return;
    }
    try {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(1000, 'manual disconnect');
    } catch {
      // Silenciar errores de cierre.
    }
    setStatus('disconnected');
  }, []);

  const onReset = useCallback(() => {
    setMessageCount(0);
    setMessagesPerSecond(0);
    setLastRawMessage(null);
    setSnapshot({});
    setErrorMessage(null);
    setCloseCode(null);
    setCloseReason(null);
    messageTimestampsRef.current = [];
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        <Text style={styles.title}>ESP32 Raw WebSocket Test</Text>
        <Text style={styles.subtitle}>
          Conexión directa con `new WebSocket(url)`. Sin parseSensorMessage, sin mocks, sin reconexión.
        </Text>

        <Text style={styles.label}>URL WebSocket</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          placeholder={DEFAULT_WS_URL}
        />

        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={onConnect}
            accessibilityRole="button">
            <Text style={styles.btnPrimaryText}>Conectar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
            onPress={onDisconnect}
            accessibilityRole="button">
            <Text style={styles.btnSecondaryText}>Desconectar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
            onPress={onReset}
            accessibilityRole="button">
            <Text style={styles.btnGhostText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado</Text>
          <KeyValue k="status" v={statusLabel(status)} />
          <KeyValue k="url" v={url || '—'} />
          <KeyValue k="error" v={errorMessage ?? '—'} />
          <KeyValue k="close.code" v={closeCode === null ? '—' : String(closeCode)} />
          <KeyValue k="close.reason" v={closeReason ?? '—'} />
          <KeyValue k="messages" v={`${messageCount} (${messagesPerSecond.toFixed(1)} mps)`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Último JSON parseado</Text>
          <KeyValue k="source" v={snapshot.source ?? '—'} />
          <KeyValue k="distanceMm" v={formatNumber(snapshot.distanceMm, ' mm')} />
          <KeyValue k="rawDistanceMm" v={formatNumber(snapshot.rawDistanceMm, ' mm')} />
          <KeyValue k="distanceValid" v={formatBoolean(snapshot.distanceValid)} />
          <KeyValue k="timestamp" v={formatNumber(snapshot.timestamp)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Último mensaje crudo</Text>
          <Text style={styles.json} selectable>
            {truncate(lastRawMessage)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvValue} selectable>
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1220' },
  scroll: { padding: 20, paddingBottom: 64 },
  title: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 20, lineHeight: 18 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#052e16', fontWeight: '800', fontSize: 14 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: { color: '#F8FAFC', fontWeight: '700', fontSize: 14 },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: { color: '#94A3B8', fontWeight: '700', fontSize: 14 },
  btnPressed: { opacity: 0.85 },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  kvKey: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  kvValue: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  json: {
    fontSize: 12,
    color: '#E2E8F0',
    fontFamily: 'monospace',
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    lineHeight: 16,
  },
});
