#include "driver.h"
#include "led_strip.h"
#include "driver/i2c.h"
#include <stdio.h>
#include <string.h>

// MAC: 88:56:a6:2c:5d:24
#define PIN_LED         10
#define I2C_SDA         8
#define I2C_SCL         9
#define I2C_PORT        I2C_NUM_0
#define I2C_FREQ_HZ     400000

// LSM9DS1 I2C addresses
#define LSM_AG_ADDR     0x6B   // Accel/Gyro
#define LSM_MAG_ADDR    0x1E   // Magnetometer (unused here)

// LSM9DS1 registers
#define REG_WHO_AM_I    0x0F   // Should return 0x68
#define REG_CTRL_REG1_G 0x10   // Gyro ODR/power
#define REG_CTRL_REG6_XL 0x20  // Accel ODR/power
#define REG_OUT_X_L_G   0x18   // Gyro X low byte (6 bytes: XL,XH,YL,YH,ZL,ZH)
#define REG_OUT_X_L_XL  0x28   // Accel X low byte (6 bytes)

// Sensitivity (from LSM9DS1 datasheet, ±245dps / ±2g defaults)
#define GYRO_SENS       0.00875f   // dps/LSB
#define ACCEL_SENS      0.000061f  // g/LSB

static led_strip_handle_t led_strip;
static bool gyro_enabled = false;

// ── I2C helpers ────────────────────────────────────────────────────────────

static esp_err_t i2c_write_reg(uint8_t addr, uint8_t reg, uint8_t val) {
    uint8_t buf[2] = { reg, val };
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (addr << 1) | I2C_MASTER_WRITE, true);
    i2c_master_write(cmd, buf, 2, true);
    i2c_master_stop(cmd);
    esp_err_t err = i2c_master_cmd_begin(I2C_PORT, cmd, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd);
    return err;
}

static esp_err_t i2c_read_regs(uint8_t addr, uint8_t reg, uint8_t *buf, size_t len) {
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (addr << 1) | I2C_MASTER_WRITE, true);
    i2c_master_write_byte(cmd, reg, true);
    i2c_master_start(cmd);  // repeated start
    i2c_master_write_byte(cmd, (addr << 1) | I2C_MASTER_READ, true);
    i2c_master_read(cmd, buf, len, I2C_MASTER_LAST_NACK);
    i2c_master_stop(cmd);
    esp_err_t err = i2c_master_cmd_begin(I2C_PORT, cmd, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd);
    return err;
}

// ── Driver interface ────────────────────────────────────────────────────────

void driver_init(void) {
    // LED strip
    led_strip_config_t strip_config = {
        .strip_gpio_num = PIN_LED,
        .max_leds = 1,
    };
    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000,
    };
    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));

    // I2C master
    i2c_config_t conf = {
        .mode             = I2C_MODE_MASTER,
        .sda_io_num       = I2C_SDA,
        .scl_io_num       = I2C_SCL,
        .sda_pullup_en    = GPIO_PULLUP_ENABLE,
        .scl_pullup_en    = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_FREQ_HZ,
    };
    ESP_ERROR_CHECK(i2c_param_config(I2C_PORT, &conf));
    ESP_ERROR_CHECK(i2c_driver_install(I2C_PORT, I2C_MODE_MASTER, 0, 0, 0));

    // Verify WHO_AM_I
    uint8_t who = 0;
    i2c_read_regs(LSM_AG_ADDR, REG_WHO_AM_I, &who, 1);
    if (who == 0x68) {
        printf("LSM9DS1 found (WHO_AM_I=0x%02x)\n", who);
    } else {
        printf("WARNING: LSM9DS1 not found (got 0x%02x) — check wiring\n", who);
    }

    // Leave both sensors in power-down until explicitly enabled
    i2c_write_reg(LSM_AG_ADDR, REG_CTRL_REG1_G,  0x00);  // gyro off
    i2c_write_reg(LSM_AG_ADDR, REG_CTRL_REG6_XL, 0x00);  // accel off

    printf("6-DOF Driver Initialized.\n");
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

void driver_set_gyro_mode(bool active) {
    if (active) {
        // 952 Hz ODR, ±245 dps  (CTRL_REG1_G: ODR=1100, FS=00, BW=00 → 0xC0)
        i2c_write_reg(LSM_AG_ADDR, REG_CTRL_REG1_G,  0xC0);
        // 952 Hz ODR, ±2g       (CTRL_REG6_XL: ODR=1100, FS=00 → 0xC0)
        i2c_write_reg(LSM_AG_ADDR, REG_CTRL_REG6_XL, 0xC0);
        gyro_enabled = true;
        printf("IMU enabled (952 Hz).\n");
    } else {
        i2c_write_reg(LSM_AG_ADDR, REG_CTRL_REG1_G,  0x00);
        i2c_write_reg(LSM_AG_ADDR, REG_CTRL_REG6_XL, 0x00);
        gyro_enabled = false;
        printf("IMU powered down.\n");
    }
}

bool driver_get_gyro(imu_data_t *out) {
    if (!gyro_enabled || !out) return false;

    uint8_t buf[6];

    // Gyro (assert MSB for auto-increment: reg | 0x80)
    if (i2c_read_regs(LSM_AG_ADDR, REG_OUT_X_L_G | 0x80, buf, 6) != ESP_OK) return false;
    int16_t gx_raw = (int16_t)((buf[1] << 8) | buf[0]);
    int16_t gy_raw = (int16_t)((buf[3] << 8) | buf[2]);
    int16_t gz_raw = (int16_t)((buf[5] << 8) | buf[4]);
    out->gx = gx_raw * GYRO_SENS;
    out->gy = gy_raw * GYRO_SENS;
    out->gz = gz_raw * GYRO_SENS;

    // Accel
    if (i2c_read_regs(LSM_AG_ADDR, REG_OUT_X_L_XL | 0x80, buf, 6) != ESP_OK) return false;
    int16_t ax_raw = (int16_t)((buf[1] << 8) | buf[0]);
    int16_t ay_raw = (int16_t)((buf[3] << 8) | buf[2]);
    int16_t az_raw = (int16_t)((buf[5] << 8) | buf[4]);
    out->ax = ax_raw * ACCEL_SENS;
    out->ay = ay_raw * ACCEL_SENS;
    out->az = az_raw * ACCEL_SENS;

    return true;
}

void driver_set_pwm(int duty_percent) {
    printf("Warning: 6-DOF node has no PWM capability.\n");
}