/**
 * Panel controller: open/close state for the mindmap workspace, with a tiny
 * subscription helper so DOM surfaces can reflect the state.
 */

/** Snapshot the controller exposes. */
export interface PanelControllerSnapshot {
  readonly panelOpen: boolean
}

const INITIAL: PanelControllerSnapshot = { panelOpen: false }

/** Open/close state holder for the mindmap panel. */
export class PanelController {
  private state: PanelControllerSnapshot = INITIAL
  private listeners = new Set<() => void>()

  getSnapshot(): PanelControllerSnapshot {
    return this.state
  }

  /** Subscribe to state changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }

  /** Toggle the panel. */
  toggle(): void {
    this.setOpen(!this.state.panelOpen)
  }

  /** Open or close the panel. */
  setOpen(open: boolean): void {
    if (this.state.panelOpen === open) return
    this.state = { panelOpen: open }
    this.emit()
  }
}
