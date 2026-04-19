#include "driver.h"
#include "led_strip.h"

static led_strip_handle_t led_strip;

#define PIN_LED 8

void driver_init(void) {
    led_strip_config_t strip_config = {
        .strip_gpio_num = PIN_LED,
        .max_leds = 1,
    };
    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000,
    };
    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));
    printf("Host Driver Initialized.\n");
}

void driver_set_led(int32_t hex_color) {
    if (hex_color < 0) {
        led_strip_set_pixel(led_strip, 0, 0, 0, 0);
    } else {
        uint8_t r = (hex_color >> 16) & 0xFF;
        uint8_t g = (hex_color >> 8)  & 0xFF;
        uint8_t b = (hex_color)        & 0xFF;
        led_strip_set_pixel(led_strip, 0, r, g, b);
    }
    led_strip_refresh(led_strip);
}

void driver_set_pwm(int duty_percent) {
    printf("Warning: Host node has no PWM capability.\n");
}

void driver_set_gyro_mode(bool active) {
    printf("Warning: Host node has no gyro capability.\n");
}