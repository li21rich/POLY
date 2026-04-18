#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "wifi.h"
#include "sdkconfig.h"
#include <string.h> 

static volatile int got_ip = 0;

int wifi_get_ip(void) {
    return got_ip;
}

static void event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        wifi_event_sta_disconnected_t* d = (wifi_event_sta_disconnected_t*) event_data;
        got_ip = 0;
        printf("Disconnected, reason: %d\n", d->reason);
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        got_ip = 1;
        printf("Wi-Fi Connected!\n");
    }
}

void wifi_init_sta() {
    nvs_flash_init();
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL, NULL);
    esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL, NULL);
    esp_wifi_set_ps(WIFI_PS_NONE);
    esp_wifi_set_storage(WIFI_STORAGE_RAM);
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_start();

    wifi_ap_record_t ap_list[10];
    uint16_t count = 10;
    esp_wifi_scan_start(NULL, true);
    esp_wifi_scan_get_ap_records(&count, ap_list);
    for (int i = 0; i < count; i++) {
        printf("SSID:[%s] auth:%d chan:%d rssi:%d\n",
            ap_list[i].ssid,
            ap_list[i].authmode,
            ap_list[i].primary,
            ap_list[i].rssi);
    }
    wifi_config_t wifi_config = {
        .sta = {
            .ssid = "RichardL",
            .password = "richarde",
                .pmf_cfg = {
                .capable  = true,   // Accept PMF if AP requires it (WPA3 needs this)
                .required = false,  // Don't require it (keeps WPA2 compat)
            },
            .bssid_set = false, 
        },
    };
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_set_ps(WIFI_PS_NONE);
    printf("Attempting SSID: [%s] len=%d\n", (char*)wifi_config.sta.ssid, strlen((char*)wifi_config.sta.ssid));
    esp_wifi_connect();
}