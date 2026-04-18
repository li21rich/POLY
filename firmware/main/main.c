#include "freertos/FreeRTOS.h"
#include "cJSON.h"
#include "driver.h"
#include "sdkconfig.h"
#include "mqtt_client.h"
#include "wifi.h"

void handle_mqtt_message(char* payload) {
    cJSON *root = cJSON_Parse(payload);
    if (root == NULL) return;

    cJSON *cmd = cJSON_GetObjectItem(root, "cmd");
    cJSON *val = cJSON_GetObjectItem(root, "val");

    if (cJSON_IsString(cmd) && cJSON_IsNumber(val)) {
        // Here is where we route to the drivers
        if (strcmp(cmd->valuestring, "motor") == 0) {
            driver_set_pwm(val->valueint);
        } else if (strcmp(cmd->valuestring, "led") == 0) {
            driver_set_led(val->valueint > 0);
        }
    }
    cJSON_Delete(root);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    if (event_id == MQTT_EVENT_CONNECTED) {
        printf("MQTT Connected!\n");
        esp_mqtt_client_subscribe(event->client, "poly/cmd", 0);
    } else if (event_id == MQTT_EVENT_DISCONNECTED) {
        printf("MQTT Disconnected!\n");
    } else if (event_id == MQTT_EVENT_DATA) {
        char *payload = malloc(event->data_len + 1);
        if (payload) {
            memcpy(payload, event->data, event->data_len);
            payload[event->data_len] = '\0';
            printf("Received topic: %.*s\n", event->topic_len, event->topic);
            printf("Received payload: %s\n", payload);
            handle_mqtt_message(payload);
            free(payload);
        }
    }
}
void app_main(void) {
    driver_init();
    driver_set_led(true);
    vTaskDelay(pdMS_TO_TICKS(3000));
    wifi_init_sta();
    while (wifi_get_ip() == 0) {
        printf("Waiting for WiFi...\n");
        vTaskDelay(pdMS_TO_TICKS(3000));
    }
    vTaskDelay(pdMS_TO_TICKS(5000)); // let network stabilize

    //esp_mqtt_client_config_t mqtt_cfg = { .broker.address.uri = "mqtt://test.mosquitto.org:1883" };
    esp_mqtt_client_config_t mqtt_cfg = {   .broker.address.uri = "mqtt://54.36.178.49:1883" };

    esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);

    while(1) { 
        vTaskDelay(pdMS_TO_TICKS(1000)); 
    }
}