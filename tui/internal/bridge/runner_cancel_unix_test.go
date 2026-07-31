//go:build darwin || dragonfly || freebsd || linux || netbsd || openbsd

package bridge

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

func TestConfiguredCommandCancellationStopsProcessTree(t *testing.T) {
	tempDir := t.TempDir()
	marker := filepath.Join(tempDir, "child.pid")
	helper := filepath.Join(tempDir, "benchmark-helper")
	script := fmt.Sprintf("#!/bin/sh\nsleep 30 &\nchild=$!\nprintf '%%s' \"$child\" > %q\nwait\n", marker)
	if err := os.WriteFile(helper, []byte(script), 0o700); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, helper)
	configureProcessGroup(cmd)
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}

	childPID := waitForChildPID(t, marker)
	cancel()
	if err := cmd.Wait(); err == nil {
		t.Fatal("expected canceled command to return an error")
	}
	if !errors.Is(ctx.Err(), context.Canceled) {
		t.Fatalf("expected canceled context, got %v", ctx.Err())
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if err := syscall.Kill(childPID, 0); errors.Is(err, syscall.ESRCH) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("descendant process %d still exists after cancellation", childPID)
}

func waitForChildPID(t *testing.T, marker string) int {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		contents, err := os.ReadFile(marker)
		if err == nil && strings.TrimSpace(string(contents)) != "" {
			pid, err := strconv.Atoi(strings.TrimSpace(string(contents)))
			if err != nil {
				t.Fatalf("parse child pid: %v", err)
			}
			return pid
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("helper process did not write child pid")
	return 0
}
