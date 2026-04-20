#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_mac.h"
#include "driver.h" 
#include "wifi.h" 
#include "esp_log.h"
#include "mqtt_client.h" // Added back for global handle
#include "cJSON.h"

// Global handle to allow access in while(1) loop
static esp_mqtt_client_handle_t client = NULL;

typedef struct {
    uint8_t cmd_type;
    int32_t val;
} espnow_packet_t;

typedef struct {
    float ax, ay, az;
    float gx, gy, gz;
} imu_packet_t;

#define BUILD_AS_HOST

void print_mac_address(void) {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    printf("DEVICE MAC ADDRESS: %02x:%02x:%02x:%02x:%02x:%02x\n", 
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

#ifdef BUILD_AS_HOST
static void host_espnow_send_cb(const esp_now_send_info_t *tx_info, esp_now_send_status_t status) {
    printf("ESP-NOW Send Status to %02x...: %s\n", 
           tx_info->des_addr[0], 
           status == ESP_NOW_SEND_SUCCESS ? "SUCCESS" : "FAIL");
}

static void host_espnow_recv_cb(const esp_now_recv_info_t *recv_info, const uint8_t *data, int len) {
    if (len == sizeof(imu_packet_t)) {
        imu_packet_t *imu = (imu_packet_t *)data;
        printf("IMU [%02x:%02x:%02x:%02x:%02x:%02x] "
               "A: x=%.3f y=%.3f z=%.3f | G: x=%.3f y=%.3f z=%.3f\n",
               recv_info->src_addr[0], recv_info->src_addr[1], recv_info->src_addr[2],
               recv_info->src_addr[3], recv_info->src_addr[4], recv_info->src_addr[5],
               imu->ax, imu->ay, imu->az,
               imu->gx, imu->gy, imu->gz);

        // Publish to MQTT so the UI can see it
        if (client != NULL) {
            char payload[256];
            snprintf(payload, sizeof(payload),
                "{\"mac\":\"%02x:%02x:%02x:%02x:%02x:%02x\","
                "\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,"
                "\"gx\":%.3f,\"gy\":%.3f,\"gz\":%.3f}",
                recv_info->src_addr[0], recv_info->src_addr[1], recv_info->src_addr[2],
                recv_info->src_addr[3], recv_info->src_addr[4], recv_info->src_addr[5],
                imu->ax, imu->ay, imu->az,
                imu->gx, imu->gy, imu->gz);
            esp_mqtt_client_publish(client, "poly/telemetry", payload, 0, 0, 0);
        }
    } else {
        printf("ESP-NOW recv len=%d (unknown packet)\n", len);
    }
}
void host_espnow_init(void) {
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_register_send_cb(host_espnow_send_cb));
    ESP_ERROR_CHECK(esp_now_register_recv_cb(host_espnow_recv_cb));

    uint8_t motor_mac[] = {0xac, 0xeb, 0xe6, 0x56, 0x4a, 0xd0};
    esp_now_peer_info_t motor_peer = { .channel = 0, .encrypt = false, .ifidx = ESP_IF_WIFI_STA };
    memcpy(motor_peer.peer_addr, motor_mac, 6);
    esp_now_add_peer(&motor_peer);
    printf("Registered Motor Peer\n");

    uint8_t sense_mac[] = {0x88, 0x56, 0xa6, 0x2c, 0x5d, 0x24};
    esp_now_peer_info_t sense_peer = { .channel = 0, .encrypt = false, .ifidx = ESP_IF_WIFI_STA };
    memcpy(sense_peer.peer_addr, sense_mac, 6);
    esp_now_add_peer(&sense_peer);
    printf("Registered Sense Peer\n");
}

void handle_mqtt_message(char *payload) {
    cJSON *root = cJSON_Parse(payload);
    if (!root) return;
    
    cJSON *cmd    = cJSON_GetObjectItem(root, "cmd");
    cJSON *target = cJSON_GetObjectItem(root, "target");
    cJSON *val    = cJSON_GetObjectItem(root, "val");

    int32_t val_int;
    if (cJSON_IsString(val)) {
        val_int = (int32_t)strtol(val->valuestring, NULL, 0);
    } else if (cJSON_IsNumber(val)) {
        val_int = (int32_t)val->valueint;
    } else {
        cJSON_Delete(root);
        return;
    }

    if (cJSON_IsString(cmd) && cJSON_IsString(target)) {
        if (strcmp(target->valuestring, "host") == 0) {
            if (strcmp(cmd->valuestring, "led") == 0) driver_set_led(val_int);
        } else {
            uint8_t mac[6];
            if (sscanf(target->valuestring, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx",
                &mac[0], &mac[1], &mac[2], &mac[3], &mac[4], &mac[5]) == 6) {

                esp_now_peer_info_t peer = { .channel = 0, .encrypt = false, .ifidx = ESP_IF_WIFI_STA };
                memcpy(peer.peer_addr, mac, 6);

                if (!esp_now_is_peer_exist(mac)) {
                    esp_err_t err = esp_now_add_peer(&peer);
                    if (err != ESP_OK) {
                        printf("ERROR: Failed to add peer: 0x%x\n", err);
                        cJSON_Delete(root);
                        return;
                    }
                }

                uint8_t cmd_type = (strcmp(cmd->valuestring, "led")  == 0) ? 1 :
                                   (strcmp(cmd->valuestring, "pwm")  == 0) ? 0 :
                                   (strcmp(cmd->valuestring, "gyro") == 0) ? 2 : 255;

                espnow_packet_t packet = { .cmd_type = cmd_type, .val = val_int };
                printf("Sending to: %02x:%02x:%02x:%02x:%02x:%02x cmd:%d val:%ld\n",
                    mac[0], mac[1], mac[2], mac[3], mac[4], mac[5],
                    cmd_type, (long)val_int);
                esp_err_t err = esp_now_send(mac, (uint8_t *)&packet, sizeof(packet));
                printf("esp_now_send result: %s\n", esp_err_to_name(err));
            }
        }
    }
    cJSON_Delete(root);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    if (event_id == MQTT_EVENT_CONNECTED) {
        printf("MQTT Connected\n");
        esp_mqtt_client_subscribe(event->client, "poly/cmd", 0);
    } else if (event_id == MQTT_EVENT_DATA) {
        char *payload = malloc(event->data_len + 1);
        if (payload) {
            memcpy(payload, event->data, event->data_len);
            payload[event->data_len] = '\0';
            handle_mqtt_message(payload);
            free(payload);
        }
    }   
}
#else
static uint8_t host_mac[6];
static volatile bool imu_reply_pending = false;

static void c3_send_cb(const esp_now_send_info_t *info, esp_now_send_status_t status) {
    printf("C3 reply ack: %s\n", status == ESP_NOW_SEND_SUCCESS ? "OK" : "FAIL");
}

void on_data_recv(const esp_now_recv_info_t *recv_info, const uint8_t *data, int len) {
    if (len < (int)sizeof(espnow_packet_t)) { printf("Packet too short\n"); return; }
    memcpy(host_mac, recv_info->src_addr, 6);
    if (!esp_now_is_peer_exist(host_mac)) {
        esp_now_peer_info_t peer = { .channel = 0, .encrypt = false, .ifidx = ESP_IF_WIFI_STA };
        memcpy(peer.peer_addr, host_mac, 6);
        esp_now_add_peer(&peer);
        printf("Registered host peer: %02x:%02x:%02x:%02x:%02x:%02x\n",
            host_mac[0], host_mac[1], host_mac[2],
            host_mac[3], host_mac[4], host_mac[5]);
    }
    espnow_packet_t *packet = (espnow_packet_t *)data;
    printf("DEBUG: Received Cmd: %d, Val: %d\n", (int)packet->cmd_type, (int)packet->val);
    switch(packet->cmd_type) {
        case 1: driver_set_led(packet->val); break;
        case 0: driver_set_pwm(packet->val); break;
        case 2: imu_reply_pending = true; break;
    }
}
#endif

void app_main(void) {
    esp_log_level_set("wifi", ESP_LOG_VERBOSE);
    esp_log_level_set("espnow", ESP_LOG_VERBOSE);
    driver_init();
    print_mac_address();
    wifi_init_global();
    
#ifdef BUILD_AS_HOST
    wifi_init_sta();
    uint8_t primary;
    wifi_second_chan_t second;
    esp_wifi_get_channel(&primary, &second);
    printf(">>> S3 WiFi channel: %d\n", primary);
    
    int attempts = 0;
    while (wifi_get_ip() == 0 && attempts < 30) {
        printf("Waiting for Wi-Fi... (%d)\n", ++attempts);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    
    host_espnow_init();
    esp_mqtt_client_config_t mqtt_cfg = { .broker.address.uri = "ws://test.mosquitto.org:8080" };
    // Assigning to global handle instead of local variable
    client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
    
#else
    wifi_init_espnow();
    wifi_scan_config_t scan = {
        .ssid = (uint8_t *)"StarkHacks-2",
        .bssid = NULL,
        .channel = 0,
        .show_hidden = false,
        .scan_type = WIFI_SCAN_TYPE_ACTIVE,
        .scan_time.active.min = 100,
        .scan_time.active.max = 300,
    };
    ESP_ERROR_CHECK(esp_wifi_scan_start(&scan, true));

    uint16_t n = 1;
    wifi_ap_record_t ap;
    if (esp_wifi_scan_get_ap_records(&n, &ap) == ESP_OK && n > 0) {
        printf(">>> Found AP on channel %d\n", ap.primary);
        ESP_ERROR_CHECK(esp_wifi_set_channel(ap.primary, WIFI_SECOND_CHAN_NONE));
    } else {
        printf(">>> AP scan failed, falling back to ch 11\n");
        ESP_ERROR_CHECK(esp_wifi_set_channel(11, WIFI_SECOND_CHAN_NONE));
    }
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_register_recv_cb(on_data_recv));
    ESP_ERROR_CHECK(esp_now_register_send_cb(c3_send_cb));
#endif
    while (1) {
#ifndef BUILD_AS_HOST
        if (imu_reply_pending) {
            imu_reply_pending = false;
            imu_data_t imu;
            if (driver_get_imu(&imu)) {
                imu_packet_t pkt = { .ax = imu.ax, .ay = imu.ay, .az = imu.az, .gx = imu.gx, .gy = imu.gy, .gz = imu.gz };
                esp_err_t r = esp_now_send(host_mac, (uint8_t *)&pkt, sizeof(pkt));
                printf("C3 reply send: %s\n", esp_err_to_name(r));
            }
        }
        vTaskDelay(pdMS_TO_TICKS(10));
#else
        // Button logic
        if (driver_get_button() && client != NULL) {
            esp_mqtt_client_publish(client, "poly/telemetry",
                "{\"mac\":\"host\",\"state\":\"pressed\"}", 0, 0, 0);
            vTaskDelay(pdMS_TO_TICKS(300));
            esp_mqtt_client_publish(client, "poly/telemetry",
                "{\"mac\":\"host\",\"state\":\"released\"}", 0, 0, 0);
            vTaskDelay(pdMS_TO_TICKS(200));
        }
        vTaskDelay(pdMS_TO_TICKS(10));
#endif
    }
}