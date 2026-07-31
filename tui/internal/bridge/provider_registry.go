package bridge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
)

const (
	openAIModelsURL      = "https://api.openai.com/v1/models"
	anthropicModelsURL   = "https://api.anthropic.com/v1/models"
	anthropicMessageURL  = "https://api.anthropic.com/v1/messages"
	googleModelsURL      = "https://generativelanguage.googleapis.com/v1beta/models"
	openRouterModelsURL  = "https://openrouter.ai/api/v1/models"
	groqModelsURL        = "https://api.groq.com/openai/v1/models"
	deepSeekModelsURL    = "https://api.deepseek.com/models"
	xAIModelsURL         = "https://api.x.ai/v1/models"
	xAILanguageModelsURL = "https://api.x.ai/v1/language-models"
	mistralModelsURL     = "https://api.mistral.ai/v1/models"
	cohereModelsURL      = "https://api.cohere.ai/v1/models"
	fireworksModelsURL   = "https://api.fireworks.ai/inference/v1/models"
	metaModelsURL        = "https://api.meta.ai/v1/models"
	moonshotModelsURL    = "https://api.moonshot.ai/v1/models"
	zAIModelsURL         = "https://open.bigmodel.cn/api/paas/v4/models"
)

type modelFetcher func(*http.Client, string) ([]Model, error)
type keyValidator func(*http.Client, string) error

// ProviderDescriptor is the provider metadata shared by discovery,
// credential validation, and configuration screens.
type ProviderDescriptor struct {
	Name               string
	EnvKey             string
	SupportsValidation bool
	fetch              modelFetcher
	validate           keyValidator
}

var providerDescriptors = []ProviderDescriptor{
	descriptor("OpenAI", "OPENAI_API_KEY", fetchOpenAIModels, bearerValidator(openAIModelsURL, invalidUnauthorized, false)),
	descriptor("Anthropic", "ANTHROPIC_API_KEY", fetchAnthropicModels, validateAnthropic),
	descriptor("Google (Gemini)", "GOOGLE_API_KEY", fetchGoogleModels, validateGoogle),
	descriptor("OpenRouter", "OPENROUTER_API_KEY", fetchOpenRouterModels, bearerValidator(openRouterModelsURL, invalidUnauthorized, false)),
	descriptor("Groq", "GROQ_API_KEY", fetchGroqModels, bearerValidator(groqModelsURL, invalidUnauthorized, false)),
	descriptor("DeepSeek", "DEEPSEEK_API_KEY", fetchDeepSeekModels, bearerValidator(deepSeekModelsURL, invalidUnauthorizedOrForbidden, true)),
	descriptor("xAI (Grok)", "XAI_API_KEY", fetchXAIModels, bearerValidator(xAIModelsURL, invalidUnauthorized, false)),
	descriptor("Mistral", "MISTRAL_API_KEY", fetchMistralModels, bearerValidator(mistralModelsURL, invalidUnauthorized, false)),
	descriptor("Cohere", "COHERE_API_KEY", fetchCohereModels, bearerValidator(cohereModelsURL, invalidUnauthorized, false)),
	descriptor("Fireworks", "FIREWORKS_API_KEY", fetchFireworksModels, bearerValidator(fireworksModelsURL, invalidUnauthorized, false)),
	descriptor("Meta", "META_API_KEY", openAICompatibleFetcher(metaModelsURL), bearerValidator(metaModelsURL, invalidUnauthorizedOrForbidden, true)),
	{Name: "Cursor", EnvKey: "CURSOR_API_KEY", fetch: staticFetcher([]Model{{ID: "composer-1", Name: "Composer 1", IsPopular: true}})},
	descriptor("Moonshot", "MOONSHOT_API_KEY", fetchMoonshotModels, bearerValidator(moonshotModelsURL, invalidUnauthorizedOrForbidden, true)),
	descriptor("Z.ai", "Z_AI_API_KEY", fetchZAIModels, bearerValidator(zAIModelsURL, invalidUnauthorizedOrForbidden, true)),
}

var providerRegistry = indexProviders(providerDescriptors)

func descriptor(name, envKey string, fetch modelFetcher, validate keyValidator) ProviderDescriptor {
	return ProviderDescriptor{Name: name, EnvKey: envKey, SupportsValidation: true, fetch: fetch, validate: validate}
}

func indexProviders(providers []ProviderDescriptor) map[string]ProviderDescriptor {
	registry := make(map[string]ProviderDescriptor, len(providers))
	for _, provider := range providers {
		if _, exists := registry[provider.EnvKey]; exists {
			panic("duplicate provider descriptor: " + provider.EnvKey)
		}
		registry[provider.EnvKey] = provider
	}
	return registry
}

func providerByKey(envKey string) (ProviderDescriptor, bool) {
	descriptor, ok := providerRegistry[envKey]
	return descriptor, ok
}

// ProviderDescriptors returns a stable, alphabetically sorted registry view.
func ProviderDescriptors() []ProviderDescriptor {
	providers := append([]ProviderDescriptor(nil), providerDescriptors...)
	sort.SliceStable(providers, func(i, j int) bool {
		return strings.ToLower(providers[i].Name) < strings.ToLower(providers[j].Name)
	})
	return providers
}

// ValidateAPIKey validates a provider credential with the shared HTTP client.
func ValidateAPIKey(provider, apiKey string) error {
	return validateAPIKeyWithClient(defaultHTTPClient, provider, apiKey)
}

func validateAPIKeyWithClient(client *http.Client, provider, apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("API key is empty")
	}
	descriptor, ok := providerByKey(provider)
	if !ok || descriptor.validate == nil {
		return fmt.Errorf("unknown provider: %s", provider)
	}
	return descriptor.validate(client, apiKey)
}

// SupportsAPIKeyValidation reports whether a provider has a credential probe.
func SupportsAPIKeyValidation(provider string) bool {
	descriptor, ok := providerByKey(provider)
	return ok && descriptor.validate != nil
}

func staticFetcher(models []Model) modelFetcher {
	return func(*http.Client, string) ([]Model, error) { return cloneModels(models), nil }
}

func openAICompatibleFetcher(endpoint string) modelFetcher {
	return func(client *http.Client, apiKey string) ([]Model, error) {
		return fetchOpenAICompatibleModels(client, endpoint, apiKey)
	}
}

type invalidStatusMode int

const (
	invalidUnauthorized invalidStatusMode = iota
	invalidUnauthorizedOrForbidden
)

func bearerValidator(endpoint string, invalidMode invalidStatusMode, acceptAny2xx bool) keyValidator {
	return func(client *http.Client, apiKey string) error {
		req, err := http.NewRequest(http.MethodGet, endpoint, nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)
		return validateResponse(client, req, invalidMode, false, acceptAny2xx)
	}
}

func validateAnthropic(client *http.Client, apiKey string) error {
	body, _ := json.Marshal(map[string]any{
		"model": "claude-3-haiku-20240307", "max_tokens": 1,
		"messages": []map[string]string{{"role": "user", "content": "hi"}},
	})
	req, err := http.NewRequest(http.MethodPost, anthropicMessageURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")
	return validateResponse(client, req, invalidUnauthorized, true, false)
}

func validateGoogle(client *http.Client, apiKey string) error {
	req, err := http.NewRequest(http.MethodGet, googleModelsURL+"?key="+apiKey, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("invalid API key")
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}
	return nil
}

func validateResponse(client *http.Client, req *http.Request, invalidMode invalidStatusMode, includeBody, acceptAny2xx bool) error {
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()
	invalid := resp.StatusCode == http.StatusUnauthorized ||
		(invalidMode == invalidUnauthorizedOrForbidden && resp.StatusCode == http.StatusForbidden)
	if invalid {
		return fmt.Errorf("invalid API key")
	}
	accepted := resp.StatusCode == http.StatusOK ||
		(acceptAny2xx && resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices)
	if !accepted {
		if includeBody {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("API error: %s", string(body))
		}
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}
	return nil
}
