package models

import "strings"

func redactAPIKey(message, key string) string {
	if key == "" {
		return message
	}
	return strings.ReplaceAll(message, key, "[redacted]")
}
