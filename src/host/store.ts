/**
 * StyleStore: the currently selected mindmap style, persisted for the process
 * lifetime and used as the default by mm_generate.
 */

/** Host-side holder of the selected style id. */
export class StyleStore {
  private style: string = 'classic'

  /** Read the current style id. */
  getStyle(): string {
    return this.style
  }

  /** Set the current style id. */
  setStyle(id: string): void {
    this.style = id
  }
}
