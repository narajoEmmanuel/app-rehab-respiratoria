#include <Wire.h>
#include "Adafruit_VL53L0X.h"

const int SDA_PIN = 21;
const int SCL_PIN = 22;

const unsigned long READ_INTERVAL_MS = 100;

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

unsigned long lastReadMs = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("RESPIRA+ Fase 4B");
  Serial.println("Lectura real VL53L0X");
  Serial.println("================================");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  Serial.println("Inicializando VL53L0X...");

  if (!lox.begin()) {
    Serial.println("ERROR: No se detecto el VL53L0X.");
    Serial.println("Revisa VCC, GND, SDA y SCL.");
    Serial.println("Direccion esperada: 0x29");
    while (true) {
      delay(1000);
    }
  }

  Serial.println("VL53L0X detectado correctamente.");
  Serial.println("Mueve un objeto frente al sensor para ver distanceMm.");
}

void loop() {
  unsigned long now = millis();

  if (now - lastReadMs >= READ_INTERVAL_MS) {
    lastReadMs = now;

    VL53L0X_RangingMeasurementData_t measure;
    lox.rangingTest(&measure, false);

    Serial.print("timestamp: ");
    Serial.print(now);
    Serial.print(" ms | ");

    if (measure.RangeStatus != 4) {
      Serial.print("distanceMm: ");
      Serial.print(measure.RangeMilliMeter);
      Serial.println(" mm");
    } else {
      Serial.println("distanceMm: fuera_de_rango");
    }
  }
}