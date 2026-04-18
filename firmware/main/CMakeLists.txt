idf_component_register(SRCS "driver.c" "main.c" "wifi.c"
                       INCLUDE_DIRS ".")
                       # need "driver.c"if flashing host, "driver_6DOF.c" if flashing gyro, etc