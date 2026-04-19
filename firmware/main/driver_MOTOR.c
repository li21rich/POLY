#include "driver.h"
#include "driver/ledc.h"
#include "led_strip.h"

static led_strip_handle_t led_strip;

#define PIN_LED 8  // Yellow wire for NeoPixel
#define PIN_PWM 4  // PWM signal for Actuator

void driver_init(void) {
    // 1. NeoPixel (RMT)
    led_strip_config_t strip_config = {
        .strip_gpio_num = PIN_LED,
        .max_leds = 1,
    };
    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000,
    };
    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));

    // 2. LEDC PWM for Actuator
    ledc_timer_config_t ledc_timer = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .timer_num       = LEDC_TIMER_0,
        .duty_resolution = LEDC_TIMER_10_BIT,
        .freq_hz         = 5000,
        .clk_cfg         = LEDC_AUTO_CLK
    };
    ledc_timer_config(&ledc_timer);

    ledc_channel_config_t ledc_channel = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = LEDC_CHANNEL_0,
        .timer_sel  = LEDC_TIMER_0,
        .intr_type  = LEDC_INTR_DISABLE,
        .gpio_num   = PIN_PWM,
        .duty       = 0,
        .hpoint     = 0
    };
    ledc_channel_config(&ledc_channel);
    printf("Motor Driver Initialized.\n");
}

void driver_set_led(bool on) {
    if (on) {
        led_strip_set_pixel(led_strip, 0, 255, 125, 125);
    } else {
        led_strip_set_pixel(led_strip, 0, 0, 0, 0);
    }
    led_strip_refresh(led_strip);
}

void driver_set_pwm(int duty_percent) {
    uint32_t duty = (duty_percent * 1023) / 100;
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
}

void driver_set_gyro_mode(bool active) {
    printf("Warning: Motor node has no gyro capability.\n");
}