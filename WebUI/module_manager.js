/**
 * OMEGA Module Manager
 * Handles dynamic instantiation of Eurorack modules.
 */
class ModuleManager {
    constructor() {
        this.activeModules = new Map();
        this.oscilloscopes = []; // Special list for telemetry
    }

    async updateRack(state) {
        console.log("[ModuleMgr] Updating Dual-Rack with state:", state);
        
        // Clear both racks
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        if (upper) upper.innerHTML = '';
        if (lower) lower.innerHTML = '';
        
        this.activeModules.clear();
        this.oscilloscopes = [];
        
        // 1. Auxiliary Modules (Upper Rack)
        this.addMidiTrigger(upper);
        this.addOscilloscope("tele-lfo1", "LFO 1", 10, upper);
        this.addOscilloscope("tele-vcf", "VCF MOD", 8, upper);
        
        // 2. Core Modules (Lower Rack)
        this.addModule("DCO", "ModuleJunoDCO", "osc", lower);
        this.addModule("VCF", "ModuleJunoVCF", "filter", lower);
        this.addModule("JP", "ModuleJP", "filter", lower);
        this.addModule("KORG", "ModuleKorg", "filter", lower);
        this.addModule("FX", "ModuleSpaceEcho", "fx", lower);
        
        // Initialize modules with state
        for (const mod of this.activeModules.values()) {
            if (mod.onStateUpdate) {
                mod.onStateUpdate(state);
            }
        }
    }

    addModule(id, className, type, container) {
        if (!container) return;
        
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className}`;
        
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerText = id;
        el.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        
        container.appendChild(el);
        
        if (window[className]) {
            const instance = new window[className](el, content);
            this.activeModules.set(id, instance);
        }
    }

    addOscilloscope(id, label, signalIndex, container) {
        if (!container || !window.ModuleOscilloscope) return;
        const osc = new window.ModuleOscilloscope(id, container, signalIndex, label);
        this.oscilloscopes.push(osc);
    }

    addMidiTrigger(container) {
        if (!container || !window.ModuleMidiTrigger) return;
        const trigger = new window.ModuleMidiTrigger(container);
        this.activeModules.set("MIDI-TRIG", trigger);
    }
}

window.moduleManager = new ModuleManager();
