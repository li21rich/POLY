idf_component_register(SRCS "driver_HOST.c" "main.c" "wifi.c"
                       INCLUDE_DIRS ".")
                       # need "driver_HOST.c"if flashing host, "driver_6DOF.c" if flashing gyro, etc