#include <WiFi.h>
#include <WebSocketsServer.h>

const char* AP_SSID = "RESPIRA_ESP32";
const char* AP_PASSWORD = "respira123";

IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

WebSocketsServer webSocket = WebSocketsServer(81);

const unsigned long WS_SEND_INTERVAL_MS = 50;
const unsigned long STATUS_INTERVAL_MS = 5000;

unsigned long lastWsSend = 0;
unsigned long lastStatusPrint = 0;

int simulatedDistanceMm = 120;
int simulatedVolumeMl = 850;
int simulatedValidRepetitions = 0;
int simulatedSustainedTimeMs = 0;

String simulatedFlowState = "idle";
bool simulatedIsValidAttempt = false;

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

void updateSimulatedData() {
  unsigned long now = millis();
  unsigned long phase = now % 6000;

  if (phase < 1500) {
    simulatedFlowState = "inhaling";
    simulatedDistanceMm = map(phase, 0, 1500, 180, 80);
    simulatedVolumeMl = map(phase, 0, 1500, 100, 1200);
    simulatedSustainedTimeMs = 0;
    simulatedIsValidAttempt = false;
  } 
  else if (phase < 4000) {
    simulatedFlowState = "holding";
    simulatedDistanceMm = 80;
    simulatedVolumeMl = 1200;
    simulatedSustainedTimeMs = phase - 1500;
    simulatedIsValidAttempt = simulatedSustainedTimeMs >= 2000;
  } 
  else {
    simulatedFlowState = "exhaling";
    simulatedDistanceMm = map(phase, 4000, 6000, 80, 180);
    simulatedVolumeMl = map(phase, 4000, 6000, 1200, 100);
    simulatedSustainedTimeMs = 0;
    simulatedIsValidAttempt = false;
  }

  static bool countedThisCycle = false;

  if (simulatedIsValidAttempt && !countedThisCycle) {
    simulatedValidRepetitions++;
    countedThisCycle = true;
  }

  if (phase < 500) {
    countedThisCycle = false;
  }
}

void sendSimulatedJson() {
  char jsonBuffer[300];

  snprintf(
    jsonBuffer,
    sizeof(jsonBuffer),
    "{\"source\":\"simulated\",\"volumeMl\":%d,\"sustainedTimeMs\":%d,\"validRepetitions\":%d,\"distanceMm\":%d,\"flowState\":\"%s\",\"isValidAttempt\":%s,\"timestamp\":%lu}",
    simulatedVolumeMl,
    simulatedSustainedTimeMs,
    simulatedValidRepetitions,
    simulatedDistanceMm,
    simulatedFlowState.c_str(),
    simulatedIsValidAttempt ? "true" : "false",
    millis()
  );

  webSocket.broadcastTXT(jsonBuffer);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("RESPIRA+ Fase 2");
  Serial.println("Access Point + WebSocket");
  Serial.println("Datos simulados JSON");
  Serial.println("================================");

  WiFi.mode(WIFI_AP);

  bool configOk = WiFi.softAPConfig(localIP, gateway, subnet);

  if (configOk) {
    Serial.println("Configuracion de IP del AP: OK");
  } else {
    Serial.println("Configuracion de IP del AP: FALLÓ");
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

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.println();
  Serial.println("Servidor WebSocket iniciado");
  Serial.println("URL WebSocket esperada:");
  Serial.println("ws://192.168.4.1:81");
  Serial.println();
  Serial.println("Conectate a la red RESPIRA_ESP32 y prueba el WebSocket.");
}

void loop() {
  webSocket.loop();

  unsigned long now = millis();

  updateSimulatedData();

  if (now - lastWsSend >= WS_SEND_INTERVAL_MS) {
    lastWsSend = now;
    sendSimulatedJson();
  }

  if (now - lastStatusPrint >= STATUS_INTERVAL_MS) {
    lastStatusPrint = now;

    Serial.println();
    Serial.println("---- Estado Fase 2 ----");
    Serial.print("SSID: ");
    Serial.println(AP_SSID);

    Serial.print("IP: ");
    Serial.println(WiFi.softAPIP());

    Serial.print("Dispositivos WiFi conectados: ");
    Serial.println(WiFi.softAPgetStationNum());

    Serial.print("WebSocket activo en: ");
    Serial.println("ws://192.168.4.1:81");

    Serial.print("Source actual: ");
    Serial.println("simulated");
  }
}