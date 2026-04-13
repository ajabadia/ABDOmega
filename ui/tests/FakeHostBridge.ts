/**
 * OMEGA Era 6.1 - Fake Host Bridge
 * Simulates C++ OmegaUiBridge behavior for contract validation.
 */
export class FakeHostBridge {
  private lastReceivedType: string | null = null;
  private lastReceivedPayload: any = null;
  private messageCallback: ((json: string) => void) | null = null;

  constructor() {
    // Attach to window as the C++ bridge does
    (window as any).omegaNativeCall = (type: string, requestId: any, payload: any) => {
      this.handleNativeCall(type, requestId, payload);
    };
  }

  public setCallback(callback: (json: string) => void) {
    this.messageCallback = callback;
    (window as any).handleOmegaMessage = callback;
  }

  private handleNativeCall(type: string, requestId: any, payload: any) {
    this.lastReceivedType = type;
    this.lastReceivedPayload = payload;

    // --- CONTRACT ENFORCEMENT SIMULATION ---

    // 1. Fail-Fast for Legacy
    if (type === 'setParam' || type === 'menuAction') {
      this.sendToUi({
        type: 'rpcError',
        requestId,
        errorCode: 'CONTRACTVIOLATION',
        message: `Legacy protocol '${type}' is deprecated.`,
      });
      return;
    }

    // 2. Nominal Era 6.1 Responses
    switch (type) {
      case 'setParameter':
        this.sendToUi({
          type: 'PARAMACK',
          requestId,
          payload,
        });
        return;

      case 'getState':
        this.sendToUi({
          type: 'state',
          requestId,
          payload: {
            schemaVersion: '1.0',
            preset: { id: 'test-preset', name: 'Test Preset', author: 'Vitest' },
            params: { 'OSC1_FREQ': 0.5, 'FILTER1_CUTOFF': 0.8 }
          }
        });
        return;

      case 'uiReady':
        this.sendToUi({
          type: 'UIREADYACK',
          requestId,
          payload: true
        });
        return;

      default:
        this.sendToUi({
          type: 'rpcError',
          requestId,
          errorCode: 'UNKNOWN_COMMAND',
          message: `Command '${type}' not implemented in FakeHost.`
        });
    }
  }

  private sendToUi(msg: any) {
    if (this.messageCallback) {
      this.messageCallback(JSON.stringify(msg));
    }
  }

  /**
   * Inject a push event from "C++"
   */
  public injectEvent(type: string, payload: any) {
    this.sendToUi({ type, ...payload });
  }

  public getLastCall() {
    return { type: this.lastReceivedType, payload: this.lastReceivedPayload };
  }
}
