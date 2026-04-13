import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OmegaRPC } from '../omega_rpc.js';
import { FakeHostBridge } from './FakeHostBridge.js';

describe('OMEGA Era 6.1 - RPC Contract Validation', () => {
  let rpc: OmegaRPC;
  let host: FakeHostBridge;

  beforeEach(() => {
    // 1. Setup Fake Host
    host = new FakeHostBridge();
    
    // 2. Setup RPC client
    rpc = new OmegaRPC();

    // 3. Connect them
    host.setCallback((window as any).handleOmegaMessage);
  });

  describe('Connection & Bootstrap', () => {
    it('should receive UIREADYACK on uiReady', async () => {
      const response = await rpc.uiReady();
      expect(response).toBe(true);
    });
  });

  describe('Parameter Contract', () => {
    it('should send correct setParameter payload and receive PARAMACK', async () => {
      const payload = { target: 'OSC1_TYPE', value: 2.0 };
      const response = await rpc.send('setParameter', payload);
      
      expect(response.target).toBe('OSC1_TYPE');
      expect(response.value).toBe(2.0);
      
      const lastCall = host.getLastCall();
      expect(lastCall.type).toBe('setParameter');
      if (!lastCall.payload) throw new Error("Payload missing");
      expect(lastCall.payload.target).toBe('OSC1_TYPE');
    });

    it('should REJECT legacy setParam with CONTRACTVIOLATION', async () => {
      await expect(rpc.send('setParam', { id: 'test', value: 0.5 }))
        .rejects.toThrow(/Legacy protocol 'setParam'/);
    });
  });

  describe('State Contract', () => {
    it('should receive state with schemaVersion 1.0', async () => {
      const response = await rpc.getState();
      
      expect(response.schemaVersion).toBe('1.0');
      expect(response.preset.name).toBe('Test Preset');
      expect(response.params['OSC1_FREQ']).toBe(0.5);
    });
  });

  describe('Event Normalization (Era 6.1 Shunt)', () => {
    it('should normalize legacy PARAM_CHANGE to omega:PARAMCHANGE event', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      // Inject legacy event
      host.injectEvent('PARAM_CHANGE', { target: 'FILTER1_RES', value: 0.9 });
      
      expect(dispatchSpy).toHaveBeenCalled();
      const calls = dispatchSpy.mock.calls;
      const firstCall = calls[0];
      if (!firstCall) throw new Error("Dispatch not called");
      const lastEvent = firstCall[0] as CustomEvent;
      
      expect(lastEvent.type).toBe('omega:PARAMCHANGE');
      expect(lastEvent.detail.id).toBe('FILTER1_RES');
      expect(lastEvent.detail.value).toBe(0.9);
    });

    it('should pass nominal PARAMCHANGE directly', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      // Inject nominal event
      host.injectEvent('PARAMCHANGE', { id: 'LFO1_SPEED', value: 0.3 });
      
      expect(dispatchSpy).toHaveBeenCalled();
      const calls = dispatchSpy.mock.calls;
      const firstCall = calls[0];
      if (!firstCall) throw new Error("Dispatch not called");
      const lastEvent = firstCall[0] as CustomEvent;
      
      expect(lastEvent.type).toBe('omega:PARAMCHANGE');
      expect(lastEvent.detail.id).toBe('LFO1_SPEED');
    });
  });
});
