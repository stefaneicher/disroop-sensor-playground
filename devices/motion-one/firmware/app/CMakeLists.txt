cmake_minimum_required(VERSION 3.20.0)
# Board motion_one liegt unter firmware/boards/disroop/motion_one
list(APPEND BOARD_ROOT ${CMAKE_CURRENT_SOURCE_DIR}/..)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(motion_one_fw)

set(FW ${CMAKE_CURRENT_SOURCE_DIR}/..)
target_include_directories(app PRIVATE ${FW}/codec/include ${FW}/fusion/include ${FW}/icm/include ${FW}/power/include src)
target_sources(app PRIVATE
  ${FW}/codec/src/thingy_codec.c
  ${FW}/fusion/src/motion_fusion.c
  ${FW}/icm/src/icm45686.c
  ${FW}/power/src/vbat.c
  src/main.c src/ble_thingy.c src/imu_task.c src/ui.c src/battery.c src/board_early.c)
