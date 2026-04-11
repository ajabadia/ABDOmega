/**
 * OMEGA Module Manager
 * Handles dynamic instantiation of Eurorack modules based on ACE manifests.
 */
class ModuleManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeModules = new Map();
        
        // Component ID to JS Class Mapping (Normalized Era 4.1)
        this.factoryMap = {
            'patchbay_matrix': 'ModuleMatrix',
            'osc_va': 'ModuleJunoDCO',
            'vcf_juno': 'ModuleJunoVCF',
            'osc_jp': 'ModuleJP',
            'vcf_korg': 'ModuleKorg',
            'fx_echo': 'ModuleSpaceEcho',
            'midi_in': 'ModuleGeneric',
            'midi_2_cv': 'ModuleGeneric'
        };
    }

    async updateRack(data) {
        const state = data.preset || data;
        console.log("[ModuleMgr] Updating Rack with dynamic state:", state);
        
        this.container.innerHTML = ''; 
        this.activeModules.clear();
        
        // 1. Render Auxiliary Modules (System / Global)
        if (state.auxiliary && Array.isArray(state.auxiliary)) {
            state.auxiliary.forEach(comp => {
                this.instantiateComponent(comp, "aux");
            });
        }
        
        // 2. Render Voice Nodes (Generation / Audio)
        if (state.layers && state.layers[0] && state.layers[0].voiceChain && state.layers[0].voiceChain.NODES) {
            const nodes = state.layers[0].voiceChain.NODES;
            nodes.forEach(node => {
                this.instantiateComponent(node, "rack");
            });
        }
        
        // Initialize modules with full state
        for (const mod of this.activeModules.values()) {
            if (mod.onStateUpdate) {
                mod.onStateUpdate(data);
            }
        }
    }

    instantiateComponent(comp, type) {
        const componentId = comp.componentId;
        const instanceId = comp.nodeId || comp.id || componentId;
        const className = this.factoryMap[componentId] || 'ModuleGeneric';
        
        console.log(`[ModuleMgr] Creating ${instanceId} (${componentId}) as ${className}`);
        this.addModule(instanceId, className, type);
    }

    addModule(id, className, type) {
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className}`;
        
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerText = id.replace('_', ' ').toUpperCase();
        el.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        
        this.container.appendChild(el);
        
        if (window[className]) {
            const instance = new window[className](el, content);
            this.activeModules.set(id, instance);
        } else {
            content.innerHTML = `<div class="p-4 text-xs text-gray-500">MISSING UI: ${className}</div>`;
        }
    }
}

window.moduleManager = new ModuleManager("omega-rack");
