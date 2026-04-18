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
#include "protocol.h"
#include "wifi.h"

#define BUILD_AS_HOST

#ifdef BUILD_AS_HOST
#include "cJSON.h"
#include "mqtt_client.h"

#define MAX_PEERS 8
typedef struct { uint8_t mac[6]; bool active; } peer_entry_t;

static peer_entry_t peer_table[MAX_PEERS] = {//first C3 MAC was: 88:56:a6:2a:14:24
    { .mac = {0x88, 0x56, 0xa6, 0x2a, 0x14, 0x24}, .active = true },
};

static void host_espnow_send_cb(const esp_now_send_info_t *tx_info, esp_now_send_status_t status) {
    printf("ESP-NOW send status: %s\n", status == ESP_NOW_SEND_SUCCESS ? "Success" : "Fail");
}
static void host_espnow_recv_cb(const esp_now_recv_info_t *recv_info, const uint8_t *data, int len) {
    printf("ESP-NOW recv len=%d\n", len);
}

void host_espnow_init(void) {
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_register_send_cb(host_espnow_send_cb));
    ESP_ERROR_CHECK(esp_now_register_recv_cb(host_espnow_recv_cb));
    for (int i = 0; i < MAX_PEERS; i++) {
        if (!peer_table[i].active) continue;
        esp_now_peer_info_t peer = { .channel = 1, .encrypt = false, .ifidx = ESP_IF_WIFI_STA };
        memcpy(peer.peer_addr, peer_table[i].mac, 6);
        ESP_ERROR_CHECK(esp_now_add_peer(&peer));
    }
}

void handle_mqtt_message(char *payload) {
    cJSON *root = cJSON_Parse(payload);
    if (!root) return;
    cJSON *cmd = cJSON_GetObjectItem(root, "cmd");
    cJSON *target = cJSON_GetObjectItem(root, "target");
    cJSON *val = cJSON_GetObjectItem(root, "val");
    if (cJSON_IsString(cmd) && cJSON_IsString(target) && cJSON_IsNumber(val)) {
        if (strcmp(target->valuestring, "host") == 0) {
            if (strcmp(cmd->valuestring, "led") == 0) driver_set_led(val->valueint > 0);
        } else if (strcmp(target->valuestring, "c3_node") == 0) {
            uint8_t cmd_type = (strcmp(cmd->valuestring, "led") == 0) ? 1 : 0;
            espnow_packet_t packet = { .cmd_type = cmd_type, .val = val->valueint };
            for (int i = 0; i < MAX_PEERS; i++) {
                if (peer_table[i].active) esp_now_send(peer_table[i].mac, (uint8_t *)&packet, sizeof(packet));
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

void on_data_recv(const esp_now_recv_info_t *recv_info, const uint8_t *data, int len) {
    if (len < (int)sizeof(espnow_packet_t)) { printf("Packet too short\n"); return; }
    espnow_packet_t *packet = (espnow_packet_t *)data;
    printf("Received ESP-NOW cmd: %d, val: %d\n", (int)packet->cmd_type, (int)packet->val);
    if (packet->cmd_type == 1) driver_set_led(packet->val > 0);
    else if (packet->cmd_type == 0) driver_set_pwm(packet->val);
}

#endif

void app_main(void) {
    driver_init();
    
#ifdef BUILD_AS_HOST
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    printf("S3 MAC: %02x:%02x:%02x:%02x:%02x:%02x\n", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    wifi_init_sta();
    while (wifi_get_ip() == 0) {
        printf("Waiting for Wi-Fi...\n");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    host_espnow_init();
    esp_mqtt_client_config_t mqtt_cfg = { .broker.address.uri = "mqtt://54.36.178.49:1883" };
    esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
#else
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    printf("C3 MAC: %02x:%02x:%02x:%02x:%02x:%02x\n", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    wifi_init_espnow();
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_register_recv_cb(on_data_recv));
    printf("Node ready. Waiting for ESP-NOW packets...\n");
#endif
    while (1) vTaskDelay(pdMS_TO_TICKS(1000));
}