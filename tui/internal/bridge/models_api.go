package bridge

import (
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Model is a provider catalog entry presented by the TUI.
type Model struct {
	ID          string
	Name        string
	Description string
	IsPopular   bool
	// AddedAt is the provider's catalog timestamp. OpenRouter uses this to show
	// the date a model was added to its catalog.
	AddedAt time.Time
}

const cacheDuration = 5 * time.Minute

type modelCacheEntry struct {
	models  []Model
	expires time.Time
}

var fetchedModels = struct {
	sync.RWMutex
	entries map[string]modelCacheEntry
}{entries: make(map[string]modelCacheEntry)}

var defaultHTTPClient = &http.Client{Timeout: 10 * time.Second}

// FetchModels fetches available models for a provider using the shared client.
func FetchModels(providerKey, apiKey string) ([]Model, error) {
	return fetchModelsWithClient(defaultHTTPClient, providerKey, apiKey)
}

func fetchModelsWithClient(client *http.Client, providerKey, apiKey string) ([]Model, error) {
	if descriptor, ok := providerByKey(providerKey); ok {
		if cached, ok := cachedModels(providerKey, time.Now()); ok {
			return cached, nil
		}

		models, err := descriptor.fetch(client, apiKey)
		if err != nil {
			return nil, err
		}
		cacheModels(providerKey, models, time.Now().Add(cacheDuration))
		return cloneModels(models), nil
	}
	return nil, fmt.Errorf("unsupported provider: %s", providerKey)
}

func cachedModels(providerKey string, now time.Time) ([]Model, bool) {
	fetchedModels.RLock()
	entry, ok := fetchedModels.entries[providerKey]
	fetchedModels.RUnlock()
	if !ok || !now.Before(entry.expires) {
		return nil, false
	}
	return cloneModels(entry.models), true
}

func cacheModels(providerKey string, models []Model, expires time.Time) {
	fetchedModels.Lock()
	fetchedModels.entries[providerKey] = modelCacheEntry{models: cloneModels(models), expires: expires}
	fetchedModels.Unlock()
}

func cloneModels(models []Model) []Model {
	return append([]Model(nil), models...)
}
