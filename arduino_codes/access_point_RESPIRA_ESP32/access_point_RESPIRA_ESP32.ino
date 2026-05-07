#include <WiFi.h>

const char* AP_SSID = "RESPIRA_ESP32";
const char* AP_PASSWORD = "respira123"; // mínimo 8 caracteres

IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

unsigned long lastStatusPrint = 0;
const unsigned long STATUS_INTERVAL_MS = 5000;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("RESPIRA+ Fase 1");
  Serial.println("Modo: ESP32 Access Point");
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

  Serial.println();
  Serial.println("Ahora busca la red RESPIRA_ESP32 en tu iPhone o laptop.");
  Serial.println("Es normal que diga que no tiene internet.");
}

void loop() {
  unsigned long now = millis();

  if (now - lastStatusPrint >= STATUS_INTERVAL_MS) {
    lastStatusPrint = now;

    Serial.println();
    Serial.println("---- Estado Access Point ----");
    Serial.print("SSID: ");
    Serial.println(AP_SSID);

    Serial.print("IP: ");
    Serial.println(WiFi.softAPIP());

    Serial.print("Dispositivos conectados: ");
    Serial.println(WiFi.softAPgetStationNum());
  }
}