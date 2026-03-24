/**
 * OMEGA Module Manager
 * Handles dynamic instantiation of Eurorack modules.
 */
class ModuleManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeModules = new Map();
    }

    async updateRack(state) {
        console.log("[ModuleMgr] Updating Rack with state:", state);
        
        this.container.innerHTML = ''; // Clear rack
        this.activeModules.clear();
        
        // Populate full rack
        this.addModule("DCO", "ModuleJunoDCO", "osc");
        this.addModule("VCF", "ModuleJunoVCF", "filter");
        this.addModule("JP", "ModuleJP", "filter");
        this.addModule("KORG", "ModuleKorg", "filter");
        this.addModule("FX", "ModuleSpaceEcho", "fx");
        
        // Initialize modules with state
        for (const mod of this.activeModules.values()) {
            if (mod.onStateUpdate) {
                mod.onStateUpdate(state);
            }
        }
    }

    addModule(id, className, type) {
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
        
        this.container.appendChild(el);
        
        // Instantiate logic (if exists as a class)
        if (window[className]) {
            const instance = new window[className](el, content);
            this.activeModules.set(id, instance);
        }
    }
}

window.moduleManager = new ModuleManager("omega-rack");
