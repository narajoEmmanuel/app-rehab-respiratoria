// RESPIRA+
// Prueba aislada de botón de conexión y LED de estado
// Sin WiFi, sin WebSocket, sin sensor

const int CONNECT_BUTTON_PIN = 25;
const int STATUS_LED_PIN = 26;

// Debounce
const unsigned long DEBOUNCE_MS = 50;

// Parpadeo no bloqueante
const unsigned long BLINK_INTERVAL_MS = 500;

int deviceMode = 0;
// 0 = IDLE, LED apagado
// 1 = WAITING, LED parpadeando
// 2 = CONNECTED_SIM, LED fijo

bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;

bool ledBlinkState = LOW;
unsigned long lastBlinkTime = 0;

void setup() {
  Serial.begin(115200);

  pinMode(CONNECT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);

  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println();
  Serial.println("RESPIRA+ prueba boton + LED");
  Serial.println("Boton: GPIO 25 con INPUT_PULLUP");
  Serial.println("LED estado: GPIO 26");
  Serial.println("Presiona el boton para cambiar de estado.");
  printCurrentMode();
}

void loop() {
  handleButton();
  updateStatusLed();
}

void handleButton() {
  bool currentReading = digitalRead(CONNECT_BUTTON_PIN);

  if (currentReading != lastButtonReading) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    if (currentReading != stableButtonState) {
      stableButtonState = currentReading;

      // Con INPUT_PULLUP, LOW significa botón presionado
      if (stableButtonState == LOW) {
        deviceMode++;

        if (deviceMode > 2) {
          deviceMode = 0;
        }

        printCurrentMode();
      }
    }
  }

  lastButtonReading = currentReading;
}

void updateStatusLed() {
  if (deviceMode == 0) {
    // IDLE
    digitalWrite(STATUS_LED_PIN, LOW);
  }

  else if (deviceMode == 1) {
    // WAITING, parpadeo no bloqueante
    if (millis() - lastBlinkTime >= BLINK_INTERVAL_MS) {
      lastBlinkTime = millis();
      ledBlinkState = !ledBlinkState;
      digitalWrite(STATUS_LED_PIN, ledBlinkState);
    }
  }

  else if (deviceMode == 2) {
    // CONNECTED_SIM
    digitalWrite(STATUS_LED_PIN, HIGH);
  }
}

void printCurrentMode() {
  Serial.print("Estado actual: ");

  if (deviceMode == 0) {
    Serial.println("IDLE, LED apagado");
  } else if (deviceMode == 1) {
    Serial.println("WAITING_FOR_APP simulado, LED parpadeando");
  } else if (deviceMode == 2) {
    Serial.println("APP_CONNECTED simulado, LED fijo");
  }
}