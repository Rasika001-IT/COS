// Minimal promise mutex — just enough for baseQueryWithReauth's single-flight
// refresh (acquire / release / isLocked / waitForUnlock). Zero deps.
type Release = () => void

export class Mutex {
  private locked = false
  private acquireQueue: Array<() => void> = []
  private unlockWaiters: Array<() => void> = []

  isLocked(): boolean {
    return this.locked
  }

  acquire(): Promise<Release> {
    return new Promise<Release>((resolve) => {
      const grant = () => {
        this.locked = true
        resolve(() => this.release())
      }
      if (!this.locked) grant()
      else this.acquireQueue.push(grant)
    })
  }

  /** Resolves immediately if unlocked, otherwise when the lock is fully released. */
  waitForUnlock(): Promise<void> {
    if (!this.locked) return Promise.resolve()
    return new Promise<void>((resolve) => this.unlockWaiters.push(resolve))
  }

  private release(): void {
    const nextOwner = this.acquireQueue.shift()
    if (nextOwner) {
      // Hand the lock straight to the next acquirer; stays locked.
      nextOwner()
      return
    }
    this.locked = false
    const waiters = this.unlockWaiters
    this.unlockWaiters = []
    waiters.forEach((w) => w())
  }
}
