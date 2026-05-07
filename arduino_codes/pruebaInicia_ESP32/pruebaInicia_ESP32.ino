void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("RESPIRA+ Fase 0");
  Serial.println("ESP32 programado correctamente");
  Serial.println("Serial Monitor funcionando a 115200 baudios");
}

void loop() {
  Serial.println("ESP32 vivo");
  delay(1000);
}