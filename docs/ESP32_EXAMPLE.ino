#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* serverEndpoint = "http://YOUR_SERVER_IP:3000/api/health-data";
const char* deviceId = "ESP32-001";
const char* apiKey = "secret_key_123";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverEndpoint);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);

    // Simulated sensor data
    int pulse = random(60, 100);
    float temperature = 36.1 + ((float)random(0, 15) / 10.0);
    int oxygen = random(95, 100);

    StaticJsonDocument<200> doc;
    doc["device_id"] = deviceId;
    doc["pulse"] = pulse;
    doc["temperature"] = temperature;
    doc["oxygen"] = oxygen;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);

    http.end();
  }
  
  delay(5000); // 5s interval short-polling equivalent for intake
}
