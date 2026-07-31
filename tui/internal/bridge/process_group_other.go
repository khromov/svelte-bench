//go:build !darwin && !dragonfly && !freebsd && !linux && !netbsd && !openbsd

package bridge

import "os/exec"

// CommandContext still cancels the direct pnpm process on other platforms.
// Descendant-process cancellation requires a platform-specific implementation.
func configureProcessGroup(_ *exec.Cmd) {}
