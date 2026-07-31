package bridge

import (
	"encoding/json"
	"strings"
	"time"
)

type openAIModelList struct {
	Data []struct {
		ID string `json:"id"`
	} `json:"data"`
}

func parseOpenAIModels(body []byte) ([]Model, error) {
	var result openAIModelList
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	popular := modelSet("gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini", "gpt-3.5-turbo")
	models := make([]Model, 0, len(result.Data))
	for _, item := range result.Data {
		if isOpenAIChatModel(item.ID) {
			models = append(models, Model{ID: item.ID, Name: item.ID, Description: openAIDescription(item.ID), IsPopular: popular[item.ID]})
		}
	}
	return models, nil
}

func isOpenAIChatModel(modelID string) bool {
	if strings.HasPrefix(modelID, "gpt-image") || strings.HasPrefix(modelID, "gpt-audio") {
		return false
	}
	return strings.HasPrefix(modelID, "gpt-") || strings.HasPrefix(modelID, "o1") ||
		strings.HasPrefix(modelID, "o3") || strings.HasPrefix(modelID, "o4") ||
		strings.HasPrefix(modelID, "chatgpt-") || strings.HasPrefix(modelID, "ft:gpt-")
}

func parseOpenRouterModels(body []byte) ([]Model, error) {
	var result struct {
		Data []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			Created     int64  `json:"created"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	models := make([]Model, 0, len(result.Data))
	for _, item := range result.Data {
		var addedAt time.Time
		if item.Created > 0 {
			addedAt = time.Unix(item.Created, 0).UTC()
		}
		models = append(models, Model{ID: item.ID, Name: item.Name, Description: item.Description, AddedAt: addedAt})
	}
	return models, nil
}

func parseSimpleModels(body []byte) ([]Model, error) {
	var result openAIModelList
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	models := make([]Model, 0, len(result.Data))
	for _, item := range result.Data {
		models = append(models, Model{ID: item.ID, Name: item.ID})
	}
	return models, nil
}

func parseOpenAICompatibleModels(body []byte) ([]Model, error) {
	models, err := parseSimpleModels(body)
	if err != nil {
		return nil, err
	}
	result := models[:0]
	for _, model := range models {
		if model.ID != "" {
			result = append(result, model)
		}
	}
	return result, nil
}

func parseAnthropicModels(body []byte) ([]Model, error) {
	var result struct {
		Data []struct {
			ID          string `json:"id"`
			DisplayName string `json:"display_name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	popular := modelSet("claude-sonnet-4-5-20250929", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022")
	models := make([]Model, 0, len(result.Data))
	for _, item := range result.Data {
		models = append(models, Model{ID: item.ID, Name: item.DisplayName, IsPopular: popular[item.ID]})
	}
	return models, nil
}

func parseGoogleModels(body []byte) ([]Model, error) {
	var result struct {
		Models []struct {
			Name             string   `json:"name"`
			DisplayName      string   `json:"displayName"`
			Description      string   `json:"description"`
			SupportedMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	popular := modelSet("gemini-2.0-flash-exp", "gemini-exp-1206", "gemini-2.0-flash-thinking-exp", "gemini-1.5-pro", "gemini-1.5-flash")
	models := make([]Model, 0, len(result.Models))
	for _, item := range result.Models {
		if !containsString(item.SupportedMethods, "generateContent") {
			continue
		}
		id := strings.TrimPrefix(item.Name, "models/")
		models = append(models, Model{ID: id, Name: item.DisplayName, Description: item.Description, IsPopular: popular[id]})
	}
	return models, nil
}

func parseXAIModels(body []byte) ([]Model, error) {
	var result struct {
		Models []struct {
			ID               string   `json:"id"`
			InputModalities  []string `json:"input_modalities"`
			OutputModalities []string `json:"output_modalities"`
		} `json:"models"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	models := make([]Model, 0, len(result.Models))
	for _, item := range result.Models {
		if item.ID != "" && containsString(item.InputModalities, "text") && containsString(item.OutputModalities, "text") {
			models = append(models, Model{ID: item.ID, Name: item.ID})
		}
	}
	return models, nil
}

func parseMoonshotModels(body []byte) ([]Model, error) {
	var result openAIModelList
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	popular := modelSet("moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k")
	models := make([]Model, 0, len(result.Data))
	for _, item := range result.Data {
		models = append(models, Model{ID: item.ID, Name: item.ID, IsPopular: popular[item.ID]})
	}
	return models, nil
}

func parseCohereModels(body []byte) ([]Model, error) {
	var result struct {
		Models []struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Deprecated  bool   `json:"is_deprecated"`
		} `json:"models"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	models := make([]Model, 0, len(result.Models))
	for _, item := range result.Models {
		if item.Name != "" && !item.Deprecated {
			models = append(models, Model{ID: item.Name, Name: item.Name, Description: item.Description, IsPopular: strings.HasPrefix(item.Name, "command-a") || item.Name == "command-r-plus"})
		}
	}
	return models, nil
}

func parseFireworksModels(body []byte) ([]Model, error) {
	models, err := parseSimpleModels(body)
	if err != nil {
		return nil, err
	}
	result := models[:0]
	for _, model := range models {
		if strings.Contains(model.ID, "chat") || strings.Contains(model.ID, "instruct") {
			result = append(result, model)
		}
	}
	return result, nil
}

func parseZAIModels(body []byte) ([]Model, error) {
	models, err := parseOpenAICompatibleModels(body)
	if err != nil {
		return nil, err
	}
	for i := range models {
		models[i].Name = ""
		models[i].Description = zAIModelDescription(models[i].ID)
	}
	return models, nil
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func modelSet(ids ...string) map[string]bool {
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set
}
