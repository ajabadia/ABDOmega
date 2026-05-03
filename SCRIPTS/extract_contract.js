/**
 * OMEGA Era 7 - Industrial Contract Extractor & Validator
 * Enforces alignment with omega-schema-v7.json
 */
const fs = require('fs');
const path = require('path');

// Official Era 7 Families (from omega-schema-v7.json)
const ERA7_FAMILIES = [
    "oscillator", "filter", "env", "io", "fx", "lfo", 
    "mixer", "utility", "clock", "midi", "control", "sequencer"
];

async function extract(wasmPath) {
    console.log(`[OMEGA] Analyzing ${path.basename(wasmPath)}...`);
    
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            omega_publish_telemetry: () => {},
            omega_publish_midi: () => {},
            omega_set_voice_freq: () => {},
            omega_set_voice_gate: () => {},
            omega_set_voice_vel: () => {},
            omega_set_voice_at: () => {},
            memory: new WebAssembly.Memory({ initial: 1 })
        }
    });

    if (!instance.exports.omega_get_contract) {
        throw new Error("Module is not self-describing (missing omega_get_contract).");
    }

    const ptr = instance.exports.omega_get_contract();
    const mem = new Uint8Array(instance.exports.memory ? instance.exports.memory.buffer : instance.exports.env.memory.buffer);
    let str = "";
    for (let i = ptr; mem[i] !== 0; i++) {
        str += String.fromCharCode(mem[i]);
    }

    const contract = JSON.parse(str);
    
    // --- ERA 7 VALIDATION ---
    console.log(`[VALIDATION] Checking Era 7 Industrial Compliance...`);
    
    // 1. Check ID Pattern
    const idPattern = /^[a-z0-9_]+$/;
    if (!idPattern.test(contract.id)) {
        console.warn(`[WARNING] ID '${contract.id}' should be lowercase alphanumeric.`);
    }

    // 2. Check Family
    if (!ERA7_FAMILIES.includes(contract.family)) {
        console.error(`[ERROR] Invalid Family: '${contract.family}'. Must be one of: ${ERA7_FAMILIES.join(", ")}`);
        process.exit(1);
    }

    // --- SAVE CONTRACT ---
    const contractPath = wasmPath.replace('.wasm', '.contract.json');
    fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
    console.log(`[SUCCESS] Technical Contract saved: ${path.basename(contractPath)}`);

    // --- GENERATE SKELETON MANIFEST (V7) ---
    const manifestPath = wasmPath.replace('.wasm', '.acemm');
    if (!fs.existsSync(manifestPath)) {
        const skeleton = {
            schemaVersion: "7.0",
            id: contract.id,
            metadata: {
                name: contract.name,
                family: contract.family,
                status: "experimental",
                rack: { slot: "main", height_mode: "full", hp: 12 }
            },
            ui: {
                dimensions: { width: 240, height: 420 },
                controls: contract.parameters.map((p, idx) => ({
                    id: `knob_${p.id}`,
                    type: "knob",
                    bind: p.id,
                    label: p.label,
                    pos: { x: 20, y: 60 + (idx * 60) }
                })),
                jacks: contract.ports ? contract.ports.map((p, idx) => ({
                    id: `jack_${p.id}`,
                    type: "port",
                    bind: p.id,
                    label: p.label,
                    pos: { x: 20 + (idx * 40), y: 350 }
                })) : []
            },
            resources: {
                wasm: path.basename(wasmPath),
                contract: path.basename(contractPath)
            }
        };
        fs.writeFileSync(manifestPath, JSON.stringify(skeleton, null, 2));
        console.log(`[SUCCESS] Era 7 Manifest Skeleton generated: ${path.basename(manifestPath)}`);
    }
}

const target = process.argv[2];
if (!target) {
    console.log("Usage: node extract_contract.js <path_to_plugin.wasm>");
    process.exit(1);
}

extract(target).catch(err => {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
});
