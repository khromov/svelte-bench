package config

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func anthropicTestClient(handler roundTripFunc) *http.Client {
	return &http.Client{Transport: handler}
}

func response(status int) *http.Response {
	return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(""))}
}

func TestAnthropicValidationUsesModelsEndpointWithoutGeneratingTokens(t *testing.T) {
	const key = "test-anthropic-key"
	client := anthropicTestClient(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/models" || r.URL.Query().Get("limit") != "1" {
			t.Errorf("unexpected request: %s %s", r.Method, r.URL)
		}
		if r.Header.Get("x-api-key") != key || r.Header.Get("anthropic-version") != "2023-06-01" {
			t.Error("missing Anthropic authentication headers")
		}
		if r.ContentLength > 0 {
			t.Error("model-list request should not send a message body")
		}
		return response(http.StatusOK), nil
	})

	if err := validateAnthropicModels(client, "https://api.anthropic.com/v1/models?limit=1", key); err != nil {
		t.Fatal(err)
	}
}

func TestAnthropicValidationDistinguishesInvalidKeysFromOtherFailures(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusBadRequest, http.StatusForbidden} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			client := anthropicTestClient(func(_ *http.Request) (*http.Response, error) {
				return response(status), nil
			})

			err := validateAnthropicModels(client, "https://api.anthropic.com/v1/models", "test-key")
			if err == nil {
				t.Fatal("expected validation failure")
			}
			if status == http.StatusUnauthorized && err.Error() != "invalid API key" {
				t.Fatalf("unauthorized response = %q", err)
			}
			if status != http.StatusUnauthorized && strings.Contains(err.Error(), "invalid API key") {
				t.Fatalf("status %d was incorrectly reported as an invalid key", status)
			}
		})
	}
}
