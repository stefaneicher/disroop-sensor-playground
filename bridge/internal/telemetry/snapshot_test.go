package telemetry

import (
	"encoding/json"
	"os"
	"reflect"
	"sort"
	"testing"
	"time"
)

func keys(m map[string]any) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// sameShape checks that got has exactly the keys of want, recursively for objects that are non-null in both.
func sameShape(t *testing.T, path string, got, want map[string]any) {
	t.Helper()
	if !reflect.DeepEqual(keys(got), keys(want)) {
		t.Errorf("%s: keys %v, want %v", path, keys(got), keys(want))
		return
	}
	for k, w := range want {
		wm, wok := w.(map[string]any)
		gm, gok := got[k].(map[string]any)
		if wok && gok {
			sameShape(t, path+"."+k, gm, wm)
		}
	}
}

func readExample(t *testing.T) map[string]any {
	t.Helper()
	raw, err := os.ReadFile("../../../shared/telemetry.example.json")
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func toMap(t *testing.T, v any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestExampleRoundTripsThroughSnapshot(t *testing.T) {
	example := readExample(t)
	raw, _ := json.Marshal(example)
	var s Snapshot
	if err := json.Unmarshal(raw, &s); err != nil {
		t.Fatal(err)
	}
	if got := toMap(t, s); !reflect.DeepEqual(got, example) {
		t.Fatalf("round trip differs:\n got %v\nwant %v", got, example)
	}
}

func TestEmptySnapshotHasAllKeysAndNulls(t *testing.T) {
	got := toMap(t, New("sim"))
	sameShape(t, "$", got, readExample(t))

	motion := got["motion"].(map[string]any)
	for _, k := range []string{"accel_g", "heading_deg", "orientation", "tap"} {
		if motion[k] != nil {
			t.Errorf("motion.%s = %v, want null", k, motion[k])
		}
	}
	if got["device"].(map[string]any)["source"] != "sim" {
		t.Error("source must be sim")
	}
	song := got["sound"].(map[string]any)["song"].(map[string]any)
	if song["playing"] != false || song["note_index"] != float64(-1) {
		t.Errorf("song = %v", song)
	}
}

func TestStoreUpdateSetsTimestampAndNotifies(t *testing.T) {
	now := time.UnixMilli(1762460000000)
	st := NewStore(New("sim"), func() time.Time { return now })
	ch, cancel := st.Subscribe()
	defer cancel()

	st.Update(func(s *Snapshot) { s.Environment.TemperatureC = F(23.4) })

	select {
	case <-ch:
	case <-time.After(10 * time.Second):
		t.Fatal("no notification")
	}
	got := st.Snapshot()
	if got.TS != now.UnixMilli() || *got.Environment.TemperatureC != 23.4 {
		t.Fatalf("snapshot %+v", got)
	}
}

func TestStoreSnapshotIsACopy(t *testing.T) {
	st := NewStore(New("sim"), time.Now)
	st.Update(func(s *Snapshot) { s.Motion.AccelG = &XYZ{X: 1} })
	snap := st.Snapshot()
	snap.Motion.AccelG.X = 99
	if st.Snapshot().Motion.AccelG.X != 1 {
		t.Fatal("snapshot shares memory with the store")
	}
}

func TestStoreNotificationsDoNotBlockSlowSubscribers(t *testing.T) {
	st := NewStore(New("sim"), time.Now)
	_, cancel := st.Subscribe()
	defer cancel()
	done := make(chan struct{})
	go func() {
		for range 100 {
			st.Update(func(s *Snapshot) {})
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("update blocked on a slow subscriber")
	}
}

func TestCancelUnsubscribes(t *testing.T) {
	st := NewStore(New("sim"), time.Now)
	ch, cancel := st.Subscribe()
	cancel()
	st.Update(func(s *Snapshot) {})
	if _, open := <-ch; open {
		t.Fatal("channel must be closed after cancel")
	}
}
