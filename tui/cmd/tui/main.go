package main

import (
	"fmt"
	"os"
	"os/signal"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/models"
	"syscall"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {
	// Load existing config
	cfg, err := config.LoadFromEnv()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		os.Exit(1)
	}

	// Create initial model
	initialModel := models.NewWelcomeModel(cfg)

	// Create program with signal handling
	p := tea.NewProgram(initialModel, tea.WithAltScreen())

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		p.Quit()
	}()

	// Run
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error running TUI: %v\n", err)
		os.Exit(1)
	}
}
