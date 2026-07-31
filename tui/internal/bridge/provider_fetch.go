package bridge

import (
	"fmt"
	"io"
	"net/http"
)

func fetchOpenAIModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, openAIModelsURL, apiKey)
	if err != nil {
		return nil, err
	}
	return parseOpenAIModels(body)
}

func fetchOpenRouterModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, openRouterModelsURL, apiKey)
	if err != nil {
		return nil, err
	}
	return parseOpenRouterModels(body)
}

func fetchGroqModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, groqModelsURL, apiKey)
	if err != nil {
		return nil, err
	}
	return parseSimpleModels(body)
}

func fetchMistralModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, mistralModelsURL, apiKey)
	if err != nil {
		return nil, err
	}
	return parseSimpleModels(body)
}

func fetchAnthropicModels(client *http.Client, apiKey string) ([]Model, error) {
	req, err := http.NewRequest(http.MethodGet, anthropicModelsURL, nil)
	if err != nil {
		return anthropicModelsStatic(), nil
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	body, err := fetchCatalog(client, req)
	if err != nil {
		return anthropicModelsStatic(), nil
	}
	models, err := parseAnthropicModels(body)
	if err != nil || len(models) == 0 {
		return anthropicModelsStatic(), nil
	}
	return models, nil
}

func fetchGoogleModels(client *http.Client, apiKey string) ([]Model, error) {
	req, err := http.NewRequest(http.MethodGet, googleModelsURL+"?key="+apiKey, nil)
	if err != nil {
		return googleModelsStatic(), nil
	}
	body, err := fetchCatalog(client, req)
	if err != nil {
		return googleModelsStatic(), nil
	}
	models, err := parseGoogleModels(body)
	if err != nil || len(models) == 0 {
		return googleModelsStatic(), nil
	}
	return models, nil
}

func fetchDeepSeekModels(client *http.Client, apiKey string) ([]Model, error) {
	return fetchOpenAICompatibleModels(client, deepSeekModelsURL, apiKey)
}

func fetchXAIModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, xAILanguageModelsURL, apiKey)
	if err != nil {
		return nil, err
	}
	models, err := parseXAIModels(body)
	if err != nil {
		return nil, err
	}
	if len(models) == 0 {
		return nil, fmt.Errorf("model API returned no language models")
	}
	return models, nil
}

func fetchOpenAICompatibleModels(client *http.Client, endpoint, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, endpoint, apiKey)
	if err != nil {
		return nil, err
	}
	models, err := parseOpenAICompatibleModels(body)
	if err != nil {
		return nil, err
	}
	if len(models) == 0 {
		return nil, fmt.Errorf("model API returned no models")
	}
	return models, nil
}

func fetchMoonshotModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, moonshotModelsURL, apiKey)
	if err != nil {
		return moonshotModelsStatic(), nil
	}
	models, err := parseMoonshotModels(body)
	if err != nil || len(models) == 0 {
		return moonshotModelsStatic(), nil
	}
	return models, nil
}

func fetchCohereModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, cohereModelsURL+"?endpoint=chat&page_size=1000", apiKey)
	if err != nil {
		return nil, err
	}
	models, err := parseCohereModels(body)
	if err != nil {
		return nil, err
	}
	if len(models) == 0 {
		return nil, fmt.Errorf("model API returned no chat models")
	}
	return models, nil
}

func fetchFireworksModels(client *http.Client, apiKey string) ([]Model, error) {
	body, err := fetchBearerCatalog(client, fireworksModelsURL, apiKey)
	if err != nil {
		return fireworksModelsStatic(), nil
	}
	models, err := parseFireworksModels(body)
	if err != nil || len(models) == 0 {
		return fireworksModelsStatic(), nil
	}
	return models, nil
}

func fetchZAIModels(client *http.Client, apiKey string) ([]Model, error) {
	req, err := newBearerRequest(zAIModelsURL, apiKey)
	if err != nil {
		return zAIModelsStatic(), nil
	}
	req.Header.Set("Content-Type", "application/json")
	body, err := fetchCatalog(client, req)
	if err != nil {
		return zAIModelsStatic(), nil
	}
	models, err := parseZAIModels(body)
	if err != nil || len(models) == 0 {
		return zAIModelsStatic(), nil
	}
	return models, nil
}

func fetchBearerCatalog(client *http.Client, endpoint, apiKey string) ([]byte, error) {
	req, err := newBearerRequest(endpoint, apiKey)
	if err != nil {
		return nil, err
	}
	return fetchCatalog(client, req)
}

func newBearerRequest(endpoint, apiKey string) (*http.Request, error) {
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	return req, nil
}

func fetchCatalog(client *http.Client, req *http.Request) ([]byte, error) {
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}
