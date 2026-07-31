package config

import "svelte-bench/tui/internal/bridge"

// ValidateAPIKey delegates credential probing to the provider registry so
// model discovery and validation share one transport contract.
func ValidateAPIKey(provider, apiKey string) error {
	return bridge.ValidateAPIKey(provider, apiKey)
}

// SupportsAPIKeyValidation reports whether the provider registry exposes a
// credential probe that does not require a model-specific request.
func SupportsAPIKeyValidation(provider string) bool {
	return bridge.SupportsAPIKeyValidation(provider)
}
