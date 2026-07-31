package main

import (
	"fmt"
	"os"
	"os/signal"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/models"
	"syscall"

	tea "charm.land/bubbletea/v2"
)

func main() {
	// Load existing config
	cfg, err := config.LoadFromEnv()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		os.Exit(1)
	}

	// Create initial model
	initialModel := models.NewProviderSelectFromConfig(cfg)

	// Create program with signal handling
	p := tea.NewProgram(initialModel)

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		// Route external termination through the active model so a running
		// benchmark cancels its owned context before Bubble Tea exits.
		p.Send(tea.KeyPressMsg(tea.Key{Code: 'c', Mod: tea.ModCtrl}))
	}()

	// Run
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error running TUI: %v\n", err)
		os.Exit(1)
	}
}
