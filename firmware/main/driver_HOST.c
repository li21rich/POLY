#include "driver.h"
#include "led_strip.h"
#include "driver/gpio.h"

static led_strip_handle_t led_strip;

#define PIN_LED    8
#define BUTTON_PIN 5 

void driver_init(void) {
    // --- LED Setup ---
    led_strip_config_t strip_config = {
        .strip_gpio_num = PIN_LED,
        .max_leds = 1,
    };
    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000,
    };
    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));
    led_strip_clear(led_strip);

    // --- Button Setup ---
    gpio_reset_pin(BUTTON_PIN);
    gpio_set_direction(BUTTON_PIN, GPIO_MODE_INPUT);
    gpio_set_pull_mode(BUTTON_PIN, GPIO_PULLUP_ONLY);

    printf("Host Driver Initialized with Button on GPIO %d.\n", BUTTON_PIN);
}

bool driver_get_button(void) {
    // Returns true if pressed (LOW because of pull-up)
    return (gpio_get_level(BUTTON_PIN) == 0);
}

// ... keep your existing driver_set_led and other functions ...
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
    printf("Warning: Motor node has no gyro capability.\n");
}

bool driver_get_imu(imu_data_t *out) {
    printf("Warning: Host node has no gyro capability.\n");
    return false;
}