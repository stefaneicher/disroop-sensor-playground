package telemetry

import (
	"sync"
	"time"
)

// Store holds the current snapshot and notifies subscribers about changes.
type Store struct {
	mu   sync.Mutex
	snap Snapshot
	now  func() time.Time
	subs map[chan struct{}]struct{}
}

// NewStore returns a store starting with initial. now stamps every update.
func NewStore(initial Snapshot, now func() time.Time) *Store {
	return &Store{snap: initial, now: now, subs: map[chan struct{}]struct{}{}}
}

// Update applies fn to the snapshot, stamps it and notifies subscribers without blocking.
func (s *Store) Update(fn func(*Snapshot)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fn(&s.snap)
	s.snap.TS = s.now().UnixMilli()
	for ch := range s.subs {
		select {
		case ch <- struct{}{}:
		default: // a change is already pending for this subscriber
		}
	}
}

// Snapshot returns a deep copy of the current state.
func (s *Store) Snapshot() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snap.Clone()
}

// Subscribe returns a channel that receives a signal after changes (coalesced) and a cancel func.
func (s *Store) Subscribe() (<-chan struct{}, func()) {
	ch := make(chan struct{}, 1)
	s.mu.Lock()
	s.subs[ch] = struct{}{}
	s.mu.Unlock()
	var once sync.Once
	return ch, func() {
		once.Do(func() {
			s.mu.Lock()
			delete(s.subs, ch)
			s.mu.Unlock()
			close(ch)
		})
	}
}
