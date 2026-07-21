package config

import (
	"strings"
	"testing"
)

func TestAllProvidersAreAlphabetical(t *testing.T) {
	providers := AllProviders()
	for i := 1; i < len(providers); i++ {
		if strings.ToLower(providers[i-1].Name) > strings.ToLower(providers[i].Name) {
			t.Fatalf("providers are not alphabetical: %q before %q", providers[i-1].Name, providers[i].Name)
		}
	}
}

func TestLegacyGeminiKeyAppearsAsGoogle(t *testing.T) {
	c := &Config{APIKeys: map[string]string{"GEMINI_API_KEY": "legacy-key"}}
	providers := c.GetAllProvidersWithKeys()

	for _, provider := range providers {
		if provider.EnvKey == "GOOGLE_API_KEY" {
			if provider.APIKey != "legacy-key" {
				t.Fatalf("expected legacy Gemini key to populate Google provider, got %q", provider.APIKey)
			}
			return
		}
	}
	t.Fatal("Google provider not found")
}

func TestAllProviderKeysAreRecognized(t *testing.T) {
	configured := make(map[string]string)
	for _, provider := range AllProviders() {
		configured[provider.EnvKey] = "stored-key"
	}

	providers := (&Config{APIKeys: configured}).GetAllProvidersWithKeys()
	for _, provider := range providers {
		if provider.APIKey != "stored-key" {
			t.Errorf("%s was not recognized as configured", provider.EnvKey)
		}
	}
}
