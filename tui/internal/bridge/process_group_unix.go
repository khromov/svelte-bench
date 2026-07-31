//go:build darwin || dragonfly || freebsd || linux || netbsd || openbsd

package bridge

import (
	"os/exec"
	"syscall"
)

// configureProcessGroup makes the benchmark command the leader of a process
// group. On Unix, CommandContext can then terminate pnpm and the benchmark
// processes it launches rather than killing only the pnpm wrapper.
func configureProcessGroup(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	directCancel := cmd.Cancel
	cmd.Cancel = func() error {
		if cmd.Process != nil {
			if err := syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL); err == nil {
				return nil
			}
		}
		return directCancel()
	}
}
