#include "driver.h"
#include "driver/ledc.h"
#include "led_strip.h"
#include "esp_log.h"
#include <stdio.h>

static const char *TAG = "motor_node";
static led_strip_handle_t led_strip;

// DEVICE MAC ADDRESS: ac:eb:e6:56:4a:d0
#define PIN_LED     10
#define PIN_SERVO   2

#define SERVO_TIMER       LEDC_TIMER_0
#define SERVO_MODE        LEDC_LOW_SPEED_MODE
#define SERVO_CHANNEL     LEDC_CHANNEL_0
#define SERVO_RES_BITS    14
#define SERVO_RES_MAX     ((1 << SERVO_RES_BITS) - 1)
#define SERVO_FREQ_HZ     50
#define SERVO_PERIOD_US   (1000000 / SERVO_FREQ_HZ)  // 20000

// MG90S: full range pulse widths
#define SERVO_US_MIN      600
#define SERVO_US_MAX      2400
#define SERVO_US_CENTER   1500

static inline uint32_t us_to_duty(uint32_t us) {
    return (uint32_t)(((uint64_t)us * SERVO_RES_MAX) / SERVO_PERIOD_US);
}

static void servo_write_us(uint32_t us) {
    if (us < SERVO_US_MIN) us = SERVO_US_MIN;
    if (us > SERVO_US_MAX) us = SERVO_US_MAX;
    esp_err_t e1 = ledc_set_duty(SERVO_MODE, SERVO_CHANNEL, us_to_duty(us));
    esp_err_t e2 = ledc_update_duty(SERVO_MODE, SERVO_CHANNEL);
    if (e1 != ESP_OK || e2 != ESP_OK) {
        ESP_LOGE(TAG, "LEDC write failed: %d/%d", e1, e2);
    }
}

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
    led_strip_clear(led_strip);

    // LEDC for MG90S
    ledc_timer_config_t ledc_timer = {
        .speed_mode      = SERVO_MODE,
        .timer_num       = SERVO_TIMER,
        .duty_resolution = SERVO_RES_BITS,
        .freq_hz         = SERVO_FREQ_HZ,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));

    ledc_channel_config_t ledc_channel = {
        .speed_mode = SERVO_MODE,
        .channel    = SERVO_CHANNEL,
        .timer_sel  = SERVO_TIMER,
        .intr_type  = LEDC_INTR_DISABLE,
        .gpio_num   = PIN_SERVO,
        .duty       = us_to_duty(SERVO_US_CENTER),
        .hpoint     = 0,
    };
    ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));

    ESP_LOGI(TAG, "Motor Driver Initialized. Servo centered at %dus.", SERVO_US_CENTER);
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

// angle: 0..180° -> pulse SERVO_US_MIN..SERVO_US_MAX
void driver_set_pwm(int angle) {
    if (angle < 0)   angle = 0;
    if (angle > 180) angle = 180;
    uint32_t us = SERVO_US_MIN +
                  ((uint32_t)angle * (SERVO_US_MAX - SERVO_US_MIN)) / 180;
    servo_write_us(us);
    ESP_LOGI(TAG, "Servo -> %d° (%lu us)", angle, (unsigned long)us);
}

bool driver_get_imu(imu_data_t *out) {
    if (out) {
        out->ax = out->ay = out->az = 0.0f;
        out->gx = out->gy = out->gz = 0.0f;
    }
    return false;
}