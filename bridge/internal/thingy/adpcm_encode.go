package thingy

// EncodeADPCMFrame encodes samples as one Thingy microphone frame (the inverse of DecodeADPCMFrame).
// The simulator uses it to produce realistic payloads.
func EncodeADPCMFrame(samples []int16) []byte {
	if len(samples) == 0 {
		return []byte{0, 0, 0}
	}
	pred, index := int(samples[0]), 0
	out := []byte{byte(uint16(pred)), byte(uint16(pred) >> 8), byte(index)}
	var pending byte
	for i, s := range samples {
		nibble := imaNibble(pred, index, int(s))
		pred, index = imaStep(pred, index, nibble)
		if i%2 == 0 {
			pending = byte(nibble)
		} else {
			out = append(out, pending|byte(nibble)<<4)
		}
	}
	if len(samples)%2 == 1 {
		out = append(out, pending)
	}
	return out
}

func imaNibble(pred, index, sample int) int {
	step := imaStepTable[index]
	diff := sample - pred
	nibble := 0
	if diff < 0 {
		nibble, diff = 8, -diff
	}
	for bit, s := 4, step; bit > 0; bit, s = bit>>1, s>>1 {
		if diff >= s {
			nibble |= bit
			diff -= s
		}
	}
	return nibble
}
