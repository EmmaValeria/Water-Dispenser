#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"

// Configuración WiFi - CAMBIAR ESTOS VALORES
const char* ssid = "TP-LINK_E52C";         // Cambia esto con tu nombre de red WiFi
const char* password = "02135007";  // Cambia esto con tu contraseña WiFi

// Configuración del servidor - CAMBIAR ESTA IP
const char* serverAddress = "http://192.168.1.72:8080/water-data"; // Cambia la IP a la de tu computadora

// Configuración de los pines
#define DT_PIN 16
#define SCK_PIN 4
#define BUTTON_PIN 17
#define LED_AUMENTO 18
#define LED_OBJETIVO 19
#define TRIGGER_PIN 21
#define ECHO_PIN 22

// ID único del dispositivo
const char* deviceId = "water-level-sensor-01";

// Configuración HX711
HX711 scale;

// Variables globales
float pesoAnterior = 0.0;
float pesoObjetivo = 300.0; // en gramos
float distanciaUmbral = 5.0; // cm
float pesoMinimo = 14.5;

// Variables para control de tiempo
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 2000; // Enviar datos cada 2 segundos
bool wifiConnected = false;

void setup() {
  // Iniciar puerto serial
  Serial.begin(115200);
  delay(2000); // Dar tiempo para abrir el monitor serial
  
  Serial.println("\n\n===== ESP32 WATER MONITOR - SIMPLE HTTP VERSION =====");
  
  // Configurar pines
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_AUMENTO, OUTPUT);
  pinMode(LED_OBJETIVO, OUTPUT);
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Estado inicial de LEDs
  digitalWrite(LED_AUMENTO, LOW);
  digitalWrite(LED_OBJETIVO, LOW);
  
  // Inicializar HX711
  Serial.println("Inicializando balanza...");
  scale.begin(DT_PIN, SCK_PIN);
  
  if (!scale.is_ready()) {
    Serial.println("ERROR: HX711 no está listo. Verificar conexiones.");
    blinkErrorLed();
  }
  
  scale.set_scale(420.0f);
  scale.tare();
  Serial.println("Balanza inicializada correctamente");
  
  // Conectar WiFi
  connectToWifi();
}

void loop() {
  // Verificar conexión WiFi y reconectar si es necesario
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Reconectando...");
    connectToWifi();
    return;
  }
  
  // Tarar con botón
  if (digitalRead(BUTTON_PIN) == LOW) {
    Serial.println("Tarando balanza...");
    scale.tare();
    
    // Indicación visual
    digitalWrite(LED_AUMENTO, HIGH);
    delay(500);
    digitalWrite(LED_AUMENTO, LOW);
    
    delay(500); // Debounce
  }
  
  // Leer sensores
  float pesoActual = scale.get_units(5);
  float distancia = medirDistanciaCM();
  
  // Controlar LED de aumento
  if (distancia > 0 && distancia < distanciaUmbral && pesoActual >= pesoMinimo && pesoActual < pesoObjetivo) {
    digitalWrite(LED_AUMENTO, HIGH);
  } else {
    digitalWrite(LED_AUMENTO, LOW);
  }
  
  // Controlar LED de objetivo
  if (pesoActual >= pesoObjetivo) {
    digitalWrite(LED_OBJETIVO, HIGH);
  } else {
    digitalWrite(LED_OBJETIVO, LOW);
  }
  
  // Enviar datos al servidor (cada X segundos)
  unsigned long currentMillis = millis();
  if (currentMillis - lastSendTime >= sendInterval) {
    lastSendTime = currentMillis;
    sendDataToServer(deviceId, pesoActual, distancia);
  }
  
  delay(100); // Pequeña pausa
}

// Medir distancia con sensor ultrasónico
float medirDistanciaCM() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1.0;
  
  return duration * 0.0343 / 2;
}

// Conectar a WiFi
void connectToWifi() {
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  // Esperar conexión (con timeout)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConectado a WiFi");
    Serial.print("Dirección IP: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
  } else {
    Serial.println("\nError: No se pudo conectar a WiFi");
    Serial.println("Verifica SSID y contraseña");
    wifiConnected = false;
    blinkErrorLed();
  }
}

// Enviar datos al servidor usando HTTP simple (no Socket.IO)
void sendDataToServer(const char* deviceId, float peso, float distancia) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: No hay conexión WiFi para enviar datos");
    return;
  }
  
  HTTPClient http;
  
  // Construir URL con datos como parámetros (query string)
  String url = String(serverAddress);
  url += "?deviceId=" + String(deviceId);
  url += "&peso=" + String(peso);
  url += "&distancia=" + String(distancia);
  url += "&objetivo_alcanzado=" + String(peso >= pesoObjetivo ? "true" : "false");
  url += "&objeto_presente=" + String(distancia > 0 && distancia < distanciaUmbral ? "true" : "false");
  
  // Iniciar conexión HTTP
  http.begin(url);
  
  // Enviar la solicitud GET
  int httpResponseCode = http.GET();
  
  // Mostrar resultado
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response: ");
    Serial.print(httpResponseCode);
    Serial.print(" - ");
    Serial.println(response);
    
    // Parpadear LED para indicar éxito
    digitalWrite(LED_AUMENTO, HIGH);
    delay(50);
    digitalWrite(LED_AUMENTO, LOW);
  } else {
    Serial.print("Error en solicitud HTTP: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// Parpadear LED para indicar error
void blinkErrorLed() {
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_AUMENTO, HIGH);
    delay(100);
    digitalWrite(LED_AUMENTO, LOW);
    delay(100);
  }
}