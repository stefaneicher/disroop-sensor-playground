# Firmware-Image fuer Disroop Motion One (Name: disroop-motion-one-fw).
# Zephyr-Workspace liegt IM Image unter /opt/zephyrproject (reproduzierbar, kein Volume noetig).
# Schlank: Zephyr flach geklont, nur Module hal_nordic, CMSIS, mbedtls, tf-psa-crypto (BLE-Krypto), Zephyr-SDK minimal mit nur arm-zephyr-eabi,
# dazu gcc + Unity fuer Host-Unit-Tests. Bauen und benutzen: ./project hw fw-image | ./project hw fw "<cmd>"
FROM debian:trixie-slim

ARG ZEPHYR_VERSION=v4.5.0
ARG SDK_VERSION=1.0.1
ARG UNITY_VERSION=v2.6.1

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl wget git xz-utils file make cmake ninja-build device-tree-compiler gcc libc6-dev \
        python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Python-Umgebung fuer west und das Zephyr-Buildsystem
ENV VIRTUAL_ENV=/opt/venv PATH=/opt/venv/bin:$PATH
RUN python3 -m venv /opt/venv && pip install --no-cache-dir west

# Zephyr-Workspace: nur der Tag, ohne Historie; Projekt-Filter laedt nur die fuer nRF52 noetigen Module
WORKDIR /opt/zephyrproject
RUN git clone --depth 1 --branch ${ZEPHYR_VERSION} https://github.com/zephyrproject-rtos/zephyr.git zephyr \
    && west init -l zephyr \
    && west config manifest.project-filter -- '-.*,+hal_nordic,+cmsis,+cmsis_6,+mbedtls,+tf-psa-crypto' \
    && west update --narrow -o=--depth=1 \
    && pip install --no-cache-dir -r zephyr/scripts/requirements-base.txt \
    && find /opt/zephyrproject -name .git -type d -prune -exec rm -rf {} + \
    && test -f zephyr/CMakeLists.txt

# Zephyr-SDK minimal, nur ARM-Toolchain
RUN cd /opt && curl -fsSL -o sdk.tar.xz https://github.com/zephyrproject-rtos/sdk-ng/releases/download/v${SDK_VERSION}/zephyr-sdk-${SDK_VERSION}_linux-x86_64_minimal.tar.xz \
    && tar xf sdk.tar.xz && rm sdk.tar.xz \
    && cd zephyr-sdk-${SDK_VERSION} && ./setup.sh -t arm-zephyr-eabi -c \
    && rm -rf /root/.cache

# Unity (ThrowTheSwitch) fuer reine C-Host-Tests
RUN git clone --depth 1 --branch ${UNITY_VERSION} https://github.com/ThrowTheSwitch/Unity.git /opt/unity \
    && rm -rf /opt/unity/.git

# west laeuft im Container als Host-User: zephyr.base vorab setzen, Konfiguration beschreibbar machen
RUN cd /opt/zephyrproject && west config zephyr.base zephyr && chmod -R a+rwX /opt/zephyrproject/.west

ENV ZEPHYR_BASE=/opt/zephyrproject/zephyr \
    ZEPHYR_SDK_INSTALL_DIR=/opt/zephyr-sdk-${SDK_VERSION} \
    ZEPHYR_TOOLCHAIN_VARIANT=zephyr \
    UNITY_DIR=/opt/unity \
    CMAKE_PREFIX_PATH=/opt/zephyr-sdk-${SDK_VERSION}/cmake \
    HOME=/tmp
WORKDIR /workspace

# Segger RTT (Q-02: Debug nur SWD/RTT, kein UART) – eigene Schicht, damit der Cache oben erhalten bleibt
RUN cd /opt/zephyrproject && west config manifest.project-filter -- '-.*,+hal_nordic,+cmsis,+cmsis_6,+mbedtls,+tf-psa-crypto,+segger' \
    && west update --narrow -o=--depth=1 segger \
    && find /opt/zephyrproject/modules/debug -name .git -type d -prune -exec rm -rf {} + \
    && test -f modules/debug/segger/SEGGER/SEGGER_RTT.c && chmod -R a+rwX /opt/zephyrproject/.west

# Adafruit nRF52 Bootloader (Q-01) braucht newlib-nano (nosys/nano.specs); Zephyr-SDK hat nur picolibc
RUN apt-get update && apt-get install -y --no-install-recommends gcc-arm-none-eabi libnewlib-arm-none-eabi \
    && rm -rf /var/lib/apt/lists/*
