package bridge

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func testClient(fn roundTripFunc) *http.Client {
	return &http.Client{Transport: fn}
}

func response(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestProviderRegistryCharacterizesModelDiscoveryContracts(t *testing.T) {
	tests := []struct {
		provider     string
		method       string
		url          string
		authHeader   string
		apiKeyHeader string
		body         string
		wantModel    string
		noRequest    bool
	}{
		{"OPENAI_API_KEY", http.MethodGet, openAIModelsURL, "Bearer secret", "", `{"data":[{"id":"gpt-4o"}]}`, "gpt-4o", false},
		{"ANTHROPIC_API_KEY", http.MethodGet, anthropicModelsURL, "", "secret", `{"data":[{"id":"claude-test","display_name":"Claude Test"}]}`, "claude-test", false},
		{"GOOGLE_API_KEY", http.MethodGet, googleModelsURL + "?key=secret", "", "", `{"models":[{"name":"models/gemini-test","displayName":"Gemini Test","supportedGenerationMethods":["generateContent"]}]}`, "gemini-test", false},
		{"OPENROUTER_API_KEY", http.MethodGet, openRouterModelsURL, "Bearer secret", "", `{"data":[{"id":"openai/test","created":1692901234}]}`, "openai/test", false},
		{"GROQ_API_KEY", http.MethodGet, groqModelsURL, "Bearer secret", "", `{"data":[{"id":"groq-test"}]}`, "groq-test", false},
		{"DEEPSEEK_API_KEY", http.MethodGet, deepSeekModelsURL, "Bearer secret", "", `{"data":[{"id":"deepseek-test"}]}`, "deepseek-test", false},
		{"XAI_API_KEY", http.MethodGet, xAILanguageModelsURL, "Bearer secret", "", `{"models":[{"id":"grok-test","input_modalities":["text"],"output_modalities":["text"]}]}`, "grok-test", false},
		{"MISTRAL_API_KEY", http.MethodGet, mistralModelsURL, "Bearer secret", "", `{"data":[{"id":"mistral-test"}]}`, "mistral-test", false},
		{"COHERE_API_KEY", http.MethodGet, cohereModelsURL + "?endpoint=chat&page_size=1000", "Bearer secret", "", `{"models":[{"name":"command-test","description":"test"}]}`, "command-test", false},
		{"FIREWORKS_API_KEY", http.MethodGet, fireworksModelsURL, "Bearer secret", "", `{"data":[{"id":"accounts/test/instruct"}]}`, "accounts/test/instruct", false},
		{"META_API_KEY", http.MethodGet, metaModelsURL, "Bearer secret", "", `{"data":[{"id":"meta-test"}]}`, "meta-test", false},
		{"CURSOR_API_KEY", "", "", "", "", "", "composer-1", true},
		{"MOONSHOT_API_KEY", http.MethodGet, moonshotModelsURL, "Bearer secret", "", `{"data":[{"id":"moonshot-test"}]}`, "moonshot-test", false},
		{"Z_AI_API_KEY", http.MethodGet, zAIModelsURL, "Bearer secret", "", `{"data":[{"id":"glm-test"}]}`, "glm-test", false},
	}

	if got := len(ProviderDescriptors()); got != len(tests) {
		t.Fatalf("registry has %d providers, want %d", got, len(tests))
	}

	for _, tt := range tests {
		t.Run(tt.provider, func(t *testing.T) {
			descriptor, ok := providerByKey(tt.provider)
			if !ok {
				t.Fatalf("provider is not registered")
			}
			requests := 0
			client := testClient(func(req *http.Request) (*http.Response, error) {
				requests++
				if req.Method != tt.method {
					t.Errorf("method = %q, want %q", req.Method, tt.method)
				}
				if req.URL.String() != tt.url {
					t.Errorf("URL = %q, want %q", req.URL.String(), tt.url)
				}
				if got := req.Header.Get("Authorization"); got != tt.authHeader {
					t.Errorf("Authorization = %q, want %q", got, tt.authHeader)
				}
				if got := req.Header.Get("x-api-key"); got != tt.apiKeyHeader {
					t.Errorf("x-api-key = %q, want %q", got, tt.apiKeyHeader)
				}
				if tt.provider == "ANTHROPIC_API_KEY" && req.Header.Get("anthropic-version") != "2023-06-01" {
					t.Errorf("anthropic-version = %q", req.Header.Get("anthropic-version"))
				}
				if tt.provider == "Z_AI_API_KEY" && req.Header.Get("Content-Type") != "application/json" {
					t.Errorf("Content-Type = %q", req.Header.Get("Content-Type"))
				}
				return response(http.StatusOK, tt.body), nil
			})

			models, err := descriptor.fetch(client, "secret")
			if err != nil {
				t.Fatalf("fetch returned error: %v", err)
			}
			if len(models) == 0 || models[0].ID != tt.wantModel {
				t.Fatalf("models = %#v, want first ID %q", models, tt.wantModel)
			}
			if tt.noRequest && requests != 0 {
				t.Fatalf("static provider made %d requests", requests)
			}
			if !tt.noRequest && requests != 1 {
				t.Fatalf("provider made %d requests, want 1", requests)
			}
		})
	}
}

func TestProviderRegistryCharacterizesDiscoveryFallbacks(t *testing.T) {
	fallbackProviders := map[string]bool{
		"ANTHROPIC_API_KEY": true,
		"GOOGLE_API_KEY":    true,
		"FIREWORKS_API_KEY": true,
		"MOONSHOT_API_KEY":  true,
		"Z_AI_API_KEY":      true,
	}

	for _, descriptor := range ProviderDescriptors() {
		if descriptor.EnvKey == "CURSOR_API_KEY" {
			continue
		}
		t.Run(descriptor.EnvKey, func(t *testing.T) {
			client := testClient(func(*http.Request) (*http.Response, error) {
				return response(http.StatusInternalServerError, `{"error":"unavailable"}`), nil
			})
			models, err := descriptor.fetch(client, "secret")
			if fallbackProviders[descriptor.EnvKey] {
				if err != nil || len(models) == 0 {
					t.Fatalf("fallback = (%#v, %v), want static models", models, err)
				}
				return
			}
			if err == nil {
				t.Fatalf("fetch returned no error for status 500: %#v", models)
			}
		})
	}
}

func TestProviderRegistryCharacterizesDiscoveryNetworkFallbacks(t *testing.T) {
	for _, provider := range []string{"ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "FIREWORKS_API_KEY", "MOONSHOT_API_KEY", "Z_AI_API_KEY"} {
		t.Run(provider, func(t *testing.T) {
			descriptor, _ := providerByKey(provider)
			models, err := descriptor.fetch(testClient(func(*http.Request) (*http.Response, error) {
				return nil, fmt.Errorf("offline")
			}), "secret")
			if err != nil || len(models) == 0 {
				t.Fatalf("network fallback = (%#v, %v), want static models", models, err)
			}
		})
	}
}

func TestProviderRegistryCharacterizesValidationContracts(t *testing.T) {
	tests := []struct {
		provider     string
		method       string
		url          string
		authHeader   string
		apiKeyHeader string
	}{
		{"OPENAI_API_KEY", http.MethodGet, openAIModelsURL, "Bearer secret", ""},
		{"ANTHROPIC_API_KEY", http.MethodPost, anthropicMessageURL, "", "secret"},
		{"GOOGLE_API_KEY", http.MethodGet, googleModelsURL + "?key=secret", "", ""},
		{"OPENROUTER_API_KEY", http.MethodGet, openRouterModelsURL, "Bearer secret", ""},
		{"GROQ_API_KEY", http.MethodGet, groqModelsURL, "Bearer secret", ""},
		{"DEEPSEEK_API_KEY", http.MethodGet, deepSeekModelsURL, "Bearer secret", ""},
		{"XAI_API_KEY", http.MethodGet, xAIModelsURL, "Bearer secret", ""},
		{"MISTRAL_API_KEY", http.MethodGet, mistralModelsURL, "Bearer secret", ""},
		{"COHERE_API_KEY", http.MethodGet, cohereModelsURL, "Bearer secret", ""},
		{"FIREWORKS_API_KEY", http.MethodGet, fireworksModelsURL, "Bearer secret", ""},
		{"META_API_KEY", http.MethodGet, metaModelsURL, "Bearer secret", ""},
		{"MOONSHOT_API_KEY", http.MethodGet, moonshotModelsURL, "Bearer secret", ""},
		{"Z_AI_API_KEY", http.MethodGet, zAIModelsURL, "Bearer secret", ""},
	}

	for _, tt := range tests {
		t.Run(tt.provider, func(t *testing.T) {
			client := testClient(func(req *http.Request) (*http.Response, error) {
				if req.Method != tt.method || req.URL.String() != tt.url {
					t.Errorf("request = %s %s, want %s %s", req.Method, req.URL, tt.method, tt.url)
				}
				if got := req.Header.Get("Authorization"); got != tt.authHeader {
					t.Errorf("Authorization = %q, want %q", got, tt.authHeader)
				}
				if got := req.Header.Get("x-api-key"); got != tt.apiKeyHeader {
					t.Errorf("x-api-key = %q, want %q", got, tt.apiKeyHeader)
				}
				if tt.provider == "ANTHROPIC_API_KEY" {
					if req.Header.Get("anthropic-version") != "2023-06-01" || req.Header.Get("Content-Type") != "application/json" {
						t.Errorf("Anthropic headers = %#v", req.Header)
					}
					body, err := io.ReadAll(req.Body)
					if err != nil || !strings.Contains(string(body), `"max_tokens":1`) || !strings.Contains(string(body), `"model":"claude-3-haiku-20240307"`) {
						t.Errorf("Anthropic body = %q, error = %v", body, err)
					}
				}
				return response(http.StatusOK, `{}`), nil
			})
			if err := validateAPIKeyWithClient(client, tt.provider, "secret"); err != nil {
				t.Fatalf("validation returned error: %v", err)
			}
		})
	}

	if SupportsAPIKeyValidation("CURSOR_API_KEY") {
		t.Fatal("Cursor unexpectedly reports API-key validation support")
	}
}

func TestProviderRegistryPreservesValidationStatusSemantics(t *testing.T) {
	forbiddenIsInvalid := map[string]bool{
		"DEEPSEEK_API_KEY": true,
		"META_API_KEY":     true,
		"MOONSHOT_API_KEY": true,
		"Z_AI_API_KEY":     true,
	}

	for _, descriptor := range ProviderDescriptors() {
		if !descriptor.SupportsValidation {
			continue
		}
		t.Run(descriptor.EnvKey, func(t *testing.T) {
			client := testClient(func(*http.Request) (*http.Response, error) {
				return response(http.StatusForbidden, "forbidden"), nil
			})
			err := validateAPIKeyWithClient(client, descriptor.EnvKey, "secret")
			if err == nil {
				t.Fatal("status 403 unexpectedly succeeded")
			}
			if got := err.Error(); forbiddenIsInvalid[descriptor.EnvKey] != (got == "invalid API key") {
				t.Fatalf("error = %q, invalid-key expectation = %v", got, forbiddenIsInvalid[descriptor.EnvKey])
			}
		})
	}
}

func TestProviderRegistryPreservesGenericValidatorTwoHundredRange(t *testing.T) {
	acceptAny2xx := map[string]bool{
		"DEEPSEEK_API_KEY": true,
		"META_API_KEY":     true,
		"MOONSHOT_API_KEY": true,
		"Z_AI_API_KEY":     true,
	}
	for _, descriptor := range ProviderDescriptors() {
		if !descriptor.SupportsValidation {
			continue
		}
		t.Run(descriptor.EnvKey, func(t *testing.T) {
			client := testClient(func(*http.Request) (*http.Response, error) {
				return response(http.StatusNoContent, ""), nil
			})
			err := validateAPIKeyWithClient(client, descriptor.EnvKey, "secret")
			if acceptAny2xx[descriptor.EnvKey] && err != nil {
				t.Fatalf("status 204 returned error: %v", err)
			}
			if !acceptAny2xx[descriptor.EnvKey] && err == nil {
				t.Fatal("status 204 unexpectedly succeeded")
			}
		})
	}
}

func TestProviderRegistryRejectsEmptyAndUnknownCredentials(t *testing.T) {
	if got := validateAPIKeyWithClient(defaultHTTPClient, "OPENAI_API_KEY", ""); got == nil || got.Error() != "API key is empty" {
		t.Fatalf("empty-key error = %v", got)
	}
	if got := validateAPIKeyWithClient(defaultHTTPClient, "UNKNOWN_API_KEY", "secret"); got == nil || got.Error() != "unknown provider: UNKNOWN_API_KEY" {
		t.Fatalf("unknown-provider error = %v", got)
	}
}

func TestModelCacheIsCopySafe(t *testing.T) {
	provider := "CURSOR_API_KEY"
	fetchedModels.Lock()
	fetchedModels.entries = make(map[string]modelCacheEntry)
	fetchedModels.Unlock()

	models, err := fetchModelsWithClient(testClient(func(*http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("static provider must not use HTTP")
	}), provider, "secret")
	if err != nil {
		t.Fatal(err)
	}
	models[0].ID = "mutated"

	again, err := fetchModelsWithClient(defaultHTTPClient, provider, "secret")
	if err != nil {
		t.Fatal(err)
	}
	if again[0].ID != "composer-1" {
		t.Fatalf("cached model was mutated through caller slice: %#v", again)
	}
}
