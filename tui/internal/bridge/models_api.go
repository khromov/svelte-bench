package bridge

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/sahilm/fuzzy"
)

// Model represents an LLM model
type Model struct {
	ID          string
	Name        string
	Description string
	IsPopular   bool
}

// modelCache caches fetched models
var modelCache = make(map[string][]Model)
var cacheExpiry = make(map[string]time.Time)

const cacheDuration = 5 * time.Minute

// FetchModels fetches available models for a provider
func FetchModels(providerKey, apiKey string) ([]Model, error) {
	// Check cache
	if models, ok := modelCache[providerKey]; ok {
		if expiry, ok := cacheExpiry[providerKey]; ok && time.Now().Before(expiry) {
			return models, nil
		}
	}

	var models []Model
	var err error

	switch providerKey {
	case "OPENAI_API_KEY":
		models, err = fetchOpenAIModels(apiKey)
	case "ANTHROPIC_API_KEY":
		models, err = fetchAnthropicModels(apiKey)
	case "GOOGLE_API_KEY":
		models, err = fetchGoogleModels(apiKey)
	case "OPENROUTER_API_KEY":
		models, err = fetchOpenRouterModels(apiKey)
	case "GROQ_API_KEY":
		models, err = fetchGroqModels(apiKey)
	case "DEEPSEEK_API_KEY":
		models, err = fetchDeepSeekModels(apiKey)
	case "XAI_API_KEY":
		models, err = fetchXAIModels(apiKey)
	case "MISTRAL_API_KEY":
		models, err = fetchMistralModels(apiKey)
	case "MOONSHOT_API_KEY":
		models, err = fetchMoonshotModels(apiKey)
	case "COHERE_API_KEY":
		models, err = fetchCohereModels(apiKey)
	case "FIREWORKS_API_KEY":
		models, err = fetchFireworksModels(apiKey)
	case "Z_AI_API_KEY":
		models, err = fetchZAIModels(apiKey)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", providerKey)
	}

	if err != nil {
		return nil, err
	}

	// Cache the results
	modelCache[providerKey] = models
	cacheExpiry[providerKey] = time.Now().Add(cacheDuration)

	return models, nil
}

// FuzzySearch performs fuzzy search on models
func FuzzySearch(models []Model, query string) []Model {
	if query == "" {
		return models
	}

	// Build searchable strings
	searchStrings := make([]string, len(models))
	for i, model := range models {
		searchStrings[i] = model.ID + " " + model.Description
	}

	// Perform fuzzy search
	matches := fuzzy.Find(query, searchStrings)

	// Return matched models
	result := make([]Model, len(matches))
	for i, match := range matches {
		result[i] = models[match.Index]
	}

	return result
}

func fetchOpenAIModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.openai.com/v1/models", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []struct {
			ID      string `json:"id"`
			Created int64  `json:"created"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	popular := map[string]bool{
		"gpt-4o":        true,
		"gpt-4o-mini":   true,
		"gpt-4-turbo":   true,
		"o1-preview":    true,
		"o1-mini":       true,
		"gpt-3.5-turbo": true,
	}

	models := make([]Model, 0)
	for _, item := range result.Data {
		// Filter to chat models only
		if !strings.Contains(item.ID, "gpt") && !strings.Contains(item.ID, "o1") {
			continue
		}

		models = append(models, Model{
			ID:          item.ID,
			Name:        item.ID,
			Description: getOpenAIDescription(item.ID),
			IsPopular:   popular[item.ID],
		})
	}

	return models, nil
}

func fetchOpenRouterModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://openrouter.ai/api/v1/models", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	models := make([]Model, 0)
	for _, item := range result.Data {
		models = append(models, Model{
			ID:          item.ID,
			Name:        item.Name,
			Description: item.Description,
		})
	}

	return models, nil
}

func fetchGroqModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.groq.com/openai/v1/models", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	models := make([]Model, 0)
	for _, item := range result.Data {
		models = append(models, Model{
			ID:          item.ID,
			Name:        item.ID,
			Description: "",
		})
	}

	return models, nil
}

func fetchMistralModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.mistral.ai/v1/models", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	models := make([]Model, 0)
	for _, item := range result.Data {
		models = append(models, Model{
			ID:          item.ID,
			Name:        item.ID,
			Description: "",
		})
	}

	return models, nil
}

func fetchAnthropicModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.anthropic.com/v1/models", nil)
	if err != nil {
		return getAnthropicModelsStatic(), nil
	}

	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getAnthropicModelsStatic(), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return getAnthropicModelsStatic(), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return getAnthropicModelsStatic(), nil
	}

	var result struct {
		Data []struct {
			ID          string `json:"id"`
			DisplayName string `json:"display_name"`
			CreatedAt   string `json:"created_at"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return getAnthropicModelsStatic(), nil
	}

	models := make([]Model, 0)
	popular := map[string]bool{
		"claude-sonnet-4-5-20250929": true,
		"claude-3-7-sonnet-20250219": true,
		"claude-3-5-sonnet-20241022": true,
		"claude-3-5-haiku-20241022":  true,
	}

	for _, item := range result.Data {
		models = append(models, Model{
			ID:          item.ID,
			Name:        item.DisplayName,
			Description: "",
			IsPopular:   popular[item.ID],
		})
	}

	if len(models) == 0 {
		return getAnthropicModelsStatic(), nil
	}

	return models, nil
}

func getAnthropicModelsStatic() []Model {
	return []Model{
		{ID: "claude-sonnet-4-5-20250929", Name: "Claude Sonnet 4.5", Description: "Latest flagship", IsPopular: true},
		{ID: "claude-3-7-sonnet-20250219", Name: "Claude 3.7 Sonnet", Description: "Extended context", IsPopular: true},
		{ID: "claude-3-5-sonnet-20241022", Name: "Claude 3.5 Sonnet", Description: "Balanced", IsPopular: true},
		{ID: "claude-3-5-haiku-20241022", Name: "Claude 3.5 Haiku", Description: "Fast", IsPopular: true},
		{ID: "claude-3-opus-20240229", Name: "Claude 3 Opus", Description: "Powerful"},
		{ID: "claude-3-haiku-20240307", Name: "Claude 3 Haiku", Description: "Efficient"},
	}
}

func fetchGoogleModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://generativelanguage.googleapis.com/v1beta/models?key="+apiKey, nil)
	if err != nil {
		// Fallback to static list on error
		return getGoogleModelsStatic(), nil
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		// Fallback to static list on error
		return getGoogleModelsStatic(), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Fallback to static list on error
		return getGoogleModelsStatic(), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return getGoogleModelsStatic(), nil
	}

	var result struct {
		Models []struct {
			Name             string   `json:"name"`
			DisplayName      string   `json:"displayName"`
			Description      string   `json:"description"`
			SupportedMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return getGoogleModelsStatic(), nil
	}

	models := make([]Model, 0)
	popular := map[string]bool{
		"gemini-2.0-flash-exp":          true,
		"gemini-exp-1206":               true,
		"gemini-2.0-flash-thinking-exp": true,
		"gemini-1.5-pro":                true,
		"gemini-1.5-flash":              true,
	}

	for _, item := range result.Models {
		// Extract model ID from name (format: models/gemini-xxx)
		modelID := strings.TrimPrefix(item.Name, "models/")

		// Only include models that support generateContent
		supportsGenerate := false
		for _, method := range item.SupportedMethods {
			if method == "generateContent" {
				supportsGenerate = true
				break
			}
		}

		if !supportsGenerate {
			continue
		}

		models = append(models, Model{
			ID:          modelID,
			Name:        item.DisplayName,
			Description: item.Description,
			IsPopular:   popular[modelID],
		})
	}

	// If no models found, fallback to static
	if len(models) == 0 {
		return getGoogleModelsStatic(), nil
	}

	return models, nil
}

func getGoogleModelsStatic() []Model {
	return []Model{
		{ID: "gemini-2.0-flash-exp", Name: "Gemini 2.0 Flash", Description: "Latest experimental", IsPopular: true},
		{ID: "gemini-2.0-flash-thinking-exp", Name: "Gemini 2.0 Flash Thinking", Description: "Advanced reasoning", IsPopular: true},
		{ID: "gemini-exp-1206", Name: "Gemini Exp 1206", Description: "Experimental December", IsPopular: true},
		{ID: "gemini-1.5-pro", Name: "Gemini 1.5 Pro", Description: "Most capable", IsPopular: true},
		{ID: "gemini-1.5-flash", Name: "Gemini 1.5 Flash", Description: "Fast and efficient", IsPopular: true},
		{ID: "gemini-1.5-flash-8b", Name: "Gemini 1.5 Flash 8B", Description: "Smaller and faster"},
	}
}

func fetchDeepSeekModels(apiKey string) ([]Model, error) {
	// DeepSeek uses OpenAI-compatible endpoint, static list based on AI SDK
	return []Model{
		{ID: "deepseek-chat", Name: "DeepSeek Chat", Description: "Latest chat model", IsPopular: true},
		{ID: "deepseek-coder", Name: "DeepSeek Coder", Description: "Code specialized", IsPopular: true},
		{ID: "deepseek-reasoner", Name: "DeepSeek Reasoner", Description: "Reasoning model"},
	}, nil
}

func fetchXAIModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.x.ai/v1/language-models", nil)
	if err != nil {
		return getXAIModelsStatic(), nil
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getXAIModelsStatic(), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return getXAIModelsStatic(), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return getXAIModelsStatic(), nil
	}

	// xAI returns array directly, not wrapped in "data"
	var result []struct {
		ID          string `json:"id"`
		Object      string `json:"object"`
		DisplayName string `json:"display_name"`
		MaxTokens   int    `json:"max_tokens"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return getXAIModelsStatic(), nil
	}

	models := make([]Model, 0)
	popular := map[string]bool{
		"grok-beta":   true,
		"grok-2-1212": true,
	}

	for _, item := range result {
		name := item.DisplayName
		if name == "" {
			name = item.ID
		}
		models = append(models, Model{
			ID:        item.ID,
			Name:      name,
			IsPopular: popular[item.ID],
		})
	}

	if len(models) == 0 {
		return getXAIModelsStatic(), nil
	}

	return models, nil
}

func getXAIModelsStatic() []Model {
	return []Model{
		{ID: "grok-beta", Name: "Grok Beta", Description: "Latest", IsPopular: true},
		{ID: "grok-2-latest", Name: "Grok 2 Latest", Description: "Latest Grok 2", IsPopular: true},
		{ID: "grok-2-1212", Name: "Grok 2 (Dec)", Description: "December release", IsPopular: true},
		{ID: "grok-2-vision-1212", Name: "Grok 2 Vision", Description: "With vision"},
		{ID: "grok-vision-beta", Name: "Grok Vision Beta", Description: "Vision beta"},
	}
}

func fetchMoonshotModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.moonshot.cn/v1/models", nil)
	if err != nil {
		return getMoonshotModelsStatic(), nil
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getMoonshotModelsStatic(), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return getMoonshotModelsStatic(), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return getMoonshotModelsStatic(), nil
	}

	// Moonshot returns OpenAI-compatible format
	var result struct {
		Data []struct {
			ID      string `json:"id"`
			Object  string `json:"object"`
			Created int64  `json:"created"`
			OwnedBy string `json:"owned_by"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return getMoonshotModelsStatic(), nil
	}

	models := make([]Model, 0)
	popular := map[string]bool{
		"moonshot-v1-8k":   true,
		"moonshot-v1-32k":  true,
		"moonshot-v1-128k": true,
	}

	for _, item := range result.Data {
		models = append(models, Model{
			ID:        item.ID,
			Name:      item.ID,
			IsPopular: popular[item.ID],
		})
	}

	if len(models) == 0 {
		return getMoonshotModelsStatic(), nil
	}

	return models, nil
}

func getMoonshotModelsStatic() []Model {
	return []Model{
		{ID: "moonshot-v1-8k", Name: "Moonshot v1 8K", Description: "8K context", IsPopular: true},
		{ID: "moonshot-v1-32k", Name: "Moonshot v1 32K", Description: "32K context", IsPopular: true},
		{ID: "moonshot-v1-128k", Name: "Moonshot v1 128K", Description: "128K context"},
	}
}

func fetchCohereModels(apiKey string) ([]Model, error) {
	// Cohere static list based on AI SDK
	return []Model{
		{ID: "command-r-plus", Name: "Command R+", Description: "Most capable", IsPopular: true},
		{ID: "command-r", Name: "Command R", Description: "Balanced", IsPopular: true},
		{ID: "command", Name: "Command", Description: "Legacy"},
		{ID: "command-light", Name: "Command Light", Description: "Fast"},
	}, nil
}

func fetchFireworksModels(apiKey string) ([]Model, error) {
	req, err := http.NewRequest("GET", "https://api.fireworks.ai/inference/v1/models", nil)
	if err != nil {
		return getFireworksModelsStatic(), nil
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return getFireworksModelsStatic(), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return getFireworksModelsStatic(), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return getFireworksModelsStatic(), nil
	}

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return getFireworksModelsStatic(), nil
	}

	models := make([]Model, 0)
	for _, item := range result.Data {
		// Filter to chat models only
		if strings.Contains(item.ID, "chat") || strings.Contains(item.ID, "instruct") {
			models = append(models, Model{
				ID:   item.ID,
				Name: item.ID,
			})
		}
	}

	if len(models) == 0 {
		return getFireworksModelsStatic(), nil
	}

	return models, nil
}

func getFireworksModelsStatic() []Model {
	return []Model{
		{ID: "accounts/fireworks/models/llama-v3p3-70b-instruct", Name: "Llama 3.3 70B", Description: "Latest Llama", IsPopular: true},
		{ID: "accounts/fireworks/models/qwen2p5-72b-instruct", Name: "Qwen 2.5 72B", Description: "Qwen latest", IsPopular: true},
		{ID: "accounts/fireworks/models/mixtral-8x22b-instruct", Name: "Mixtral 8x22B", Description: "MoE model"},
	}
}

func getOpenAIDescription(modelID string) string {
	descriptions := map[string]string{
		"gpt-4o":        "Latest GPT-4 Omni",
		"gpt-4o-mini":   "Fast & efficient GPT-4",
		"gpt-4-turbo":   "GPT-4 Turbo",
		"o1-preview":    "Reasoning model (preview)",
		"o1-mini":       "Fast reasoning model",
		"gpt-3.5-turbo": "Fast & affordable",
	}

	if desc, ok := descriptions[modelID]; ok {
		return desc
	}

	if strings.Contains(modelID, "gpt-4o") {
		return "GPT-4 Omni snapshot"
	}

	return ""
}

// fetchZAIModels fetches available models from Z.ai API
func fetchZAIModels(apiKey string) ([]Model, error) {
	// Z.ai API endpoint (based on TypeScript implementation)
	req, err := http.NewRequest("GET", "https://open.bigmodel.cn/api/paas/v4/models", nil)
	if err != nil {
		// If API request fails, return static fallback list
		return []Model{
			{ID: "glm-4.5", Description: "GLM-4.5 flagship model"},
			{ID: "glm-4.5-air", Description: "GLM-4.5 Air (lightweight)"},
			{ID: "glm-4.5-x", Description: "GLM-4.5 X (extended)"},
			{ID: "glm-4.5-airx", Description: "GLM-4.5 AirX"},
			{ID: "glm-4.5-flash", Description: "GLM-4.5 Flash (fastest)"},
			{ID: "glm-4-32b-0414-128k", Description: "GLM-4 32B (128k context)"},
		}, nil
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		// If API request fails, return static fallback list
		return []Model{
			{ID: "glm-4.5", Description: "GLM-4.5 flagship model"},
			{ID: "glm-4.5-air", Description: "GLM-4.5 Air (lightweight)"},
			{ID: "glm-4.5-x", Description: "GLM-4.5 X (extended)"},
			{ID: "glm-4.5-airx", Description: "GLM-4.5 AirX"},
			{ID: "glm-4.5-flash", Description: "GLM-4.5 Flash (fastest)"},
			{ID: "glm-4-32b-0414-128k", Description: "GLM-4 32B (128k context)"},
		}, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		// Return static fallback
		return []Model{
			{ID: "glm-4.5", Description: "GLM-4.5 flagship model"},
			{ID: "glm-4.5-air", Description: "GLM-4.5 Air (lightweight)"},
			{ID: "glm-4.5-x", Description: "GLM-4.5 X (extended)"},
			{ID: "glm-4.5-airx", Description: "GLM-4.5 AirX"},
			{ID: "glm-4.5-flash", Description: "GLM-4.5 Flash (fastest)"},
			{ID: "glm-4-32b-0414-128k", Description: "GLM-4 32B (128k context)"},
		}, nil
	}

	// Try to parse response (format may vary)
	var result struct {
		Data []struct {
			ID      string `json:"id"`
			Object  string `json:"object"`
			Created int64  `json:"created"`
			OwnedBy string `json:"owned_by"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil || len(result.Data) == 0 {
		// Return static fallback if parsing fails
		return []Model{
			{ID: "glm-4.5", Description: "GLM-4.5 flagship model"},
			{ID: "glm-4.5-air", Description: "GLM-4.5 Air (lightweight)"},
			{ID: "glm-4.5-x", Description: "GLM-4.5 X (extended)"},
			{ID: "glm-4.5-airx", Description: "GLM-4.5 AirX"},
			{ID: "glm-4.5-flash", Description: "GLM-4.5 Flash (fastest)"},
			{ID: "glm-4-32b-0414-128k", Description: "GLM-4 32B (128k context)"},
		}, nil
	}

	models := make([]Model, 0, len(result.Data))
	for _, m := range result.Data {
		if m.ID != "" {
			models = append(models, Model{
				ID:          m.ID,
				Description: getZAIModelDescription(m.ID),
			})
		}
	}

	return models, nil
}

func getZAIModelDescription(modelID string) string {
	descriptions := map[string]string{
		"glm-4.5":            "GLM-4.5 flagship model",
		"glm-4.5-air":        "GLM-4.5 Air (lightweight)",
		"glm-4.5-x":          "GLM-4.5 X (extended)",
		"glm-4.5-airx":       "GLM-4.5 AirX",
		"glm-4.5-flash":      "GLM-4.5 Flash (fastest)",
		"glm-4-32b-0414-128k": "GLM-4 32B (128k context)",
	}

	if desc, ok := descriptions[modelID]; ok {
		return desc
	}

	if strings.Contains(modelID, "glm-4.5") {
		return "GLM-4.5 model"
	}
	if strings.Contains(modelID, "glm-4") {
		return "GLM-4 model"
	}

	return ""
}
