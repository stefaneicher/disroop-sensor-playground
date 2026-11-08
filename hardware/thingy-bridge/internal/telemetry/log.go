package telemetry

import (
	"fmt"
	"sync"
)

// LogBus fans out log lines to subscribers and keeps the most recent ones.
type LogBus struct {
	mu     sync.Mutex
	keep   int
	recent []string
	subs   map[chan string]struct{}
}

// NewLogBus keeps the last keep lines.
func NewLogBus(keep int) *LogBus {
	return &LogBus{keep: keep, subs: map[chan string]struct{}{}}
}

// Logf publishes a formatted line. Full subscribers miss the line instead of blocking.
func (l *LogBus) Logf(format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	l.mu.Lock()
	defer l.mu.Unlock()
	l.recent = append(l.recent, msg)
	if len(l.recent) > l.keep {
		l.recent = l.recent[len(l.recent)-l.keep:]
	}
	for ch := range l.subs {
		select {
		case ch <- msg:
		default:
		}
	}
}

// Recent returns the last lines, oldest first.
func (l *LogBus) Recent() []string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]string(nil), l.recent...)
}

// Subscribe returns a channel of new lines and a cancel func.
func (l *LogBus) Subscribe() (<-chan string, func()) {
	_, ch, cancel := l.SubscribeWithRecent()
	return ch, cancel
}

// SubscribeWithRecent atomically returns the recent lines and a subscription to all later ones,
// so a new client neither misses nor duplicates a line.
func (l *LogBus) SubscribeWithRecent() ([]string, <-chan string, func()) {
	ch := make(chan string, 64)
	l.mu.Lock()
	recent := append([]string(nil), l.recent...)
	l.subs[ch] = struct{}{}
	l.mu.Unlock()
	var once sync.Once
	return recent, ch, func() {
		once.Do(func() {
			l.mu.Lock()
			delete(l.subs, ch)
			l.mu.Unlock()
			close(ch)
		})
	}
}
