package bridge

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Tinker's documented machine-readable catalogs include base models and
// serverless sampling variants. They currently contain no release dates.
func fetchTinkerModels() ([]Model, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	var models []Model
	seen := make(map[string]bool)
	for _, catalog := range []string{"models", "serverless"} {
		url := "https://tinker-docs.thinkingmachines.ai/tinker/" + catalog + ".json"
		resp, err := client.Get(url)
		if err != nil {
			return nil, fmt.Errorf("Tinker catalog: %w", err)
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("Tinker catalog returned status %d", resp.StatusCode)
		}
		var entries []struct {
			ID          string `json:"tinker_id"`
			Name        string `json:"name"`
			Context     string `json:"context"`
			Type        string `json:"type"`
			ReleaseDate string `json:"release_date"`
		}
		err = json.NewDecoder(resp.Body).Decode(&entries)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("Tinker catalog: %w", err)
		}
		for _, entry := range entries {
			if strings.TrimSpace(entry.ID) == "" || seen[entry.ID] {
				continue
			}
			seen[entry.ID] = true
			name := entry.Name
			if name == "" {
				name = entry.ID
			}
			description := strings.TrimSpace(entry.Context + " " + entry.Type)
			if catalog == "serverless" {
				description = strings.TrimSpace(description + " serverless")
			}
			var released time.Time
			// Never treat generic created timestamps or model-name suffixes as releases.
			for _, layout := range []string{time.RFC3339, "2006-01-02"} {
				if parsed, err := time.Parse(layout, entry.ReleaseDate); err == nil {
					released = validCatalogDate(parsed)
					break
				}
			}
			models = append(models, Model{ID: entry.ID, Name: name, Description: description, AddedAt: released})
		}
	}
	if len(models) == 0 {
		return nil, fmt.Errorf("Tinker catalog returned no models")
	}
	return models, nil
}
