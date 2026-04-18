#include "driver.h"
#include "driver/gpio.h"
#include <stdio.h>

// MAC: 88:56:a6:2c:5d:24
#define PIN_LED 10 

void driver_init(void) {
    // Initialize LED
    gpio_reset_pin(PIN_LED);
    gpio_set_direction(PIN_LED, GPIO_MODE_OUTPUT);
    
    // Initialize Gyro (I2C logic would go here)
    printf("6-DOF Driver Initialized.\n");
}

void driver_set_led(bool on) {
    gpio_set_level(PIN_LED, on ? 1 : 0);
}

void driver_set_pwm(int duty_percent) {
    // 6-DOF node does not have a motor
    printf("Warning: 6-DOF node has no motor/PWM capability.\n");
}

void driver_set_gyro_mode(bool active) {
    if (active) {
        printf("Gyroscope streaming enabled.\n");
    } else {
        printf("Gyroscope disabled.\n");
    }
}