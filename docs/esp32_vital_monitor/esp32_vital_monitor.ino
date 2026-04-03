/**
 * esp32_vital_monitor.ino
 * ========================
 * Arduino Nano ESP32 — Real Sensor Vital Monitor
 *
 * Reads live physiological data from three sensors and POSTs it to
 * the telemedicine app's  POST /api/health-data  endpoint over WiFi.
 *
 * Hardware
 * --------
 *   Board  : Arduino Nano ESP32
 *   Sensor 1: MAX30102  Pulse Oximeter (I2C — SDA=A4, SCL=A5)
 *             4.7 kΩ pull-up resistors on SDA and SCL to 3.3 V
 *   Sensor 2: DS18B20   Temperature    (1-Wire — D2)
 *             4.7 kΩ pull-up resistor between D2 and 3.3 V
 *   Sensor 3: BMP280    Pressure (optional, I2C — same bus as MAX30102)
 *             Leave ENABLE_BMP280 commented out if not wired.
 *
 * Required Libraries — install via  Sketch > Include Library > Manage Libraries
 * -----------------------------------------------------------------------------
 *   1. SparkFun MAX3010x Pulse and Proximity Sensor Library
 *      (search "SparkFun MAX3010x" — provides MAX30105.h, heartRate.h,
 *       spo2_algorithm.h)
 *
 *   2. OneWire  by Paul Stoffregen
 *      (search "OneWire")
 *
 *   3. DallasTemperature  by Miles Burton
 *      (search "DallasTemperature")
 *
 *   4. ArduinoJson  by Benoit Blanchon  — use version 6.x
 *      (search "ArduinoJson")
 *
 *   5. Adafruit BMP280 Library  — only needed when ENABLE_BMP280 is defined
 *      (search "Adafruit BMP280")
 *
 * WiFi.h and HTTPClient.h are built-in for the ESP32 Arduino core.
 * Wire.h is built-in for I2C support.
 *
 * Board Selection
 * ---------------
 *   Tools > Board > Arduino ARM (32-bit) Boards > Arduino Nano ESP32
 *   (requires the "Arduino ESP32 Boards" package installed via Board Manager)
 */

// ─── Optional BMP280 ─────────────────────────────────────────────────────────
// Uncomment the line below if you have a BMP280 connected to the I2C bus.
// Without it, bp_sys and bp_dia are omitted from the POST body (server
// treats missing optional fields as null).
// #define ENABLE_BMP280

// ─── Libraries ───────────────────────────────────────────────────────────────
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <MAX30105.h>
#include <spo2_algorithm.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

#ifdef ENABLE_BMP280
  #include <Adafruit_BMP280.h>
#endif

// ─── User Configuration — edit before flashing ───────────────────────────────

// WiFi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server — use the LAN IP of the machine running `npm run dev` (port 3000).
// Example: "http://192.168.1.100:3000/api/health-data"
// Do NOT use "localhost" — the ESP32 cannot resolve that.
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000/api/health-data";

// Device credentials — must match a row in the `devices` table.
// device_id  : the unique string stored in devices.device_id
// API_KEY    : the plain-text key issued when the device was registered.
//              The server bcrypt-compares this against the hashed value
//              stored in devices.api_key.
const char* DEVICE_ID = "ESP32-001";
const char* API_KEY   = "YOUR_PLAIN_TEXT_API_KEY";

// How often to take and transmit a reading (milliseconds).
// 30 s is a reasonable default for continuous monitoring.
const unsigned long READING_INTERVAL_MS = 30000UL;

// ─── Pin Definitions ─────────────────────────────────────────────────────────
// D2 on the Arduino Nano ESP32 form factor
#define ONE_WIRE_BUS 2

// ─── Sensor Objects ──────────────────────────────────────────────────────────
MAX30105 particleSensor;

OneWire            oneWire(ONE_WIRE_BUS);
DallasTemperature  tempSensor(&oneWire);

#ifdef ENABLE_BMP280
  Adafruit_BMP280 bmp;
  bool bmpAvailable      = false;
  float baselinePressure = 101325.0f; // Pa; captured in setup()

  // Coefficients for a rough linear BP estimate.
  // NOTE: a barometric pressure delta is NOT a medically valid blood pressure
  // proxy. This is a placeholder for demonstration only. Replace with a
  // validated oscillometric or PTT-based algorithm before clinical use.
  const float BP_SYS_BASE  = 120.0f;
  const float BP_DIA_BASE  =  80.0f;
  const float BP_SYS_SCALE =   0.05f; // mmHg per Pa
  const float BP_DIA_SCALE =   0.03f;
#endif

// ─── MAX30102 / SpO2 Buffer ───────────────────────────────────────────────────
// Maxim's spo2_algorithm requires exactly 100 samples.
#define SPO2_BUFFER_LEN 100
uint32_t irBuffer[SPO2_BUFFER_LEN];
uint32_t redBuffer[SPO2_BUFFER_LEN];

// IR count threshold for finger detection (empirically ~ 50 000 counts)
#define FINGER_IR_THRESHOLD 50000UL

// ─── State ───────────────────────────────────────────────────────────────────
unsigned long lastReadingMs = 0;

// ─── Forward Declarations ────────────────────────────────────────────────────
bool  connectWiFi();
bool  readMAX30102(int32_t& heartRate, int8_t& validHR,
                   int32_t& spo2,      int8_t& validSpO2);
float readTemperatureCelsius();
bool  postReading(int32_t pulse, float temperature, int32_t oxygen,
                  int bpSys, int bpDia, bool hasBP);

// ═════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=================================================");
  Serial.println(" ESP32 Vital Monitor — Initializing");
  Serial.println("=================================================");

  // I2C — Arduino Nano ESP32 default: SDA = A4, SCL = A5
  Wire.begin();

  // ── MAX30102 ─────────────────────────────────────────────────────────────
  Serial.print("[MAX30102] Initializing... ");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("FAILED.");
    Serial.println("  Check: SDA→A4, SCL→A5, 4.7kΩ pull-ups to 3.3V, VIN=3.3V.");
    // Halt — no point running without the primary sensor
    while (true) { delay(1000); }
  }
  // Red + IR mode; 100 Hz; moderate LED current; 411 µs pulse width
  particleSensor.setup(
    60,   // LED brightness  0–255  (~18 mA)
    4,    // Sample averaging  1 | 2 | 4 | 8 | 16 | 32
    2,    // LED mode  1=Red only  2=Red+IR  3=Red+IR+Green
    100,  // Sample rate (Hz)  50|100|200|400|800|1000|1600|3200
    411,  // Pulse width (µs)  69|118|215|411
    4096  // ADC range         2048|4096|8192|16384
  );
  particleSensor.setPulseAmplitudeRed(0x0A); // Low power between readings
  particleSensor.setPulseAmplitudeGreen(0);  // Green off (not used)
  Serial.println("OK");

  // ── DS18B20 ──────────────────────────────────────────────────────────────
  Serial.print("[DS18B20]  Initializing... ");
  tempSensor.begin();
  int found = tempSensor.getDeviceCount();
  if (found == 0) {
    Serial.println("WARNING — no sensor found on D2.");
    Serial.println("  Check: DATA→D2, 4.7kΩ pull-up to 3.3V, VIN=3.3V.");
  } else {
    Serial.print("OK (");
    Serial.print(found);
    Serial.println(" sensor(s))");
  }

  // ── BMP280 (optional) ────────────────────────────────────────────────────
#ifdef ENABLE_BMP280
  Serial.print("[BMP280]   Initializing... ");
  // BMP280 can appear at 0x76 (SDO→GND) or 0x77 (SDO→VCC)
  if (bmp.begin(0x76) || bmp.begin(0x77)) {
    bmp.setSampling(
      Adafruit_BMP280::MODE_NORMAL,
      Adafruit_BMP280::SAMPLING_X2,
      Adafruit_BMP280::SAMPLING_X16,
      Adafruit_BMP280::FILTER_X16,
      Adafruit_BMP280::STANDBY_MS_500
    );
    delay(1000); // let first readings settle
    baselinePressure = bmp.readPressure();
    bmpAvailable = true;
    Serial.println("OK");
  } else {
    Serial.println("NOT FOUND — bp_sys/bp_dia will be omitted.");
    bmpAvailable = false;
  }
#endif

  // ── WiFi ─────────────────────────────────────────────────────────────────
  connectWiFi(); // non-fatal; loop() will retry on every reading attempt

  Serial.println();
  Serial.println("Setup complete. Waiting for first reading interval...");
  Serial.println();
}

// ═════════════════════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();
  // Guard against millis() rollover (every ~49 days) by using subtraction
  if (now - lastReadingMs < READING_INTERVAL_MS) return;
  lastReadingMs = now;

  Serial.println("─────────────────────────────────────────────────");
  Serial.println("Taking reading...");

  // 1. WiFi health check / reconnect
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected — attempting reconnect...");
    if (!connectWiFi()) {
      Serial.println("[WiFi] Could not reconnect. Skipping reading.");
      return;
    }
  }

  // 2. MAX30102 — heart rate + SpO2 (~4 s blocking collection)
  int32_t heartRate = -1, spo2 = -1;
  int8_t  validHR   =  0, validSpO2 = 0;

  if (!readMAX30102(heartRate, validHR, spo2, validSpO2)) {
    // readMAX30102 prints its own diagnostic message
    return;
  }
  if (!validHR || heartRate <= 0 || heartRate > 250) {
    Serial.println("[MAX30102] Heart rate invalid — ensure full finger contact.");
    return;
  }
  if (!validSpO2 || spo2 <= 0 || spo2 > 100) {
    Serial.println("[MAX30102] SpO2 invalid — ensure full finger contact.");
    return;
  }
  Serial.print("[MAX30102] HR = "); Serial.print(heartRate); Serial.println(" bpm");
  Serial.print("[MAX30102] SpO2 = "); Serial.print(spo2); Serial.println(" %");

  // 3. DS18B20 — core body temperature
  float temperature = readTemperatureCelsius();
  if (isnan(temperature)) {
    Serial.println("[DS18B20] Sensor error — check wiring. Skipping reading.");
    return;
  }
  if (temperature < 30.0f || temperature > 45.0f) {
    Serial.print("[DS18B20] Value out of physiological range: ");
    Serial.print(temperature, 2);
    Serial.println(" °C — skipping.");
    return;
  }
  Serial.print("[DS18B20] Temp = "); Serial.print(temperature, 1); Serial.println(" °C");

  // 4. BMP280 — optional pressure-based BP estimation
  bool hasBP = false;
  int  bpSys = 0, bpDia = 0;

#ifdef ENABLE_BMP280
  if (bmpAvailable) {
    float pressPa = bmp.readPressure();
    float delta   = pressPa - baselinePressure;
    bpSys = (int)constrain(BP_SYS_BASE + delta * BP_SYS_SCALE, 50.0f, 250.0f);
    bpDia = (int)constrain(BP_DIA_BASE + delta * BP_DIA_SCALE, 30.0f, 150.0f);
    hasBP = true;
    Serial.print("[BMP280]   BP (est.) = ");
    Serial.print(bpSys); Serial.print("/"); Serial.print(bpDia);
    Serial.println(" mmHg");
  }
#endif

  // 5. POST to telemedicine server
  bool sent = postReading(heartRate, temperature, spo2, bpSys, bpDia, hasBP);
  Serial.println(sent ? "Reading sent successfully." : "Failed to send reading.");
  Serial.println();
}

// ─── WiFi ────────────────────────────────────────────────────────────────────
bool connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  for (int i = 0; i < 30; i++) {        // 15-second timeout
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print(" IP: ");
      Serial.println(WiFi.localIP());
      return true;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println(" FAILED.");
  return false;
}

// ─── MAX30102 ─────────────────────────────────────────────────────────────────
/**
 * Blocks while collecting SPO2_BUFFER_LEN samples from the MAX30102,
 * then runs Maxim's maxim_heart_rate_and_oxygen_saturation() algorithm.
 *
 * Returns false (and prints a reason) when:
 *   - No finger is detected  (IR < FINGER_IR_THRESHOLD)
 *   - The algorithm outputs invalid results
 */
bool readMAX30102(int32_t& heartRate, int8_t& validHR,
                  int32_t& spo2,      int8_t& validSpO2) {
  Serial.print("[MAX30102] Collecting samples");

  for (int i = 0; i < SPO2_BUFFER_LEN; i++) {
    // Wait until the FIFO has at least one new sample
    while (!particleSensor.available()) {
      particleSensor.check();
    }
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();

    if ((i + 1) % 10 == 0) Serial.print(".");
  }
  Serial.println();

  // Finger check: IR signal from a well-perfused fingertip typically
  // exceeds 50 000 raw ADC counts at the configured LED brightness.
  if (irBuffer[SPO2_BUFFER_LEN - 1] < FINGER_IR_THRESHOLD) {
    Serial.print("[MAX30102] No finger detected (IR=");
    Serial.print(irBuffer[SPO2_BUFFER_LEN - 1]);
    Serial.println("). Place finger firmly on sensor.");
    return false;
  }

  // Run Maxim SpO2 + HR algorithm (provided by spo2_algorithm.h)
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,  SPO2_BUFFER_LEN, redBuffer,
    &spo2,     &validSpO2,
    &heartRate, &validHR
  );

  return true;
}

// ─── DS18B20 ──────────────────────────────────────────────────────────────────
float readTemperatureCelsius() {
  tempSensor.requestTemperatures();        // blocking conversion (~750 ms @9-bit)
  float t = tempSensor.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C) {        // = -127.0 in the library
    return NAN;
  }
  return t;
}

// ─── HTTP POST ────────────────────────────────────────────────────────────────
/**
 * Serialises the reading into a JSON body and POSTs it to SERVER_URL.
 * The server expects:
 *   Header : x-api-key: <plain-text key>
 *   Body   : {
 *               "device_id"   : string,
 *               "pulse"       : number (20–250),
 *               "temperature" : number (30–45),
 *               "oxygen"      : number (50–100),
 *               "bp_sys"      : number (50–250)  [optional],
 *               "bp_dia"      : number (30–150)  [optional]
 *             }
 * Returns true on HTTP 201.
 */
bool postReading(int32_t pulse, float temperature, int32_t oxygen,
                 int bpSys, int bpDia, bool hasBP) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(10000); // 10-second network timeout

  // ArduinoJson 6 — StaticJsonDocument on the stack
  // 256 bytes is ample for this payload (worst case ~110 chars serialised)
  StaticJsonDocument<256> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["pulse"]       = pulse;
  // Round temperature to one decimal place to avoid floating-point noise
  doc["temperature"] = round(temperature * 10.0f) / 10.0f;
  doc["oxygen"]      = oxygen;
  if (hasBP) {
    doc["bp_sys"] = bpSys;
    doc["bp_dia"] = bpDia;
  }

  String body;
  serializeJson(doc, body);

  Serial.print("[HTTP] POST → "); Serial.println(SERVER_URL);
  Serial.print("[HTTP] Body: "); Serial.println(body);

  int statusCode = http.POST(body);
  Serial.print("[HTTP] Status: "); Serial.println(statusCode);

  if (statusCode > 0) {
    String resp = http.getString();
    Serial.print("[HTTP] Response: "); Serial.println(resp);
  } else {
    Serial.print("[HTTP] Error: "); Serial.println(http.errorToString(statusCode));
  }

  http.end();
  return (statusCode == 201);
}
