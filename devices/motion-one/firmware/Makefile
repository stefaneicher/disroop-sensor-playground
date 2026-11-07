# Host-Unit-Tests (gcc + Unity) im Image disroop-motion-one-fw: make test
UNITY_DIR ?= /opt/unity
BUILD ?= build/host
CFLAGS = -std=c11 -Wall -Wextra -Werror -O2 -Icodec/include -I$(UNITY_DIR)/src

$(BUILD)/test_thingy_codec: tests/test_thingy_codec.c codec/src/thingy_codec.c codec/include/thingy_codec.h
	mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -o $@ tests/test_thingy_codec.c codec/src/thingy_codec.c $(UNITY_DIR)/src/unity.c -lm

test: $(BUILD)/test_thingy_codec
	./$(BUILD)/test_thingy_codec

clean:
	rm -rf build

.PHONY: test clean
