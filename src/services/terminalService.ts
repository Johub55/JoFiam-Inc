/**
 * Service voor communicatie met het DIY WerkPay Pinapparaat
 * Ondersteunt Web Serial API (Chrome / Edge / Chromium) voor directe USB verbinding met de Arduino,
 * en bevat een ingebouwde simulator voor testen in de browser.
 */

export interface TerminalCallbacks {
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'waiting_card' | 'pin_entered' | 'processing' | 'approved' | 'declined') => void;
  onPaymentData?: (data: { uid: string; pin: string }) => void;
  onCancel?: () => void;
  onLog?: (msg: string) => void;
}

export const ARDUINO_SKETCH_CODE = `/*
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
 *     - SDA  -> Pin A4 (Uno/Nano)
 *     - SCL  -> Pin A5 (Uno/Nano)
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

#define RST_PIN         9
#define SS_PIN          10
#define BUZZER_PIN      A1

LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 mfrc522(SS_PIN, RST_PIN);

const byte ROWS = 4; 
const byte COLS = 4; 
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {2, 3, 4, 5};
byte colPins[COLS] = {6, 7, 8, A0};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

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
  Serial.begin(115200);
  while (!Serial) { ; }

  #if defined(BUZZER_PIN)
    pinMode(BUZZER_PIN, OUTPUT);
  #endif

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WerkPay Terminal");
  lcd.setCursor(0, 1);
  lcd.print("Opstarten...");

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
  handleSerialInput();

  switch (currentState) {
    case STATE_IDLE:
      break;

    case STATE_WAITING_CARD:
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

      if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
        scannedUid = "";
        for (byte i = 0; i < mfrc522.uid.size; i++) {
          if (mfrc522.uid.uidByte[i] < 0x10) scannedUid += "0";
          scannedUid += String(mfrc522.uid.uidByte[i], HEX);
        }
        scannedUid.toUpperCase();
        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();

        beep(2500, 120);

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
      char key = keypad.getKey();
      if (key) {
        if (key == 'D') {
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
          if (enteredPin.length() > 0) {
            enteredPin.remove(enteredPin.length() - 1);
            beep(1500, 50);
            updatePinDisplay();
          }
        } 
        else if (key == '#' || key == 'A') {
          if (enteredPin.length() >= 4) {
            beep(2800, 150);
            currentState = STATE_PROCESSING;
            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("Verifi\\x65ren...");
            lcd.setCursor(0, 1);
            lcd.print("Even geduld a.u.b.");

            Serial.print("RESULT:OK:UID=");
            Serial.print(scannedUid);
            Serial.print(":PIN=");
            Serial.println(enteredPin);
          } else {
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

void handleSerialInput() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\\n');
  line.trim();
  if (line.length() == 0) return;

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
    lcd.print("WerkPay: \\xDF ");
    lcd.print(pendingAmount);

    lcd.setCursor(0, 1);
    lcd.print("Scan pas / kaart");

    beep(2400, 100);
    Serial.println("ACK:WAITING_FOR_CARD");
  }
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
  else if (line == "RESET" || line == "CANCEL") {
    setIdleScreen();
    Serial.println("ACK:RESET");
  }
  else if (line == "PING") {
    Serial.println("PONG:WERKPAY_PINPAD");
  }
}
`;

class TerminalManager {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private isConnected = false;
  private callbacks: TerminalCallbacks = {};
  private keepReading = false;

  public isWebSerialAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public setCallbacks(cb: TerminalCallbacks) {
    this.callbacks = cb;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public async connect(): Promise<{ success: boolean; message: string }> {
    if (!this.isWebSerialAvailable()) {
      return { 
        success: false, 
        message: 'Web Serial API wordt niet ondersteund in deze browser. Gebruik Google Chrome of Microsoft Edge.' 
      };
    }

    try {
      this.callbacks.onStatusChange?.('connecting');
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      this.isConnected = true;
      this.keepReading = true;
      this.callbacks.onStatusChange?.('connected');
      this.callbacks.onLog?.('USB Serial verbonden op 115200 baud met Arduino.');

      // Start asynchronous read loop
      this.startReadLoop();

      // Send ping to verify
      await this.sendLine('PING');

      return { success: true, message: 'Verbonden met Arduino Pinapparaat!' };
    } catch (err: any) {
      this.isConnected = false;
      this.callbacks.onStatusChange?.('disconnected');
      return { 
        success: false, 
        message: err?.message || 'Kon geen verbinding maken met COM poort.' 
      };
    }
  }

  public async disconnect() {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
      }
      if (this.writer) {
        this.writer.releaseLock();
      }
      if (this.port) {
        await this.port.close();
      }
    } catch (e) {
      // Ignored
    } finally {
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.isConnected = false;
      this.callbacks.onStatusChange?.('disconnected');
      this.callbacks.onLog?.('Verbinding met Arduino verbroken.');
    }
  }

  private async startReadLoop() {
    let buffer = '';
    // @ts-ignore
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const clean = line.trim();
            if (clean) this.processIncomingLine(clean);
          }
        }
      }
    } catch (error) {
      if (this.keepReading) {
        this.callbacks.onLog?.(`Leesfout: ${error}`);
      }
    } finally {
      try {
        this.reader.releaseLock();
      } catch {}
    }
  }

  private processIncomingLine(line: string) {
    this.callbacks.onLog?.(`[Arduino -> POS]: ${line}`);

    if (line.startsWith('RESULT:OK:')) {
      // Format: RESULT:OK:UID=4129883155049012:PIN=1234
      const parts = line.split(':');
      let uid = '';
      let pin = '';
      for (const p of parts) {
        if (p.startsWith('UID=')) uid = p.substring(4);
        if (p.startsWith('PIN=')) pin = p.substring(4);
      }
      this.callbacks.onStatusChange?.('processing');
      this.callbacks.onPaymentData?.({ uid, pin });
    } else if (line.startsWith('RESULT:CANCEL')) {
      this.callbacks.onStatusChange?.('connected');
      this.callbacks.onCancel?.();
    } else if (line.startsWith('ACK:WAITING_FOR_CARD')) {
      this.callbacks.onStatusChange?.('waiting_card');
    }
  }

  public async sendLine(line: string): Promise<boolean> {
    if (!this.isConnected || !this.port) return false;
    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      await writer.write(encoder.encode(line + '\n'));
      writer.releaseLock();
      this.callbacks.onLog?.(`[POS -> Arduino]: ${line}`);
      return true;
    } catch (e) {
      this.callbacks.onLog?.(`Schrijffout: ${e}`);
      return false;
    }
  }

  public async startPayment(amount: number, orderNo: number): Promise<boolean> {
    const cmd = `PAY:${amount.toFixed(2)}:${orderNo}`;
    return await this.sendLine(cmd);
  }

  public async notifyApproved(msg: string = 'Bedankt!'): Promise<boolean> {
    return await this.sendLine(`APPROVED:${msg}`);
  }

  public async notifyDeclined(reason: string = 'Afgewezen'): Promise<boolean> {
    return await this.sendLine(`DECLINED:${reason}`);
  }

  public async cancel(): Promise<boolean> {
    return await this.sendLine('CANCEL');
  }
}

export const terminalManager = new TerminalManager();
