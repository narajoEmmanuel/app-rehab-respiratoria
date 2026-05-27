#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include "Adafruit_VL53L0X.h"

// =========================
// RESPIRA+ Fase 3D.2
// AP + HTTP diagnostico + WebSocket + VL53L0X real + trazabilidad metrológica
// =========================

const char* FIRMWARE_VERSION = "respira-fw-0.6.0";
const char* DEVICE_ID = "RESPIRA-ESP32-001";
const char* FILTER_LABEL = "ema_0.35";

const char* AP_SSID = "RESPIRA_ESP32";
const char* AP_PASSWORD = "respira123";

IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

const int SDA_PIN = 21;
const int SCL_PIN = 22;

WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

// Ajuste estable inicial
const unsigned long SENSOR_READ_INTERVAL_MS = 50;   // 20 lecturas/s
const unsigned long WS_SEND_INTERVAL_MS = 100;      // 10 mensajes/s
const unsigned long STATUS_INTERVAL_MS = 5000;

unsigned long lastSensorRead = 0;
unsigned long lastWsSend = 0;
unsigned long lastStatusPrint = 0;

// Sensor
int rawDistanceMm = -1;
int distanceMm = -1;
bool sensorOk = false;
bool distanceValid = false;
const char* sensorStatus = "initializing";
unsigned long sampleCount = 0;

// Filtro suave
bool filterInitialized = false;
float filteredDistance = 0.0;
const float FILTER_ALPHA = 0.35;

// Campos compatibles con RESPIRA+
const char* source = "vl53l0x";
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
    <p class="subtitle">Fase 5.5: datos reales del VL53L0X con envío estable y suavizado básico.</p>

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
        setStatus("Conectado a ws://192.168.4.1:81", true);
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

void handleRoot() {
  server.send_P(200, "text/html", DIAGNOSTIC_PAGE);
}

void handleNotFound() {
  server.send(404, "text/plain", "RESPIRA+ ESP32: ruta no encontrada");
}

void webSocketEvent(uint8_t clientNumber, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.print("Cliente WebSocket desconectado: ");
      Serial.println(clientNumber);
      break;

    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(clientNumber);
      Serial.print("Cliente WebSocket conectado: ");
      Serial.println(clientNumber);
      Serial.print("IP del cliente: ");
      Serial.println(ip);
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

void readVl53l0xSensor() {
  if (!sensorOk) {
    rawDistanceMm = -1;
    distanceMm = -1;
    distanceValid = false;
    sensorStatus = "error";
    return;
  }

  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false);

  if (measure.RangeStatus != 4) {
    rawDistanceMm = measure.RangeMilliMeter;
    distanceValid = true;
    sensorStatus = "ok";
    sampleCount++;

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
    sensorStatus = "out_of_range";
  }
}

void sendRawSensorJson() {
  char jsonBuffer[512];
  unsigned long now = millis();

  snprintf(
    jsonBuffer,
    sizeof(jsonBuffer),
    "{\"source\":\"%s\",\"deviceId\":\"%s\",\"firmwareVersion\":\"%s\","
    "\"timestampMs\":%lu,\"timestamp\":%lu,"
    "\"rawDistanceMm\":%d,\"distanceMm\":%d,\"distanceValid\":%s,"
    "\"sensorStatus\":\"%s\",\"sampleCount\":%lu,\"filter\":\"%s\","
    "\"volumeMl\":%d,\"sustainedTimeMs\":%d,\"validRepetitions\":%d,"
    "\"flowState\":\"%s\",\"isValidAttempt\":%s}",
    source, DEVICE_ID, FIRMWARE_VERSION,
    now, now,
    rawDistanceMm, distanceMm, distanceValid ? "true" : "false",
    sensorStatus, sampleCount, FILTER_LABEL,
    volumeMl, sustainedTimeMs, validRepetitions,
    flowState, isValidAttempt ? "true" : "false"
  );

  webSocket.broadcastTXT(jsonBuffer);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("RESPIRA+ Fase 3D.2");
  Serial.print("Firmware: "); Serial.println(FIRMWARE_VERSION);
  Serial.print("Device:   "); Serial.println(DEVICE_ID);
  Serial.println("VL53L0X real + WebSocket + trazabilidad");
  Serial.println("Lectura: 50 ms | Envio: 100 ms");
  Serial.print("Source: "); Serial.println(source);
  Serial.println("================================");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  Serial.println("Inicializando VL53L0X...");

  if (!lox.begin()) {
    sensorOk = false;
    sensorStatus = "error";
    Serial.println("ERROR: No se detecto el VL53L0X.");
    Serial.println("Revisa VCC, GND, SDA GPIO 21 y SCL GPIO 22.");
    Serial.println("Continuando sin sensor (modo degradado)...");
  } else {
    sensorOk = true;
    sensorStatus = "ok";
    Serial.println("VL53L0X detectado correctamente.");
  }

  WiFi.mode(WIFI_AP);

  bool configOk = WiFi.softAPConfig(localIP, gateway, subnet);

  if (configOk) {
    Serial.println("Configuracion de IP del AP: OK");
  } else {
    Serial.println("Configuracion de IP del AP: FALLO");
  }

  bool apOk = WiFi.softAP(AP_SSID, AP_PASSWORD);

  if (apOk) {
    Serial.println("Access Point creado correctamente");
  } else {
    Serial.println("ERROR: No se pudo crear el Access Point");
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
  Serial.println("Servidor HTTP iniciado");
  Serial.println("Pagina de diagnostico:");
  Serial.println("http://192.168.4.1");

  Serial.println();
  Serial.println("Servidor WebSocket iniciado");
  Serial.println("URL WebSocket:");
  Serial.println("ws://192.168.4.1:81");

  Serial.println();
  Serial.println("Conectate a RESPIRA_ESP32 y abre http://192.168.4.1");
}

void loop() {
  server.handleClient();
  webSocket.loop();

  unsigned long now = millis();

  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = now;
    readVl53l0xSensor();
  }

  if (now - lastWsSend >= WS_SEND_INTERVAL_MS) {
    lastWsSend = now;
    sendRawSensorJson();
  }

  if (now - lastStatusPrint >= STATUS_INTERVAL_MS) {
    lastStatusPrint = now;

    Serial.println();
    Serial.println("---- Estado Fase 3D.2 ----");

    Serial.print("Firmware: "); Serial.println(FIRMWARE_VERSION);
    Serial.print("DeviceId: "); Serial.println(DEVICE_ID);

    Serial.print("Sensor VL53L0X: ");
    Serial.println(sensorOk ? "OK" : "ERROR");

    Serial.print("sensorStatus: ");
    Serial.println(sensorStatus);

    Serial.print("sampleCount: ");
    Serial.println(sampleCount);

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

    Serial.print("Source: "); Serial.println(source);
    Serial.print("Filter: "); Serial.println(FILTER_LABEL);
  }
}