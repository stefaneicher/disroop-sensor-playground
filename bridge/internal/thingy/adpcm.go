package thingy

import (
	"fmt"
	"math"
)

var imaIndexTable = [16]int{-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8}

var imaStepTable = [89]int{
	7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
	50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
	253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
	1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
	3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
	12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
}

// DecodeADPCMFrame decodes one Thingy microphone frame: i16 predictor, u8 step index,
// then 4 bit IMA-ADPCM samples, low nibble first.
func DecodeADPCMFrame(b []byte) ([]int16, error) {
	if err := need(b, 3); err != nil {
		return nil, err
	}
	pred := int(int16(le.Uint16(b)))
	index := int(b[2])
	if index > 88 {
		return nil, fmt.Errorf("adpcm step index %d out of range", index)
	}
	out := make([]int16, 0, 2*(len(b)-3))
	for _, v := range b[3:] {
		for _, nibble := range [2]int{int(v & 0x0F), int(v >> 4)} {
			pred, index = imaStep(pred, index, nibble)
			out = append(out, int16(pred))
		}
	}
	return out, nil
}

func imaStep(pred, index, nibble int) (int, int) {
	step := imaStepTable[index]
	diff := step >> 3
	if nibble&4 != 0 {
		diff += step
	}
	if nibble&2 != 0 {
		diff += step >> 1
	}
	if nibble&1 != 0 {
		diff += step >> 2
	}
	if nibble&8 != 0 {
		pred -= diff
	} else {
		pred += diff
	}
	pred = max(math.MinInt16, min(math.MaxInt16, pred))
	index = max(0, min(88, index+imaIndexTable[nibble]))
	return pred, index
}

// SilenceDBFS is the floor of LevelDBFS.
const SilenceDBFS = -100.0

// LevelDBFS returns the RMS level of the samples in dBFS, clamped to -100..0.
func LevelDBFS(samples []int16) float64 {
	if len(samples) == 0 {
		return SilenceDBFS
	}
	var sum float64
	for _, s := range samples {
		sum += float64(s) * float64(s)
	}
	rms := math.Sqrt(sum / float64(len(samples)))
	if rms == 0 {
		return SilenceDBFS
	}
	return max(SilenceDBFS, min(0, 20*math.Log10(rms/32768)))
}

// LevelMeter smooths levels with an exponential moving average.
type LevelMeter struct {
	alpha   float64
	value   float64
	started bool
}

// NewLevelMeter returns a meter with smoothing factor alpha (0..1, weight of the new value).
func NewLevelMeter(alpha float64) *LevelMeter { return &LevelMeter{alpha: alpha} }

// Add feeds a new level and returns the smoothed level.
func (m *LevelMeter) Add(db float64) float64 {
	if !m.started {
		m.value, m.started = db, true
		return db
	}
	m.value = m.alpha*db + (1-m.alpha)*m.value
	return m.value
}
