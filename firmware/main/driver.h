#pragma once
#include <stdbool.h>
// driver.h
void driver_init(void);
void driver_set_led(bool on);
void driver_set_pwm(int duty_percent);
void driver_set_gyro_mode(bool active); // Capability: Gyro