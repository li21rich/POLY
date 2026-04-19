#include "driver.h"
#include "driver/ledc.h"
#include "led_strip.h"
#include <stdio.h>

static led_strip_handle_t led_strip;
// DEVICE MAC ADDRESS: ac:eb:e6:56:4a:d0
#define PIN_LED     10
#define PIN_SERVO   2

// At 50Hz, 14-bit resolution gives 0.061us per tick
// 1ms pulse = 0° = ~164 ticks
// 2ms pulse = 180° = ~328 ticks
#define SERVO_MIN_DUTY   164   // 1ms  = 0°
#define SERVO_MAX_DUTY   328   // 2ms  = 180°

void driver_init(void) {
    // NeoPixel (RMT)
    led_strip_config_t strip_config = {
        .strip_gpio_num = PIN_LED,
        .max_leds = 1,
    };
    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000,
    };
    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));

    // LEDC for MG90S servo — 50Hz, 14-bit
    ledc_timer_config_t ledc_timer = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .timer_num       = LEDC_TIMER_0,
        .duty_resolution = LEDC_TIMER_14_BIT,
        .freq_hz         = 50,
        .clk_cfg         = LEDC_AUTO_CLK
    };
    ledc_timer_config(&ledc_timer);

    ledc_channel_config_t ledc_channel = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = LEDC_CHANNEL_0,
        .timer_sel  = LEDC_TIMER_0,
        .intr_type  = LEDC_INTR_DISABLE,
        .gpio_num   = PIN_SERVO,
        .duty       = SERVO_MIN_DUTY,
        .hpoint     = 0
    };
    ledc_channel_config(&ledc_channel);
    printf("Motor Driver Initialized.\n");
}

void driver_set_led(int32_t hex_color) {
    if (hex_color < 0) {
        led_strip_set_pixel(led_strip, 0, 0, 0, 0);
    } else {
        uint8_t r = (hex_color >> 16) & 0xFF;
        uint8_t g = (hex_color >> 8)  & 0xFF;
        uint8_t b = (hex_color)       & 0xFF;
        led_strip_set_pixel(led_strip, 0, r, g, b);
    }
    led_strip_refresh(led_strip);
}

void driver_set_pwm(int angle) {
    // val is 0-180 degrees
    if (angle < 0)   angle = 0;
    if (angle > 180) angle = 180;
    uint32_t duty = SERVO_MIN_DUTY + ((angle * (SERVO_MAX_DUTY - SERVO_MIN_DUTY)) / 180);
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
    printf("Servo -> %d°\n", angle);
}

bool driver_get_imu(imu_data_t *out) {
    printf("Warning: Motor node has no gyro capability.\n");
    return false;
}