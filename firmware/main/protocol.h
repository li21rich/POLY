#pragma once
#include <stdint.h>
typedef struct {
    uint8_t cmd_type; // 1 = LED, 0 = Motor
    int32_t val;
} espnow_packet_t;