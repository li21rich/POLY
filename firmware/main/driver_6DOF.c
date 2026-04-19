#include "driver.h"
#include "led_strip.h"
#include "driver/i2c.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include <math.h>
#include <string.h>
#include <stdio.h>

static const char *TAG = "6dof_node";
// DEVICE MAC ADDRESS: 88:56:a6:2c:5d:24
// ---- pins / bus ----
#define PIN_LED         10
#define I2C_SDA         8
#define I2C_SCL         9
#define I2C_PORT        I2C_NUM_0
#define I2C_FREQ_HZ     400000

// ---- LSM6DSOX ----
#define LSM_ADDR_A      0x6A
#define LSM_ADDR_B      0x6B
#define REG_WHO_AM_I    0x0F
#define REG_CTRL3_C     0x12
#define REG_CTRL1_XL    0x10
#define REG_CTRL2_G     0x11
#define REG_OUTX_L_G    0x22

#define WHO_LSM6DSOX    0x6C
#define WHO_LSM6DS3TRC  0x6B
#define WHO_LSM6DS3     0x69

#define CFG_CTRL3_C     0x44
#define CFG_CTRL1_XL    0x60
#define CFG_CTRL2_G     0x60

#define ACC_SCALE       0.000061f
#define GYR_SCALE       0.00875f

// ---- state ----
static imu_data_t latest = {0};
static imu_data_t ema_state = {0};
static float alpha = 0.3f;
static bool ema_init = false;

static uint8_t imu_addr = 0;
static led_strip_handle_t led_strip;

// ================= I2C =================

static esp_err_t imu_write(uint8_t reg, uint8_t val) {
    uint8_t buf[2] = { reg, val };
    return i2c_master_write_to_device(I2C_PORT, imu_addr, buf, 2, pdMS_TO_TICKS(50));
}

static esp_err_t imu_read(uint8_t reg, uint8_t *data, size_t len) {
    return i2c_master_write_read_device(I2C_PORT, imu_addr, &reg, 1, data, len, pdMS_TO_TICKS(50));
}

static bool imu_probe(uint8_t addr) {
    imu_addr = addr;
    uint8_t who = 0;
    if (imu_read(REG_WHO_AM_I, &who, 1) != ESP_OK) return false;

    ESP_LOGI(TAG, "WHO_AM_I: 0x%02X", who);
    return (who == WHO_LSM6DSOX || who == WHO_LSM6DS3TRC || who == WHO_LSM6DS3);
}

static esp_err_t imu_setup(void) {
    ESP_ERROR_CHECK(imu_write(REG_CTRL3_C, CFG_CTRL3_C));
    vTaskDelay(pdMS_TO_TICKS(10));
    ESP_ERROR_CHECK(imu_write(REG_CTRL1_XL, CFG_CTRL1_XL));
    ESP_ERROR_CHECK(imu_write(REG_CTRL2_G, CFG_CTRL2_G));
    vTaskDelay(pdMS_TO_TICKS(20));
    return ESP_OK;
}

// ================= IMU =================

static bool read_raw(imu_data_t *out) {
    uint8_t buf[12];
    if (imu_read(REG_OUTX_L_G, buf, 12) != ESP_OK) return false;

    int16_t gx = (int16_t)((buf[1] << 8) | buf[0]);
    int16_t gy = (int16_t)((buf[3] << 8) | buf[2]);
    int16_t gz = (int16_t)((buf[5] << 8) | buf[4]);
    int16_t ax = (int16_t)((buf[7] << 8) | buf[6]);
    int16_t ay = (int16_t)((buf[9] << 8) | buf[8]);
    int16_t az = (int16_t)((buf[11] << 8) | buf[10]);

    out->ax = ax * ACC_SCALE;
    out->ay = ay * ACC_SCALE;
    out->az = az * ACC_SCALE;
    out->gx = gx * GYR_SCALE;
    out->gy = gy * GYR_SCALE;
    out->gz = gz * GYR_SCALE;

    return true;
}

static void filter_ema(const imu_data_t *in, imu_data_t *out) {
    if (!ema_init) {
        *out = *in;
        ema_init = true;
        return;
    }

    float a = alpha;
    float b = 1.0f - a;

    out->ax = a * in->ax + b * out->ax;
    out->ay = a * in->ay + b * out->ay;
    out->az = a * in->az + b * out->az;
    out->gx = a * in->gx + b * out->gx;
    out->gy = a * in->gy + b * out->gy;
    out->gz = a * in->gz + b * out->gz;
}

static void imu_task(void *arg) {
    imu_data_t raw;
    TickType_t last = xTaskGetTickCount();

    while (1) {
        if (read_raw(&raw)) {
            filter_ema(&raw, &ema_state);
            latest = ema_state;
        }

        vTaskDelayUntil(&last, pdMS_TO_TICKS(100)); // 10 Hz
    }
}

// ================= API =================

void driver_init(void) {
    // LED
    led_strip_config_t strip_config = {
        .strip_gpio_num = PIN_LED,
        .max_leds = 1,
    };

    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000,
    };

    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));
    led_strip_clear(led_strip);

    // I2C
    i2c_config_t conf = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = I2C_SDA,
        .scl_io_num = I2C_SCL,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_FREQ_HZ,
    };

    ESP_ERROR_CHECK(i2c_param_config(I2C_PORT, &conf));
    ESP_ERROR_CHECK(i2c_driver_install(I2C_PORT, I2C_MODE_MASTER, 0, 0, 0));

    if (!imu_probe(LSM_ADDR_A) && !imu_probe(LSM_ADDR_B)) {
        ESP_LOGE(TAG, "IMU not found");
        driver_set_led(0xFF0000);
        return;
    }

    ESP_ERROR_CHECK(imu_setup());

    xTaskCreate(imu_task, "imu_task", 4096, NULL, 5, NULL);

    driver_set_led(0x00FF00);
    vTaskDelay(pdMS_TO_TICKS(200));
    driver_set_led(-1);

    ESP_LOGI(TAG, "6DOF ready");
}

// ================= LED =================

void driver_set_led(int32_t hex_color) {
    if (hex_color < 0) {
        led_strip_set_pixel(led_strip, 0, 0, 0, 0);
    } else {
        uint8_t r = (hex_color >> 16) & 0xFF;
        uint8_t g = (hex_color >> 8) & 0xFF;
        uint8_t b = (hex_color) & 0xFF;
        led_strip_set_pixel(led_strip, 0, r, g, b);
    }
    led_strip_refresh(led_strip);
}

// ================= UNUSED =================

void driver_set_pwm(int duty_percent) {
    printf("Warning: Motor node has no gyro capability.\n");
}

// ================= GET =================

bool driver_get_imu(imu_data_t *out) {
    if (!out) return false;
    *out = latest;
    return true;
}