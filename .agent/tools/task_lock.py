"""Cross-process exclusive lock for Task Graph runtime state.

Shared by task_state.py and task_recovery.py. A lock covers the whole
read -> decide -> write cycle. It uses fcntl.flock on a sibling
`<state>.lock` file (standard library only, POSIX). The lock file is
never deleted, so there is no unlink race, and the kernel releases the
lock if the holder dies.
"""

import fcntl
import os
import time
from pathlib import Path

DEFAULT_TIMEOUT = 30.0


class LockTimeout(Exception):
    pass


def lock_timeout():
    try:
        return float(os.environ.get("TASK_LOCK_TIMEOUT", DEFAULT_TIMEOUT))
    except ValueError:
        return DEFAULT_TIMEOUT


class StateLock:
    def __init__(self, state_path, timeout=None):
        state_path = Path(state_path)
        self.path = state_path.with_name(state_path.name + ".lock")
        self.timeout = lock_timeout() if timeout is None else timeout
        self.fd = None

    def acquire(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(self.path, os.O_RDWR | os.O_CREAT, 0o644)
        deadline = time.monotonic() + self.timeout

        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    os.close(fd)
                    raise LockTimeout(
                        f"could not lock {self.path} "
                        f"within {self.timeout}s"
                    )

                time.sleep(0.02)

        self.fd = fd
        return self

    def release(self):
        if self.fd is not None:
            os.close(self.fd)  # closing the fd drops the flock
            self.fd = None

    def __enter__(self):
        return self.acquire()

    def __exit__(self, *exc):
        self.release()
        return False
