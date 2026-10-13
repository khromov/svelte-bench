package bridge

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestOpenRouterModelParsingIncludesCatalogDate(t *testing.T) {
	models, err := parseOpenRouterModels([]byte(`{"data":[{"id":"openai/gpt-4","name":"GPT-4","description":"Flagship","created":1692901234}]}`))
	if err != nil {
		t.Fatalf("parseOpenRouterModels returned error: %v", err)
	}
	if len(models) != 1 {
		t.Fatalf("expected one model, got %#v", models)
	}
	if got, want := models[0].AddedAt, time.Unix(1692901234, 0).UTC(); !got.Equal(want) {
		t.Fatalf("expected OpenRouter catalog date %s, got %s", want, got)
	}
}

func TestFetchMoonshotModelsUsesOpenAICompatibleResponse(t *testing.T) {
	models, err := parseMoonshotModels([]byte(`{"data":[{"id":"kimi-k2.5","object":"model","owned_by":"moonshot"},{"id":"moonshot-v1-128k"}]}`))
	if err != nil {
		t.Fatalf("parseMoonshotModels returned error: %v", err)
	}
	if len(models) != 2 || models[0].ID != "kimi-k2.5" || models[1].ID != "moonshot-v1-128k" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestOpenAICompatibleModelParsingKeepsCurrentModelFamilies(t *testing.T) {
	models, err := parseOpenAICompatibleModels([]byte(`{"data":[{"id":"deepseek-v4-flash"},{"id":"grok-4.5"},{"id":"muse-spark-1.1"}]}`))
	if err != nil {
		t.Fatalf("parseOpenAICompatibleModels returned error: %v", err)
	}
	if len(models) != 3 || models[0].ID != "deepseek-v4-flash" || models[1].ID != "grok-4.5" || models[2].ID != "muse-spark-1.1" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestXAIModelParsingUsesLanguageModelResponseShape(t *testing.T) {
	models, err := parseXAIModels([]byte(`{"models":[{"id":"grok-4.5","input_modalities":["text","image"],"output_modalities":["text"]},{"id":"grok-imagine-image","input_modalities":["text"],"output_modalities":["image"]}]}`))
	if err != nil {
		t.Fatalf("parseXAIModels returned error: %v", err)
	}
	if len(models) != 1 || models[0].ID != "grok-4.5" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestIsOpenAIChatModelIncludesNewReasoningFamilies(t *testing.T) {
	for _, modelID := range []string{"gpt-5.4", "o3", "o4-mini", "chatgpt-4o-latest", "ft:gpt-4o:org:custom"} {
		if !isOpenAIChatModel(modelID) {
			t.Errorf("expected %q to be discoverable", modelID)
		}
	}
	for _, modelID := range []string{"text-embedding-3-large", "omni-moderation-latest", "gpt-image-1"} {
		if isOpenAIChatModel(modelID) {
			t.Errorf("expected %q to be excluded", modelID)
		}
	}
}

func TestFuzzySearchRanksExactModelSizeAheadOfNearbySizes(t *testing.T) {
	models := []Model{
		{ID: "qwen/qwen2.5-24b-instruct"},
		{ID: "qwen/qwen2.5-14b-instruct"},
		{ID: "qwen/qwen2.5-7b-instruct"},
	}

	results := FuzzySearch(models, "14b")
	if len(results) == 0 || results[0].ID != "qwen/qwen2.5-14b-instruct" {
		t.Fatalf("expected exact 14b model first, got %#v", results)
	}
}

func TestFuzzySearchPrefersModelIDMatchesOverDescriptionMatches(t *testing.T) {
	models := []Model{
		{ID: "provider/large-model", Description: "optimized for 14b workloads"},
		{ID: "provider/14b-model", Description: "general purpose"},
	}

	results := FuzzySearch(models, "14b")
	if len(results) == 0 || results[0].ID != "provider/14b-model" {
		t.Fatalf("expected ID match first, got %#v", results)
	}
}

func TestOllamaModelParsingListsInstalledModels(t *testing.T) {
	models, err := parseOllamaModels([]byte(`{"models":[{"name":"gpt-oss:20b","details":{"parameter_size":"20.9B","quantization_level":"MXFP4"}},{"name":"gemma4:e2b-it-qat","details":{}},{"name":""}]}`))
	if err != nil {
		t.Fatalf("parseOllamaModels returned error: %v", err)
	}
	if len(models) != 2 || models[0].ID != "gemma4:e2b-it-qat" || models[1].ID != "gpt-oss:20b" {
		t.Fatalf("unexpected models: %#v", models)
	}
	if got, want := models[1].Description, "20.9B MXFP4"; got != want {
		t.Fatalf("expected description %q, got %q", want, got)
	}
}

func TestOllamaProviderNameMapsToBenchmarkProvider(t *testing.T) {
	if got := ConvertProviderNameToEnvKey("Ollama (local)"); got != "ollama" {
		t.Fatalf("expected ollama, got %q", got)
	}
}

type modelRoundTripFunc func(*http.Request) (*http.Response, error)

func (f modelRoundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestZAIModelDiscovery(t *testing.T) {
	for _, tc := range []struct {
		name      string
		status    int
		body      string
		wantError bool
	}{
		{"catalog", http.StatusOK, `{"data":[{"id":"glm-4.6"},{"id":"glm-new"},{"id":""}]}`, false},
		{"unauthorized", http.StatusUnauthorized, `{}`, true},
		{"server error", http.StatusInternalServerError, `{}`, true},
		{"malformed", http.StatusOK, `invalid`, true},
		{"empty", http.StatusOK, `{"data":[]}`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			original := http.DefaultTransport
			t.Cleanup(func() { http.DefaultTransport = original })
			http.DefaultTransport = modelRoundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.Method != http.MethodGet || r.URL.String() != "https://api.z.ai/api/paas/v4/models" {
					t.Errorf("unexpected request: %s %s", r.Method, r.URL)
				}
				if r.Header.Get("Authorization") != "Bearer test-key" {
					t.Error("missing bearer authentication")
				}
				return &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(tc.body))}, nil
			})
			models, err := fetchZAIModels("test-key")
			if (err != nil) != tc.wantError {
				t.Fatalf("models = %#v, error = %v", models, err)
			}
			if tc.wantError {
				if len(models) != 0 {
					t.Fatalf("failed discovery returned fallback models: %#v", models)
				}
			} else if len(models) != 2 || models[0].ID != "glm-4.6" || models[1].Name != "glm-new" {
				t.Fatalf("unexpected catalog: %#v", models)
			}
		})
	}
}

func TestZAIModelDiscoveryPropagatesNetworkErrors(t *testing.T) {
	original := http.DefaultTransport
	t.Cleanup(func() { http.DefaultTransport = original })
	http.DefaultTransport = modelRoundTripFunc(func(r *http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("connection failed")
	})
	models, err := fetchZAIModels("test-key")
	if err == nil || len(models) != 0 {
		t.Fatalf("models = %#v, error = %v", models, err)
	}
}
