package cache

import (
	"encoding/json"
	"sync"
	"time"
)

type entry struct {
	value     []byte
	expiresAt time.Time
}

// Cache is a thread-safe in-memory store with per-key TTL.
// A background goroutine evicts expired entries every minute.
type Cache struct {
	mu    sync.RWMutex
	items map[string]entry
	done  chan struct{}
}

func New() *Cache {
	c := &Cache{
		items: make(map[string]entry),
		done:  make(chan struct{}),
	}
	go c.runEviction()
	return c
}

// GetJSON retrieves a cached value and JSON-unmarshals it into dest.
// Returns false on a cache miss or unmarshal error.
func (c *Cache) GetJSON(key string, dest interface{}) bool {
	c.mu.RLock()
	it, ok := c.items[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(it.expiresAt) {
		return false
	}
	return json.Unmarshal(it.value, dest) == nil
}

// SetJSON JSON-marshals value and stores it under key with the given TTL.
// Silently skips storage if marshalling fails.
func (c *Cache) SetJSON(key string, value interface{}, ttl time.Duration) {
	data, err := json.Marshal(value)
	if err != nil {
		return
	}
	c.mu.Lock()
	c.items[key] = entry{value: data, expiresAt: time.Now().Add(ttl)}
	c.mu.Unlock()
}

// Delete removes one or more keys from the cache.
func (c *Cache) Delete(keys ...string) {
	if len(keys) == 0 {
		return
	}
	c.mu.Lock()
	for _, k := range keys {
		delete(c.items, k)
	}
	c.mu.Unlock()
}

// Close stops the background eviction goroutine.
func (c *Cache) Close() {
	select {
	case <-c.done:
	default:
		close(c.done)
	}
}

func (c *Cache) runEviction() {
	t := time.NewTicker(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			c.evict()
		case <-c.done:
			return
		}
	}
}

func (c *Cache) evict() {
	now := time.Now()
	c.mu.Lock()
	for k, it := range c.items {
		if now.After(it.expiresAt) {
			delete(c.items, k)
		}
	}
	c.mu.Unlock()
}
