# Host-Unit-Tests (gcc + Unity) im Image disroop-motion-one-fw: make test
UNITY_DIR ?= /opt/unity
BUILD ?= build/host
CFLAGS = -std=c11 -Wall -Wextra -Werror -O2 -Icodec/include -Ifusion/include -Iicm/include -I$(UNITY_DIR)/src
UNITY = $(UNITY_DIR)/src/unity.c
HDRS = $(wildcard codec/include/*.h fusion/include/*.h icm/include/*.h)

TESTS = test_thingy_codec test_thingy_profile test_motion_fusion test_icm45686
SRC_test_thingy_codec = codec/src/thingy_codec.c
SRC_test_thingy_profile = codec/src/thingy_codec.c
SRC_test_motion_fusion = fusion/src/motion_fusion.c
SRC_test_icm45686 = icm/src/icm45686.c

.SECONDEXPANSION:
$(BUILD)/%: tests/%.c $$(SRC_%) $(HDRS)
	mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -o $@ $< $(SRC_$*) $(UNITY) -lm

# Alle Tests laufen, auch wenn einer fehlschlaegt; Exit != 0, wenn einer fehlschlaegt.
test: $(addprefix $(BUILD)/,$(TESTS))
	@rc=0; for t in $(TESTS); do echo "== $$t"; ./$(BUILD)/$$t || rc=1; done; exit $$rc

clean:
	rm -rf $(BUILD)

.PHONY: test clean
