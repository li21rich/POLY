#pragma once
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    float ax, ay, az;  // accelerometer (g)
    float gx, gy, gz;  // gyroscope (dps)
} imu_data_t;

void driver_init(void);
void driver_set_led(int32_t hex_color);
void driver_set_pwm(int duty_percent);
void driver_set_gyro_mode(bool active);
bool driver_get_gyro(imu_data_t *out);