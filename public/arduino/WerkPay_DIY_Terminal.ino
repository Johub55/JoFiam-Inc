/*
 * ==============================================================================
 *  WERKPAY & WERKDONALDS - DIY PINAPPARAAT (POS TERMINAL)
 * ==============================================================================
 *  Hardware componenten:
 *  1. Arduino Uno / Nano / Mega / ESP32 (5V compatibel)
 *  2. 5V I2C LCD Scherm (16x2 of 20x4, PCF8574 backpack op adres 0x27 of 0x3F)
 *  3. 13.56 MHz RFID / NFC Lezer (RC522 module)
 *  4. 4x4 Matrix Toetsenbord (Keypad: 0-9, *, #, A, B, C, D)
 *  5. Optioneel: Passieve/Actieve Buzzer voor audio feedback (D14 / A1)
 *
 *  AANSLUITSCHEMA (Arduino Uno / Nano):
 *  ----------------------------------------------------------------------------
 *  A) 5V I2C LCD Display (1602 / 2004):
 *     - VCC  -> 5V
 *     - GND  -> GND
 *     - SDA  -> A4 (Uno/Nano)
 *     - SCL  -> A5 (Uno/Nano)
 *
 *  B) RFID-RC522 (NFC / RFID lezer):
 *     - 3.3V -> 3.3V (LET OP: RC522 werkt op 3.3V voeding!)
 *     - RST  -> Pin D9
 *     - GND  -> GND
 *     - MISO -> Pin D12 (SPI MISO)
 *     - MOSI -> Pin D11 (SPI MOSI)
 *     - SCK  -> Pin D13 (SPI SCK)
 *     - SDA  -> Pin D10 (SPI SS / Chip Select)
 *
 *  C) 4x4 Matrix Keypad (8 pinnen):
 *     - Rij 1 (R1) -> Pin D2
 *     - Rij 2 (R2) -> Pin D3
 *     - Rij 3 (R3) -> Pin D4
 *     - Rij 4 (R4) -> Pin D5
 *     - Kol 1 (C1) -> Pin D6
 *     - Kol 2 (C2) -> Pin D7
 *     - Kol 3 (C3) -> Pin D8
 *     - Kol 4 (C4) -> Pin A0 (D14)
 *
 *  D) Buzzer (Optioneel):
 *     - Positief (+) -> Pin A1
 *     - Negatief (-) -> GND
 *
 *  VEREISTE ARDUINO LIBRARIES (installeer via Arduino Library Manager):
 *  - "LiquidCrystal I2C" door Frank de Brabander / Marco Schwartz
 *  - "MFRC522" door GithubCommunity
 *  - "Keypad" door Mark Stanley, Alexander Brevig
 * ==============================================================================
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>

// --- PIN DEFINITIES ---
#define RST_PIN         9          // RC522 Reset
#define SS_PIN          10         // RC522 Slave Select
#define BUZZER_PIN      A1         // Optionele buzzer (of -1 indien niet gebruikt)

// --- I2C LCD SETUP ---
// Standaard adres is meestal 0x27, soms 0x3F. 16 kolommen, 2 rijen.
LiquidCrystal_I2C lcd(0x27, 16, 2);

// --- RFID SETUP ---
MFRC522 mfrc522(SS_PIN, RST_PIN);

// --- 4x4 KEYPAD SETUP ---
const byte ROWS = 4; 
const byte COLS = 4; 
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {2, 3, 4, 5};       // R1, R2, R3, R4
byte colPins[COLS] = {6, 7, 8, A0};      // C1, C2, C3, C4

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// --- TERMINAL STATUS ---
enum TerminalState {
  STATE_IDLE,
  STATE_WAITING_CARD,
  STATE_WAITING_PIN,
  STATE_PROCESSING,
  STATE_RESULT
};

TerminalState currentState = STATE_IDLE;
String pendingAmount = "0.00";
String pendingOrderId = "";
String scannedUid = "";
String enteredPin = "";
unsigned long stateTimer = 0;

void beep(int frequency, int durationMs) {
  #if defined(BUZZER_PIN)
    tone(BUZZER_PIN, frequency, durationMs);
    delay(durationMs);
    noTone(BUZZER_PIN);
  #else
    delay(durationMs);
  #endif
}

void setup() {
  // Start seriële communicatie op 115200 baud met de browser (Werkdonalds POS)
  Serial.begin(115200);
  while (!Serial) { ; } // Wacht op verbinding indien native USB

  // Buzzer configuratie
  #if defined(BUZZER_PIN)
    pinMode(BUZZER_PIN, OUTPUT);
  #endif

  // I2C LCD initialiseren
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WerkPay Terminal");
  lcd.setCursor(0, 1);
  lcd.print("Opstarten...");

  // SPI en RC522 RFID initialiseren
  SPI.begin();
  mfrc522.PCD_Init();
  delay(100);

  beep(2000, 100);
  beep(3000, 150);

  setIdleScreen();
  Serial.println("READY:WERKPAY_DIY_V1.0");
}

void setIdleScreen() {
  currentState = STATE_IDLE;
  pendingAmount = "0.00";
  pendingOrderId = "";
  scannedUid = "";
  enteredPin = "";

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Werkdonalds POS");
  lcd.setCursor(0, 1);
  lcd.print("Klaar voor order");
}

void loop() {
  // 1. Luister naar Seriële opdrachten vanaf de browser (Werkdonalds POS)
  handleSerialInput();

  // 2. Machine status afhandeling
  switch (currentState) {
    case STATE_IDLE:
      // Wacht op PAY opdracht via Serial
      break;

    case STATE_WAITING_CARD:
      // Controleer of de klant op 'D' (Annuleren) drukt op het toetsenbord
      char cancelKey = keypad.getKey();
      if (cancelKey == 'D' || cancelKey == '*') {
        beep(800, 200);
        Serial.println("RESULT:CANCELLED");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Geannuleerd!");
        delay(1200);
        setIdleScreen();
        return;
      }

      // Controleer RFID/NFC lezer
      if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
        // UID uitlezen en omzetten naar Hex string
        scannedUid = "";
        for (byte i = 0; i < mfrc522.uid.size; i++) {
          if (mfrc522.uid.uidByte[i] < 0x10) scannedUid += "0";
          scannedUid += String(mfrc522.uid.uidByte[i], HEX);
        }
        scannedUid.toUpperCase();
        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();

        beep(2500, 120);

        // Vraag om pincode
        currentState = STATE_WAITING_PIN;
        enteredPin = "";
        stateTimer = millis();

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Pas herkend!");
        lcd.setCursor(0, 1);
        lcd.print("Pincode: ");
      }
      break;

    case STATE_WAITING_PIN:
      // Klant toetst pincode in
      char key = keypad.getKey();
      if (key) {
        if (key == 'D') {
          // Annuleren
          beep(800, 200);
          Serial.println("RESULT:CANCELLED");
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Geannuleerd!");
          delay(1200);
          setIdleScreen();
          return;
        } 
        else if (key == '*') {
          // Backspace / wissen
          if (enteredPin.length() > 0) {
            enteredPin.remove(enteredPin.length() - 1);
            beep(1500, 50);
            updatePinDisplay();
          }
        } 
        else if (key == '#' || key == 'A') {
          // Enter / Bevestigen
          if (enteredPin.length() >= 4) {
            beep(2800, 150);
            currentState = STATE_PROCESSING;
            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("Verifi\x65ren...");
            lcd.setCursor(0, 1);
            lcd.print("Even geduld a.u.b.");

            // Stuur resultaat over Serial naar de POS browser
            Serial.print("RESULT:OK:UID=");
            Serial.print(scannedUid);
            Serial.print(":PIN=");
            Serial.println(enteredPin);
          } else {
            // Te korte pincode
            beep(600, 300);
          }
        } 
        else if (key >= '0' && key <= '9') {
          if (enteredPin.length() < 6) {
            enteredPin += key;
            beep(2000, 40);
            updatePinDisplay();
          }
        }
      }

      // Timeout na 30 seconden inactiviteit
      if (millis() - stateTimer > 30000) {
        Serial.println("RESULT:TIMEOUT");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("PIN Timeout");
        delay(1500);
        setIdleScreen();
      }
      break;

    case STATE_PROCESSING:
      // Wacht op reactie van de browser (APPROVED of DECLINED)
      break;

    case STATE_RESULT:
      if (millis() - stateTimer > 3500) {
        setIdleScreen();
      }
      break;
  }
}

void updatePinDisplay() {
  lcd.setCursor(9, 1);
  lcd.print("       ");
  lcd.setCursor(9, 1);
  for (unsigned int i = 0; i < enteredPin.length(); i++) {
    lcd.print("*");
  }
}

// --- SERIËLE INVOER VANAF BROWSER AFHANDELEN ---
void handleSerialInput() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // COMMANDO 1: PAY:<bedrag>:<order_no>
  // Voorbeeld: PAY:7.95:1042
  if (line.startsWith("PAY:")) {
    int firstColon = line.indexOf(':');
    int secondColon = line.indexOf(':', firstColon + 1);

    if (secondColon != -1) {
      pendingAmount = line.substring(firstColon + 1, secondColon);
      pendingOrderId = line.substring(secondColon + 1);
    } else {
      pendingAmount = line.substring(firstColon + 1);
      pendingOrderId = "0000";
    }

    currentState = STATE_WAITING_CARD;
    stateTimer = millis();

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WerkPay: \xDF "); // \xDF of 'E'
    lcd.print(pendingAmount);

    lcd.setCursor(0, 1);
    lcd.print("Scan pas / kaart");

    beep(2400, 100);
    Serial.println("ACK:WAITING_FOR_CARD");
  }
  // COMMANDO 2: APPROVED:<tekst>
  // Voorbeeld: APPROVED:Eet smakelijk!
  else if (line.startsWith("APPROVED")) {
    currentState = STATE_RESULT;
    stateTimer = millis();

    beep(2000, 100);
    beep(2500, 100);
    beep(3000, 200);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Betaling Gelukt!");
    lcd.setCursor(0, 1);
    lcd.print("Eet smakelijk! :)");
  }
  // COMMANDO 3: DECLINED:<reden>
  // Voorbeeld: DECLINED:Onvoldoende Saldo
  else if (line.startsWith("DECLINED")) {
    currentState = STATE_RESULT;
    stateTimer = millis();

    beep(700, 250);
    beep(500, 400);

    String reason = "Mislukt!";
    int c = line.indexOf(':');
    if (c != -1) reason = line.substring(c + 1);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Afgewezen!");
    lcd.setCursor(0, 1);
    lcd.print(reason.substring(0, 16));
  }
  // COMMANDO 4: RESET / CANCEL
  else if (line == "RESET" || line == "CANCEL") {
    setIdleScreen();
    Serial.println("ACK:RESET");
  }
  // COMMANDO 5: PING
  else if (line == "PING") {
    Serial.println("PONG:WERKPAY_PINPAD");
  }
}
