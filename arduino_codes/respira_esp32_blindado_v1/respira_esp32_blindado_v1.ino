#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include "Adafruit_VL53L0X.h"

// ====================================================== 
// RESPIRA+ ESP32, version blindada de prototipo final
// AP local + HTTP diagnostico + WebSocket + VL53L0X
// Boton fisico D25 + LED estado D26
// ======================================================

// -------------------------
// WiFi Access Point local
// -------------------------
const char* AP_SSID = "RESPIRA_ESP32";
const char* AP_PASSWORD = "respira123";

IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// -------------------------
// Pines
// -------------------------
const int SDA_PIN = 21;
const int SCL_PIN = 22;
const int CONNECT_BUTTON_PIN = 25;
const int STATUS_LED_PIN = 26;

// -------------------------
// Servidores
// -------------------------
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);
Adafruit_VL53L0X lox = Adafruit_VL53L0X();

// -------------------------
// Tiempos del sistema
// -------------------------
const unsigned long SENSOR_READ_INTERVAL_MS = 50;        // 20 lecturas/s
const unsigned long WS_SEND_INTERVAL_MS = 100;           // 10 mensajes/s
const unsigned long STATUS_INTERVAL_MS = 5000;
const unsigned long BUTTON_DEBOUNCE_MS = 50;
const unsigned long BUTTON_LONG_PRESS_MS = 2000;
const unsigned long WAIT_APP_TIMEOUT_MS = 60000;         // 60 s esperando app
const unsigned long RECONNECT_TIMEOUT_MS = 20000;        // 20 s para reconexion
const unsigned long LED_WAITING_BLINK_MS = 500;
const unsigned long LED_ERROR_BLINK_MS = 150;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long SENSOR_RETRY_INTERVAL_MS = 5000;

// -------------------------
// Estados del dispositivo
// -------------------------
enum DeviceState {
  BOOTING,
  IDLE,
  WAITING_FOR_APP,
  STREAMING,
  ERROR_SENSOR,
  ERROR_WIFI
};

DeviceState deviceState = BOOTING;

// -------------------------
// Banderas del sistema
// -------------------------
bool sensorOk = false;
bool apOk = false;
bool servicesStarted = false;
bool waitingIsReconnect = false;

// Clientes WebSocket
const uint8_t MAX_TRACKED_WS_CLIENTS = 8;
bool wsClientConnected[MAX_TRACKED_WS_CLIENTS] = { false };
uint8_t connectedWsClients = 0;

// -------------------------
// Temporizadores
// -------------------------
unsigned long stateEnteredAt = 0;
unsigned long waitingStartedAt = 0;
unsigned long activeWaitTimeoutMs = WAIT_APP_TIMEOUT_MS;
unsigned long lastSensorRead = 0;
unsigned long lastWsSend = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastBlinkTime = 0;
unsigned long lastWifiRetry = 0;
unsigned long lastSensorRetry = 0;

// -------------------------
// Boton con debounce
// -------------------------
bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long buttonPressedAt = 0;
bool longPressHandled = false;

// -------------------------
// LED
// -------------------------
bool ledBlinkState = LOW;

// -------------------------
// Sensor
// -------------------------
int rawDistanceMm = -1;
int distanceMm = -1;
bool distanceValid = false;
bool filterInitialized = false;
float filteredDistance = 0.0;
const float FILTER_ALPHA = 0.35;

// -------------------------
// Campos compatibles con RESPIRA+
// La app conserva la logica clinica compleja.
// -------------------------
const char* source = "raw_sensor";
int volumeMl = 0;
int sustainedTimeMs = 0;
int validRepetitions = 0;
const char* flowState = "idle";
bool isValidAttempt = false;

const char DIAGNOSTIC_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RESPIRA+ Diagnostico ESP32</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f7faf9;
      color: #1f2933;
      margin: 0;
      padding: 20px;
    }

    .container {
      max-width: 820px;
      margin: 0 auto;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }

    h1 {
      margin-top: 0;
      color: #34aba5;
      font-size: 28px;
    }

    .subtitle {
      color: #5f6c72;
      margin-bottom: 20px;
    }

    .status {
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-weight: bold;
      background: #f3f4f6;
    }

    .connected {
      background: #dcfce7;
      color: #166534;
    }

    .disconnected {
      background: #fee2e2;
      color: #991b1b;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
    }

    .label {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 6px;
    }

    .value {
      font-size: 24px;
      font-weight: bold;
      word-break: break-word;
    }

    .json-box {
      margin-top: 16px;
      background: #111827;
      color: #e5e7eb;
      padding: 14px;
      border-radius: 12px;
      overflow-x: auto;
      font-size: 13px;
    }

    button {
      background: #34aba5;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: bold;
      cursor: pointer;
      margin-right: 8px;
      margin-bottom: 16px;
    }

    button.secondary {
      background: #6b7280;
    }

    @media (max-width: 620px) {
      .grid {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 24px;
      }

      .value {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>RESPIRA+ Diagnostico ESP32</h1>
    <p class="subtitle">Version blindada: con el WebSocket abierto, el ESP32 envia lecturas JSON en streaming (desde IDLE o tras CONECTAR APP). El boton fisico sirve para iniciar sesion sin app aun o para cancelar con pulsacion larga.</p>

    <button onclick="connectWs()">Conectar WebSocket</button>
    <button class="secondary" onclick="disconnectWs()">Desconectar</button>

    <div id="statusBox" class="status disconnected">
      Estado: Desconectado
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">source</div>
        <div id="source" class="value">---</div>
      </div>

      <div class="card">
        <div class="label">Frecuencia aproximada</div>
        <div class="value"><span id="hz">0</span> msg/s</div>
      </div>

      <div class="card">
        <div class="label">distanceMm filtrado</div>
        <div class="value"><span id="distanceMm">---</span> mm</div>
      </div>

      <div class="card">
        <div class="label">rawDistanceMm</div>
        <div class="value"><span id="rawDistanceMm">---</span> mm</div>
      </div>

      <div class="card">
        <div class="label">distanceValid</div>
        <div id="distanceValid" class="value">---</div>
      </div>

      <div class="card">
        <div class="label">volumeMl</div>
        <div class="value"><span id="volumeMl">---</span> mL</div>
      </div>

      <div class="card">
        <div class="label">sustainedTimeMs</div>
        <div class="value"><span id="sustainedTimeMs">---</span> ms</div>
      </div>

      <div class="card">
        <div class="label">validRepetitions</div>
        <div id="validRepetitions" class="value">---</div>
      </div>

      <div class="card">
        <div class="label">flowState</div>
        <div id="flowState" class="value">---</div>
      </div>

      <div class="card">
        <div class="label">isValidAttempt</div>
        <div id="isValidAttempt" class="value">---</div>
      </div>

      <div class="card">
        <div class="label">timestamp</div>
        <div id="timestamp" class="value">---</div>
      </div>

      <div class="card">
        <div class="label">Mensajes recibidos</div>
        <div id="count" class="value">0</div>
      </div>
    </div>

    <h2>Ultimo JSON recibido</h2>
    <pre id="jsonBox" class="json-box">Sin datos aun. Conecta el WebSocket y espera mensajes JSON del ESP32.</pre>
  </div>

  <script>
    let ws = null;
    let count = 0;
    let lastSecondCount = 0;

    function setStatus(text, connected) {
      const statusBox = document.getElementById("statusBox");
      statusBox.textContent = "Estado: " + text;
      statusBox.className = connected ? "status connected" : "status disconnected";
    }

    function connectWs() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        return;
      }

      ws = new WebSocket("ws://192.168.4.1:81");

      ws.onopen = () => {
        setStatus("WebSocket conectado. Recibiendo datos cuando el ESP32 este en streaming.", true);
      };

      ws.onmessage = (event) => {
        count++;
        document.getElementById("count").textContent = count;
        document.getElementById("jsonBox").textContent = event.data;

        try {
          const data = JSON.parse(event.data);

          document.getElementById("source").textContent = data.source ?? "---";
          document.getElementById("distanceMm").textContent = data.distanceMm ?? "---";
          document.getElementById("rawDistanceMm").textContent = data.rawDistanceMm ?? "---";
          document.getElementById("distanceValid").textContent = String(data.distanceValid);
          document.getElementById("volumeMl").textContent = data.volumeMl ?? "---";
          document.getElementById("sustainedTimeMs").textContent = data.sustainedTimeMs ?? "---";
          document.getElementById("validRepetitions").textContent = data.validRepetitions ?? "---";
          document.getElementById("flowState").textContent = data.flowState ?? "---";
          document.getElementById("isValidAttempt").textContent = String(data.isValidAttempt);
          document.getElementById("timestamp").textContent = data.timestamp ?? "---";
        } catch (error) {
          document.getElementById("jsonBox").textContent = "Error leyendo JSON: " + event.data;
        }
      };

      ws.onerror = () => {
        setStatus("Error de WebSocket", false);
      };

      ws.onclose = () => {
        setStatus("WebSocket desconectado", false);
      };
    }

    function disconnectWs() {
      if (ws) {
        ws.close();
      }
    }

    setInterval(() => {
      const currentCount = count;
      const messagesThisSecond = currentCount - lastSecondCount;
      lastSecondCount = currentCount;
      document.getElementById("hz").textContent = messagesThisSecond;
    }, 1000);

    window.addEventListener("load", () => {
      connectWs();
    });
  </script>
</body>
</html>
)rawliteral";

const char* stateToText(DeviceState state) {
  switch (state) {
    case BOOTING: return "BOOTING";
    case IDLE: return "IDLE";
    case WAITING_FOR_APP: return "WAITING_FOR_APP";
    case STREAMING: return "STREAMING";
    case ERROR_SENSOR: return "ERROR_SENSOR";
    case ERROR_WIFI: return "ERROR_WIFI";
    default: return "UNKNOWN";
  }
}

bool hasAppClient() {
  return connectedWsClients > 0;
}

void resetLedBlink() {
  ledBlinkState = LOW;
  lastBlinkTime = millis();
  digitalWrite(STATUS_LED_PIN, LOW);
}

void resetSensorValues() {
  rawDistanceMm = -1;
  distanceMm = -1;
  distanceValid = false;
  filterInitialized = false;
  filteredDistance = 0.0;
}

void enterState(DeviceState newState, const char* reason) {
  if (deviceState == newState) {
    return;
  }

  DeviceState previousState = deviceState;
  deviceState = newState;
  stateEnteredAt = millis();

  Serial.println();
  Serial.print("Cambio de estado: ");
  Serial.print(stateToText(previousState));
  Serial.print(" -> ");
  Serial.print(stateToText(newState));
  Serial.print(" | Motivo: ");
  Serial.println(reason);

  if (newState == IDLE) {
    waitingIsReconnect = false;
    resetSensorValues();
    resetLedBlink();
  }

  if (newState == WAITING_FOR_APP) {
    waitingStartedAt = millis();
    resetLedBlink();
  }

  if (newState == STREAMING) {
    waitingIsReconnect = false;
    digitalWrite(STATUS_LED_PIN, HIGH);
    ledBlinkState = HIGH;
    lastSensorRead = 0;
    lastWsSend = 0;
  }

  if (newState == ERROR_SENSOR || newState == ERROR_WIFI) {
    resetLedBlink();
  }
}

void enterWaitingForApp(unsigned long timeoutMs, bool reconnectMode, const char* reason) {
  activeWaitTimeoutMs = timeoutMs;
  waitingIsReconnect = reconnectMode;
  enterState(WAITING_FOR_APP, reason);
}

void handleRoot() {
  server.send_P(200, "text/html", DIAGNOSTIC_PAGE);
}

void handleNotFound() {
  server.send(404, "text/plain", "RESPIRA+ ESP32: ruta no encontrada");
}

void updateWsClientCount(uint8_t clientNumber, bool connected) {
  if (clientNumber >= MAX_TRACKED_WS_CLIENTS) {
    return;
  }

  if (connected && !wsClientConnected[clientNumber]) {
    wsClientConnected[clientNumber] = true;
    connectedWsClients++;
  }

  if (!connected && wsClientConnected[clientNumber]) {
    wsClientConnected[clientNumber] = false;
    if (connectedWsClients > 0) {
      connectedWsClients--;
    }
  }
}

void webSocketEvent(uint8_t clientNumber, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      updateWsClientCount(clientNumber, false);
      Serial.print("Cliente WebSocket desconectado: ");
      Serial.println(clientNumber);
      Serial.print("Clientes WebSocket activos: ");
      Serial.println(connectedWsClients);

      if (deviceState == STREAMING && !hasAppClient()) {
        enterWaitingForApp(RECONNECT_TIMEOUT_MS, true, "app desconectada, esperando reconexion");
      }
      break;

    case WStype_CONNECTED: {
      updateWsClientCount(clientNumber, true);
      IPAddress ip = webSocket.remoteIP(clientNumber);

      Serial.print("Cliente WebSocket conectado: ");
      Serial.println(clientNumber);
      Serial.print("IP del cliente: ");
      Serial.println(ip);
      Serial.print("Clientes WebSocket activos: ");
      Serial.println(connectedWsClients);

      if ((deviceState == IDLE || deviceState == WAITING_FOR_APP) && sensorOk) {
        enterState(STREAMING, "app conectada por WebSocket");
      }
      break;
    }

    case WStype_TEXT:
      Serial.print("Mensaje recibido del cliente ");
      Serial.print(clientNumber);
      Serial.print(": ");
      Serial.println((char*)payload);
      break;

    default:
      break;
  }
}

bool initSensor() {
  Serial.println("Inicializando VL53L0X...");

  if (!lox.begin()) {
    sensorOk = false;
    Serial.println("ERROR: No se detecto el VL53L0X.");
    Serial.println("Revisa VCC, GND, SDA GPIO 21 y SCL GPIO 22.");
    resetSensorValues();
    return false;
  }

  sensorOk = true;
  resetSensorValues();
  Serial.println("VL53L0X detectado correctamente.");
  return true;
}

bool startAccessPointAndServices() {
  Serial.println("Iniciando Access Point local RESPIRA+...");

  WiFi.mode(WIFI_AP);

  bool configOk = WiFi.softAPConfig(localIP, gateway, subnet);
  if (configOk) {
    Serial.println("Configuracion de IP del AP: OK");
  } else {
    Serial.println("Configuracion de IP del AP: FALLO");
  }

  bool softApOk = WiFi.softAP(AP_SSID, AP_PASSWORD);
  if (!softApOk) {
    apOk = false;
    Serial.println("ERROR: No se pudo crear el Access Point");
    return false;
  }

  apOk = true;

  Serial.println("Access Point creado correctamente");
  Serial.print("Nombre de red WiFi: ");
  Serial.println(AP_SSID);
  Serial.print("Password: ");
  Serial.println(AP_PASSWORD);
  Serial.print("IP real del ESP32: ");
  Serial.println(WiFi.softAPIP());

  if (!servicesStarted) {
    server.on("/", handleRoot);
    server.onNotFound(handleNotFound);
    server.begin();

    webSocket.begin();
    webSocket.onEvent(webSocketEvent);

    servicesStarted = true;

    Serial.println("Servidor HTTP iniciado");
    Serial.println("Pagina de diagnostico: http://192.168.4.1");
    Serial.println("Servidor WebSocket iniciado");
    Serial.println("URL WebSocket: ws://192.168.4.1:81");
  }

  return true;
}

void readVl53l0xSensor() {
  if (!sensorOk) {
    resetSensorValues();
    return;
  }

  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false);

  if (measure.RangeStatus != 4) {
    rawDistanceMm = measure.RangeMilliMeter;
    distanceValid = true;

    if (!filterInitialized) {
      filteredDistance = rawDistanceMm;
      filterInitialized = true;
    } else {
      filteredDistance = (FILTER_ALPHA * rawDistanceMm) + ((1.0 - FILTER_ALPHA) * filteredDistance);
    }

    distanceMm = (int)(filteredDistance + 0.5);
  } else {
    rawDistanceMm = -1;
    distanceMm = -1;
    distanceValid = false;
    filterInitialized = false;
  }
}

void sendRawSensorJson() {
  char jsonBuffer[380];

  snprintf(
    jsonBuffer,
    sizeof(jsonBuffer),
    "{\"source\":\"%s\",\"volumeMl\":%d,\"sustainedTimeMs\":%d,\"validRepetitions\":%d,\"distanceMm\":%d,\"rawDistanceMm\":%d,\"distanceValid\":%s,\"flowState\":\"%s\",\"isValidAttempt\":%s,\"timestamp\":%lu}",
    source,
    volumeMl,
    sustainedTimeMs,
    validRepetitions,
    distanceMm,
    rawDistanceMm,
    distanceValid ? "true" : "false",
    flowState,
    isValidAttempt ? "true" : "false",
    millis()
  );

  webSocket.broadcastTXT(jsonBuffer);
}

void handleButtonShortPress() {
  Serial.println("Boton: pulsacion corta detectada");

  if (deviceState == IDLE) {
    if (!apOk) {
      enterState(ERROR_WIFI, "no hay Access Point activo");
      return;
    }

    if (!sensorOk) {
      enterState(ERROR_SENSOR, "sensor no disponible al intentar conectar");
      return;
    }

    if (hasAppClient()) {
      enterState(STREAMING, "boton presionado y app ya estaba conectada");
    } else {
      enterWaitingForApp(WAIT_APP_TIMEOUT_MS, false, "boton presionado, esperando app");
    }
    return;
  }

  if (deviceState == ERROR_SENSOR) {
    initSensor();
    if (sensorOk) {
      enterState(IDLE, "sensor recuperado por intento manual");
    }
    return;
  }

  if (deviceState == ERROR_WIFI) {
    startAccessPointAndServices();
    if (apOk) {
      enterState(sensorOk ? IDLE : ERROR_SENSOR, "WiFi recuperado por intento manual");
    }
    return;
  }

  Serial.println("Pulsacion corta ignorada en este estado para evitar cambios accidentales.");
}

void handleButtonLongPress() {
  Serial.println("Boton: pulsacion larga detectada");

  if (deviceState == WAITING_FOR_APP || deviceState == STREAMING) {
    enterState(IDLE, "conexion cancelada por pulsacion larga");
    return;
  }

  if (deviceState == ERROR_SENSOR) {
    initSensor();
    if (sensorOk) {
      enterState(IDLE, "sensor recuperado por pulsacion larga");
    }
    return;
  }

  if (deviceState == ERROR_WIFI) {
    startAccessPointAndServices();
    if (apOk) {
      enterState(sensorOk ? IDLE : ERROR_SENSOR, "WiFi recuperado por pulsacion larga");
    }
    return;
  }
}

void handleButton() {
  unsigned long now = millis();
  bool currentReading = digitalRead(CONNECT_BUTTON_PIN);

  if (currentReading != lastButtonReading) {
    lastDebounceTime = now;
  }

  if ((now - lastDebounceTime) > BUTTON_DEBOUNCE_MS) {
    if (currentReading != stableButtonState) {
      stableButtonState = currentReading;

      if (stableButtonState == LOW) {
        buttonPressedAt = now;
        longPressHandled = false;
      } else {
        unsigned long pressDuration = now - buttonPressedAt;
        if (!longPressHandled && pressDuration < BUTTON_LONG_PRESS_MS) {
          handleButtonShortPress();
        }
      }
    }
  }

  if (stableButtonState == LOW && !longPressHandled) {
    if (now - buttonPressedAt >= BUTTON_LONG_PRESS_MS) {
      longPressHandled = true;
      handleButtonLongPress();
    }
  }

  lastButtonReading = currentReading;
}

void updateStatusLed() {
  unsigned long now = millis();

  switch (deviceState) {
    case BOOTING:
    case IDLE:
      digitalWrite(STATUS_LED_PIN, LOW);
      break;

    case WAITING_FOR_APP:
      if (now - lastBlinkTime >= LED_WAITING_BLINK_MS) {
        lastBlinkTime = now;
        ledBlinkState = !ledBlinkState;
        digitalWrite(STATUS_LED_PIN, ledBlinkState);
      }
      break;

    case STREAMING:
      digitalWrite(STATUS_LED_PIN, HIGH);
      break;

    case ERROR_SENSOR:
    case ERROR_WIFI:
      if (now - lastBlinkTime >= LED_ERROR_BLINK_MS) {
        lastBlinkTime = now;
        ledBlinkState = !ledBlinkState;
        digitalWrite(STATUS_LED_PIN, ledBlinkState);
      }
      break;
  }
}

void updateConnectionState() {
  unsigned long now = millis();

  if (deviceState == WAITING_FOR_APP) {
    if (sensorOk && hasAppClient()) {
      enterState(STREAMING, "cliente WebSocket ya disponible");
      return;
    }

    if (now - waitingStartedAt >= activeWaitTimeoutMs) {
      if (waitingIsReconnect) {
        enterState(IDLE, "timeout de reconexion, vuelve a IDLE");
      } else {
        enterState(IDLE, "timeout esperando app, vuelve a IDLE");
      }
    }
  }

  if (deviceState == STREAMING && !hasAppClient()) {
    enterWaitingForApp(RECONNECT_TIMEOUT_MS, true, "sin clientes WebSocket activos");
  }
}

void updateSensor() {
  unsigned long now = millis();

  if (deviceState == WAITING_FOR_APP || deviceState == STREAMING) {
    if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
      lastSensorRead = now;
      readVl53l0xSensor();
    }
  }
}

void updateWebSocketStreaming() {
  unsigned long now = millis();

  if (deviceState == STREAMING && sensorOk && hasAppClient()) {
    if (now - lastWsSend >= WS_SEND_INTERVAL_MS) {
      lastWsSend = now;
      sendRawSensorJson();
    }
  }
}

void retryErrorsIfNeeded() {
  unsigned long now = millis();

  if (deviceState == ERROR_WIFI && now - lastWifiRetry >= WIFI_RETRY_INTERVAL_MS) {
    lastWifiRetry = now;
    Serial.println("Reintentando levantar Access Point...");
    startAccessPointAndServices();
    if (apOk) {
      enterState(sensorOk ? IDLE : ERROR_SENSOR, "Access Point recuperado automaticamente");
    }
  }

  if (deviceState == ERROR_SENSOR && now - lastSensorRetry >= SENSOR_RETRY_INTERVAL_MS) {
    lastSensorRetry = now;
    Serial.println("Reintentando inicializar VL53L0X...");
    initSensor();
    if (sensorOk) {
      enterState(apOk ? IDLE : ERROR_WIFI, "sensor recuperado automaticamente");
    }
  }
}

void printStatus() {
  unsigned long now = millis();

  if (now - lastStatusPrint < STATUS_INTERVAL_MS) {
    return;
  }

  lastStatusPrint = now;

  Serial.println();
  Serial.println("---- Estado RESPIRA+ ESP32 blindado ----");

  Serial.print("Estado: ");
  Serial.println(stateToText(deviceState));

  Serial.print("AP local: ");
  Serial.println(apOk ? "OK" : "ERROR");

  Serial.print("SSID: ");
  Serial.println(AP_SSID);

  Serial.print("IP: ");
  Serial.println(WiFi.softAPIP());

  Serial.print("Dispositivos WiFi conectados al AP: ");
  Serial.println(WiFi.softAPgetStationNum());

  Serial.print("Clientes WebSocket activos: ");
  Serial.println(connectedWsClients);

  Serial.print("Sensor VL53L0X: ");
  Serial.println(sensorOk ? "OK" : "ERROR");

  Serial.print("rawDistanceMm: ");
  if (rawDistanceMm >= 0) {
    Serial.print(rawDistanceMm);
    Serial.println(" mm");
  } else {
    Serial.println("fuera_de_rango o sin lectura");
  }

  Serial.print("distanceMm filtrado: ");
  if (distanceValid) {
    Serial.print(distanceMm);
    Serial.println(" mm");
  } else {
    Serial.println("fuera_de_rango o sin lectura");
  }

  if (deviceState == WAITING_FOR_APP) {
    unsigned long elapsed = now - waitingStartedAt;
    unsigned long remaining = elapsed >= activeWaitTimeoutMs ? 0 : activeWaitTimeoutMs - elapsed;
    Serial.print("Tiempo restante de espera: ");
    Serial.print(remaining / 1000);
    Serial.println(" s");
  }

  Serial.print("Pagina diagnostico: ");
  Serial.println("http://192.168.4.1");

  Serial.print("WebSocket: ");
  Serial.println("ws://192.168.4.1:81");
}

void setup() {
  // El LED de estado se apaga inmediatamente al arrancar.
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  pinMode(CONNECT_BUTTON_PIN, INPUT_PULLUP);

  Serial.begin(115200);

  Serial.println();
  Serial.println("============================================");
  Serial.println("RESPIRA+ ESP32 blindado");
  Serial.println("AP local + WebSocket + VL53L0X + boton + LED");
  Serial.println("Boton CONECTAR APP: GPIO 25");
  Serial.println("LED estado: GPIO 26");
  Serial.println("============================================");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  bool sensorInitOk = initSensor();
  bool wifiInitOk = startAccessPointAndServices();

  if (!wifiInitOk) {
    enterState(ERROR_WIFI, "fallo inicial del Access Point");
    return;
  }

  if (!sensorInitOk) {
    enterState(ERROR_SENSOR, "fallo inicial del sensor");
    return;
  }

  enterState(IDLE, "arranque correcto, listo para WebSocket o boton fisico");

  Serial.println();
  Serial.println("Modo inicial: IDLE");
  Serial.println("LED de estado apagado.");
  Serial.println("Conectate a RESPIRA_ESP32 y abre la app o http://192.168.4.1");
  Serial.println("Si la app abre ws://192.168.4.1:81, se envian lecturas JSON mientras haya cliente (sensor OK).");
  Serial.println("El boton CONECTAR APP inicia sesion si aun no hay WebSocket; pulsacion larga cancela streaming.");
}

void loop() {
  if (servicesStarted) {
    server.handleClient();
    webSocket.loop();
  }

  handleButton();
  updateConnectionState();
  updateSensor();
  updateWebSocketStreaming();
  updateStatusLed();
  retryErrorsIfNeeded();
  printStatus();
}
