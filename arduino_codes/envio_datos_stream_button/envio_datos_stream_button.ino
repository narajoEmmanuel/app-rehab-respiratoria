#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include "Adafruit_VL53L0X.h"

// =========================
// RESPIRA+ ESP32
// AP + HTTP diagnóstico + WebSocket + VL53L0X
// Streaming controlado por botón rojo GPIO26
// LED azul GPIO27
// =========================

// -------------------------
// WiFi Access Point
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

const int CONNECT_BUTTON_PIN = 26;  // Botón rojo
const int BLUE_LED_PIN = 27;        // LED azul

// -------------------------
// Tiempos
// -------------------------
const unsigned long SENSOR_READ_INTERVAL_MS = 50;   // 20 lecturas/s
const unsigned long WS_SEND_INTERVAL_MS = 100;      // 10 mensajes/s
const unsigned long STATUS_INTERVAL_MS = 5000;

const unsigned long DEBOUNCE_MS = 50;
const unsigned long BLINK_INTERVAL_MS = 500;

// -------------------------
// Servidores
// -------------------------
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// -------------------------
// Sensor VL53L0X
// -------------------------
Adafruit_VL53L0X lox = Adafruit_VL53L0X();

bool sensorOk = false;
bool distanceValid = false;

int rawDistanceMm = -1;
int distanceMm = -1;

// Filtro suave
bool filterInitialized = false;
float filteredDistance = 0.0;
const float FILTER_ALPHA = 0.35;

// -------------------------
// Timers
// -------------------------
unsigned long lastSensorRead = 0;
unsigned long lastWsSend = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastSendLogPrint = 0;

const unsigned long SEND_LOG_INTERVAL_MS = 1000;

// -------------------------
// Streaming + botón + LED
// -------------------------
bool streamingEnabled = false;
int connectedClients = 0;

bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;
bool buttonPressHandled = false;

bool blueLedBlinkState = LOW;
unsigned long lastBlinkTime = 0;

// -------------------------
// Campos compatibles con Respira+
// -------------------------
const char* source = "raw_sensor";
int volumeMl = 0;
int sustainedTimeMs = 0;
int validRepetitions = 0;
const char* flowState = "idle";
bool isValidAttempt = false;

// -------------------------
// Página diagnóstico
// -------------------------
const char DIAGNOSTIC_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RESPIRA+ Diagnóstico ESP32</title>
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
    <h1>RESPIRA+ Diagnóstico ESP32</h1>
    <p class="subtitle">
      Datos reales del VL53L0X. El ESP32 solo transmite cuando se activa el botón físico.
    </p>

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

    <h2>Último JSON recibido</h2>
    <pre id="jsonBox" class="json-box">Sin datos</pre>
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
        setStatus("Conectado a ws://192.168.4.1:81. Presiona el botón físico para transmitir.", true);
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
        setStatus("Desconectado", false);
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

// -------------------------
// HTTP handlers
// -------------------------
void handleRoot() {
  server.send_P(200, "text/html", DIAGNOSTIC_PAGE);
}

void handleNotFound() {
  server.send(404, "text/plain", "RESPIRA+ ESP32: ruta no encontrada");
}

// -------------------------
// Botón físico: toggle streaming (un toggle por pulsación)
// -------------------------
void setStreamingEnabled(bool enabled) {
  if (streamingEnabled == enabled) {
    return;
  }

  streamingEnabled = enabled;
  lastWsSend = millis();

  if (streamingEnabled) {
    Serial.println("Streaming ON");
    lastBlinkTime = millis();
    blueLedBlinkState = LOW;
  } else {
    Serial.println("Streaming OFF - envio bloqueado");
    digitalWrite(BLUE_LED_PIN, LOW);
    blueLedBlinkState = LOW;
    lastBlinkTime = millis();
  }
}

const char* ledModeToText() {
  if (!streamingEnabled) {
    return "OFF";
  }
  if (connectedClients <= 0) {
    return "BLINK_WAITING_WS";
  }
  return "SOLID_TRANSMITTING";
}

void handleStreamButton() {
  bool currentReading = digitalRead(CONNECT_BUTTON_PIN);

  if (currentReading != lastButtonReading) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    if (currentReading != stableButtonState) {
      stableButtonState = currentReading;

      // INPUT_PULLUP:
      // HIGH = no presionado
      // LOW = presionado
      if (stableButtonState == LOW) {
        if (!buttonPressHandled) {
          buttonPressHandled = true;
          Serial.println("BOTON PRESIONADO");
          setStreamingEnabled(!streamingEnabled);
        }
      } else {
        buttonPressHandled = false;
      }
    }
  }

  lastButtonReading = currentReading;
}

// -------------------------
// LED azul (solo streamingEnabled + connectedClients WebSocket)
// -------------------------
void updateBlueLed() {
  if (!streamingEnabled) {
    digitalWrite(BLUE_LED_PIN, LOW);
    blueLedBlinkState = LOW;
    return;
  }

  if (connectedClients <= 0) {
    if (millis() - lastBlinkTime >= BLINK_INTERVAL_MS) {
      lastBlinkTime = millis();
      blueLedBlinkState = !blueLedBlinkState;
      digitalWrite(BLUE_LED_PIN, blueLedBlinkState);
    }
    return;
  }

  digitalWrite(BLUE_LED_PIN, HIGH);
}

// -------------------------
// WebSocket events
// -------------------------
void webSocketEvent(uint8_t clientNumber, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      if (connectedClients > 0) {
        connectedClients--;
      }

      Serial.print("WStype_DISCONNECTED cliente ");
      Serial.println(clientNumber);

      Serial.print("connectedClients: ");
      Serial.println(connectedClients);
      break;

    case WStype_CONNECTED: {
      connectedClients++;

      IPAddress ip = webSocket.remoteIP(clientNumber);

      Serial.print("WStype_CONNECTED cliente ");
      Serial.println(clientNumber);

      Serial.print("IP del cliente: ");
      Serial.println(ip);

      Serial.print("connectedClients: ");
      Serial.println(connectedClients);
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

// -------------------------
// Lectura del sensor
// -------------------------
void readVl53l0xSensor() {
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
    distanceValid = false;
  }
}

// -------------------------
// JSON compatible con app
// Único punto de salida WebSocket del sensor (protegido por streaming)
// -------------------------
void sendRawSensorJson() {
  if (!streamingEnabled || connectedClients <= 0) {
    return;
  }

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

  unsigned long now = millis();
  if (now - lastSendLogPrint >= SEND_LOG_INTERVAL_MS) {
    lastSendLogPrint = now;
    Serial.println("Enviando datos...");
  }
}

// -------------------------
// Setup
// -------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("RESPIRA+ ESP32");
  Serial.println("VL53L0X real + WebSocket");
  Serial.println("Streaming controlado por boton fisico");
  Serial.println("Boton rojo: GPIO26");
  Serial.println("LED azul: GPIO27");
  Serial.println("================================");

  pinMode(CONNECT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BLUE_LED_PIN, OUTPUT);
  digitalWrite(BLUE_LED_PIN, LOW);

  Serial.println("Boton rojo configurado con INPUT_PULLUP.");
  Serial.println("LED azul configurado.");
  Serial.println("Streaming inicia apagado.");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  Serial.println("Inicializando VL53L0X...");

  if (!lox.begin()) {
    sensorOk = false;
    Serial.println("ERROR: No se detecto el VL53L0X.");
    Serial.println("Revisa VCC, GND, SDA GPIO21 y SCL GPIO22.");

    while (true) {
      delay(1000);
    }
  }

  sensorOk = true;
  Serial.println("VL53L0X detectado correctamente.");

  WiFi.mode(WIFI_AP);

  bool configOk = WiFi.softAPConfig(localIP, gateway, subnet);

  if (configOk) {
    Serial.println("Configuracion de IP del AP: OK");
  } else {
    Serial.println("Configuracion de IP del AP: FALLO");
  }

  bool apOk = WiFi.softAP(AP_SSID, AP_PASSWORD);

  if (apOk) {
    Serial.println("Access Point creado correctamente.");
  } else {
    Serial.println("ERROR: No se pudo crear el Access Point.");
  }

  Serial.print("Nombre de red WiFi: ");
  Serial.println(AP_SSID);

  Serial.print("Password: ");
  Serial.println(AP_PASSWORD);

  Serial.print("IP real del ESP32: ");
  Serial.println(WiFi.softAPIP());

  server.on("/", handleRoot);
  server.onNotFound(handleNotFound);
  server.begin();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.println();
  Serial.println("Servidor HTTP iniciado.");
  Serial.println("Pagina de diagnostico:");
  Serial.println("http://192.168.4.1");

  Serial.println();
  Serial.println("Servidor WebSocket iniciado.");
  Serial.println("URL WebSocket:");
  Serial.println("ws://192.168.4.1:81");

  Serial.println();
  Serial.println("Conectate a RESPIRA_ESP32 y abre http://192.168.4.1");
  Serial.println("Streaming desactivado al encender.");
  Serial.println("Presiona el boton rojo para activar/desactivar envio de datos.");
}

// -------------------------
// Loop
// -------------------------
void loop() {
  server.handleClient();
  webSocket.loop();

  handleStreamButton();
  updateBlueLed();

  unsigned long now = millis();

  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = now;
    readVl53l0xSensor();
  }

  if (streamingEnabled && connectedClients > 0 && now - lastWsSend >= WS_SEND_INTERVAL_MS) {
    lastWsSend = now;
    sendRawSensorJson();
  }

  if (now - lastStatusPrint >= STATUS_INTERVAL_MS) {
    lastStatusPrint = now;

    Serial.println();
    Serial.println("---- Estado RESPIRA+ ESP32 ----");

    Serial.print("Sensor VL53L0X: ");
    Serial.println(sensorOk ? "OK" : "ERROR");

    Serial.print("rawDistanceMm: ");
    if (rawDistanceMm >= 0) {
      Serial.print(rawDistanceMm);
      Serial.println(" mm");
    } else {
      Serial.println("fuera_de_rango");
    }

    Serial.print("distanceMm filtrado: ");
    if (distanceValid) {
      Serial.print(distanceMm);
      Serial.println(" mm");
    } else {
      Serial.println("fuera_de_rango");
    }

    Serial.print("SSID: ");
    Serial.println(AP_SSID);

    Serial.print("IP: ");
    Serial.println(WiFi.softAPIP());

    Serial.print("Dispositivos WiFi conectados: ");
    Serial.println(WiFi.softAPgetStationNum());

    Serial.print("connectedClients (WebSocket): ");
    Serial.println(connectedClients);

    Serial.print("streamingEnabled: ");
    Serial.println(streamingEnabled ? "SI" : "NO");

    Serial.print("LED mode: ");
    Serial.println(ledModeToText());

    Serial.print("lastWsSend (ms desde boot): ");
    Serial.println(lastWsSend);

    Serial.print("Pagina diagnostico: ");
    Serial.println("http://192.168.4.1");

    Serial.print("WebSocket: ");
    Serial.println("ws://192.168.4.1:81");

    Serial.print("Source actual: ");
    Serial.println(source);
  }
}
