#pragma once
#include "driver/gpio.h"

void driver_init(void);
void driver_set_pwm(int duty_percent); // 0-100
void driver_set_led(bool on);