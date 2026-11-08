// Package thingy holds the Nordic Thingy:52 GATT contract (docs/protocol.md):
// UUIDs, pure payload decoders and encoders. It has no I/O.
package thingy

import "strings"

const uuidSuffix = "-9b35-4933-9b10-52ffa9740042"

func thingyUUID(short string) string { return "ef68" + strings.ToLower(short) + uuidSuffix }

func sigUUID(short string) string {
	return "0000" + strings.ToLower(short) + "-0000-1000-8000-00805f9b34fb"
}

// Char identifies a GATT characteristic by service and characteristic UUID (lower case, 128 bit).
type Char struct {
	Service string
	UUID    string
	Name    string
}

func (c Char) String() string { return c.Name }

// Service UUIDs.
var (
	ConfigService      = thingyUUID("0100")
	EnvironmentService = thingyUUID("0200")
	UIService          = thingyUUID("0300")
	MotionService      = thingyUUID("0400")
	SoundService       = thingyUUID("0500")
	BatteryService     = sigUUID("180F")
)

// Characteristics.
var (
	NFCChar = Char{ConfigService, thingyUUID("0109"), "nfc"}

	TemperatureChar = Char{EnvironmentService, thingyUUID("0201"), "temperature"}
	PressureChar    = Char{EnvironmentService, thingyUUID("0202"), "pressure"}
	HumidityChar    = Char{EnvironmentService, thingyUUID("0203"), "humidity"}
	GasChar         = Char{EnvironmentService, thingyUUID("0204"), "gas"}
	ColorChar       = Char{EnvironmentService, thingyUUID("0205"), "color"}
	EnvConfigChar   = Char{EnvironmentService, thingyUUID("0206"), "env_config"}

	LEDChar    = Char{UIService, thingyUUID("0301"), "led"}
	ButtonChar = Char{UIService, thingyUUID("0302"), "button"}

	MotionConfigChar = Char{MotionService, thingyUUID("0401"), "motion_config"}
	TapChar          = Char{MotionService, thingyUUID("0402"), "tap"}
	OrientationChar  = Char{MotionService, thingyUUID("0403"), "orientation"}
	QuaternionChar   = Char{MotionService, thingyUUID("0404"), "quaternion"}
	PedometerChar    = Char{MotionService, thingyUUID("0405"), "pedometer"}
	RawMotionChar    = Char{MotionService, thingyUUID("0406"), "raw_motion"}
	EulerChar        = Char{MotionService, thingyUUID("0407"), "euler"}
	HeadingChar      = Char{MotionService, thingyUUID("0409"), "heading"}
	GravityChar      = Char{MotionService, thingyUUID("040A"), "gravity"}

	SoundConfigChar   = Char{SoundService, thingyUUID("0501"), "sound_config"}
	SpeakerChar       = Char{SoundService, thingyUUID("0502"), "speaker"}
	SpeakerStatusChar = Char{SoundService, thingyUUID("0503"), "speaker_status"}
	MicrophoneChar    = Char{SoundService, thingyUUID("0504"), "microphone"}

	BatteryChar = Char{BatteryService, sigUUID("2A19"), "battery"}
)

// NotifyChars are the characteristics the bridge subscribes to after connecting.
var NotifyChars = []Char{
	TemperatureChar, PressureChar, HumidityChar, GasChar, ColorChar,
	ButtonChar,
	TapChar, OrientationChar, QuaternionChar, PedometerChar, RawMotionChar, EulerChar, HeadingChar,
	SpeakerStatusChar, MicrophoneChar,
	BatteryChar,
}

// GamePausedChars are the notifications that also follow motion_freq_hz but are not needed by a game
// on /api/motion (quaternion and raw motion). The game mode unsubscribes them: at 100 Hz all four
// streams together (400 notifications/s) make the Windows BLE link drop within seconds.
var GamePausedChars = []Char{EulerChar, HeadingChar}

// Motion rate limits of motion_freq_hz (EF680401) in the firmware.
const (
	MinMotionHz = 5
	MaxMotionHz = 200
)

// Services lists every service the bridge uses.
var Services = []string{ConfigService, EnvironmentService, UIService, MotionService, SoundService, BatteryService}

// AppPackage is the Android package the NFC tag opens.
const AppPackage = "ch.disroop.sensorplayground"
