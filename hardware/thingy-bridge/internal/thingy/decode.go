package thingy

import (
	"encoding/binary"
	"errors"
	"fmt"
)

// ErrShortPayload is returned when a notification is shorter than its format.
var ErrShortPayload = errors.New("payload too short")

// XYZ is a three axis vector.
type XYZ struct{ X, Y, Z float64 }

// RawMotion is the decoded 0406 characteristic.
type RawMotion struct {
	Accel   XYZ // g
	Gyro    XYZ // °/s
	Compass XYZ // µT
}

// Gas is the decoded 0204 characteristic.
type Gas struct{ ECO2, TVOC int }

// Color is the decoded 0205 characteristic.
type Color struct{ R, G, B, Clear int }

// Euler angles in degrees.
type Euler struct{ Roll, Pitch, Yaw float64 }

// Quaternion is a unit quaternion.
type Quaternion struct{ W, X, Y, Z float64 }

// Tap is a tap event.
type Tap struct {
	Direction string
	Count     int
}

// Pedometer is the decoded 0405 characteristic.
type Pedometer struct {
	Steps  int
	TimeMS int
}

var le = binary.LittleEndian

func need(b []byte, n int) error {
	if len(b) < n {
		return fmt.Errorf("%w: got %d bytes, need %d", ErrShortPayload, len(b), n)
	}
	return nil
}

func i16(b []byte) float64 { return float64(int16(le.Uint16(b))) }
func i32(b []byte) float64 { return float64(int32(le.Uint32(b))) }

// DecodeTemperature returns °C.
func DecodeTemperature(b []byte) (float64, error) {
	if err := need(b, 2); err != nil {
		return 0, err
	}
	return float64(int8(b[0])) + float64(b[1])/100, nil
}

// DecodePressure returns hPa.
func DecodePressure(b []byte) (float64, error) {
	if err := need(b, 5); err != nil {
		return 0, err
	}
	return i32(b) + float64(b[4])/100, nil
}

// DecodeHumidity returns %.
func DecodeHumidity(b []byte) (int, error) {
	if err := need(b, 1); err != nil {
		return 0, err
	}
	return int(b[0]), nil
}

// DecodeGas returns eCO2 ppm and TVOC ppb.
func DecodeGas(b []byte) (Gas, error) {
	if err := need(b, 4); err != nil {
		return Gas{}, err
	}
	return Gas{ECO2: int(le.Uint16(b)), TVOC: int(le.Uint16(b[2:]))}, nil
}

// DecodeColor returns raw RGBC counts.
func DecodeColor(b []byte) (Color, error) {
	if err := need(b, 8); err != nil {
		return Color{}, err
	}
	return Color{
		R: int(le.Uint16(b)), G: int(le.Uint16(b[2:])),
		B: int(le.Uint16(b[4:])), Clear: int(le.Uint16(b[6:])),
	}, nil
}

func scaledXYZ(b []byte, div float64) XYZ {
	return XYZ{X: i16(b) / div, Y: i16(b[2:]) / div, Z: i16(b[4:]) / div}
}

// DecodeRawMotion decodes accelerometer, gyroscope and compass.
func DecodeRawMotion(b []byte) (RawMotion, error) {
	if err := need(b, 18); err != nil {
		return RawMotion{}, err
	}
	return RawMotion{
		Accel:   scaledXYZ(b[0:], 1024),
		Gyro:    scaledXYZ(b[6:], 32),
		Compass: scaledXYZ(b[12:], 16),
	}, nil
}

// DecodeEuler returns roll, pitch, yaw in degrees.
func DecodeEuler(b []byte) (Euler, error) {
	if err := need(b, 12); err != nil {
		return Euler{}, err
	}
	return Euler{Roll: i32(b) / 65536, Pitch: i32(b[4:]) / 65536, Yaw: i32(b[8:]) / 65536}, nil
}

// DecodeHeading returns the compass heading in degrees.
func DecodeHeading(b []byte) (float64, error) {
	if err := need(b, 4); err != nil {
		return 0, err
	}
	return i32(b) / 65536, nil
}

// DecodeQuaternion decodes four Q2.30 values.
func DecodeQuaternion(b []byte) (Quaternion, error) {
	if err := need(b, 16); err != nil {
		return Quaternion{}, err
	}
	const q30 = 1 << 30
	return Quaternion{W: i32(b) / q30, X: i32(b[4:]) / q30, Y: i32(b[8:]) / q30, Z: i32(b[12:]) / q30}, nil
}

var tapDirections = map[byte]string{1: "X+", 2: "X-", 3: "Y+", 4: "Y-", 5: "Z+", 6: "Z-"}

// DecodeTap decodes a tap event.
func DecodeTap(b []byte) (Tap, error) {
	if err := need(b, 2); err != nil {
		return Tap{}, err
	}
	dir, ok := tapDirections[b[0]]
	if !ok {
		return Tap{}, fmt.Errorf("unknown tap direction %d", b[0])
	}
	return Tap{Direction: dir, Count: int(b[1])}, nil
}

var orientations = []string{"portrait", "landscape", "reverse_portrait", "reverse_landscape"}

// DecodeOrientation returns the schema name of the orientation.
func DecodeOrientation(b []byte) (string, error) {
	if err := need(b, 1); err != nil {
		return "", err
	}
	if int(b[0]) >= len(orientations) {
		return "", fmt.Errorf("unknown orientation %d", b[0])
	}
	return orientations[b[0]], nil
}

// DecodePedometer returns steps and time.
func DecodePedometer(b []byte) (Pedometer, error) {
	if err := need(b, 8); err != nil {
		return Pedometer{}, err
	}
	return Pedometer{Steps: int(le.Uint32(b)), TimeMS: int(le.Uint32(b[4:]))}, nil
}

// DecodeButton returns true while the button is pressed.
func DecodeButton(b []byte) (bool, error) {
	if err := need(b, 1); err != nil {
		return false, err
	}
	return b[0] != 0, nil
}

// DecodeBattery returns the battery level in %.
func DecodeBattery(b []byte) (int, error) {
	if err := need(b, 1); err != nil {
		return 0, err
	}
	return int(b[0]), nil
}
