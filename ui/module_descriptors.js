/**
 * OMEGA Module Descriptors (TypeScript)
 * Declarative layouts for modular components.
 */
export const ModuleDescriptors = {
    // Juno DCO (OSC-VA-001)
    "OSC-VA-001": {
        id: "juno-dco",
        title: "JUNO DCO",
        panelClass: "juno-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "LAYERAMAINSAWON", control: "toggle", label: "SAW", row: 0, col: 0, variant: "juno-red" },
            { paramId: "LAYERAMAINPULSEON", control: "toggle", label: "PULSE", row: 0, col: 1, variant: "juno-red" },
            { paramId: "LAYERASUBOSELEVEL", control: "slider-v", label: "SUB", row: 1, col: 0 },
            { paramId: "LAYERANOISELEVEL", control: "slider-v", label: "NOISE", row: 1, col: 1 },
            { paramId: "LAYERADCOMODDEPTH", control: "knob", label: "LFO", row: 2, col: 0 },
            { paramId: "LAYERAPWMAMOUNT", control: "slider-v", label: "PWM", row: 2, col: 1 }
        ],
        footer: { label: "DIGITALLY CONTROLLED OSC" }
    },
    // Juno VCF (FLT-VA-001)
    "FLT-VA-001": {
        id: "juno-vcf",
        title: "IR3109 VCF",
        panelClass: "juno-panel",
        grid: { columns: 3, gap: 12 },
        items: [
            { paramId: "LAYERAMAINCUTOFF", control: "knob", label: "FREQ", row: 0, col: 0 },
            { paramId: "LAYERAMAINRESONANCE", control: "knob", label: "RES", row: 0, col: 1 },
            { paramId: "LAYERAVCFKYBD", control: "knob", label: "KEY", row: 0, col: 2 },
            { paramId: "LAYERAVCFENVDEPTH", control: "knob", label: "ENV", row: 1, col: 0 },
            { paramId: "LAYERAVCFMODDEPTH", control: "knob", label: "LFO", row: 1, col: 1 },
            { paramId: "LAYERAVCFENVPOL", control: "toggle", label: "POL", row: 1, col: 2, variant: "juno-orange" },
            { paramId: "LAYERAMAINHPF", control: "select", label: "HPF", row: 2, col: 0, colSpan: 3 }
        ],
        footer: { label: "ANALOG LOW PASS FILTER" }
    },
    // Space Echo (FX-DL-002)
    "FX-DL-002": {
        id: "space-echo",
        title: "SPACE ECHO",
        panelClass: "space-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "LAYERAFXSPACESPEED", control: "knob", label: "RATE", row: 0, col: 0 },
            { paramId: "LAYERAFXSPACEINTENSITY", control: "knob", label: "INTEN", row: 0, col: 1 },
            { paramId: "LAYERAFXSPACEECHOVOL", control: "knob", label: "ECHO", row: 1, col: 0 },
            { paramId: "LAYERAFXSPACEREVERBVOL", control: "knob", label: "REV", row: 1, col: 1 },
            { paramId: "LAYERAFXSPACEMODE", control: "select", label: "MODE", row: 2, col: 0, colSpan: 2 },
            { paramId: "LAYERAFXSPACEWOW", control: "knob", label: "WOW", row: 3, col: 0 },
            { paramId: "LAYERAFXSPACEDRIVE", control: "knob", label: "DRIVE", row: 3, col: 1 }
        ],
        footer: {
            paramId: "LAYERAFXSPACEENABLE",
            label: "RE-201 TAPE ECHO"
        }
    },
    // Master Delay
    "FX-DL-001": {
        id: "master-delay",
        title: "MASTER DELAY",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "MASTERDELAYTIME", control: "knob", label: "TIME", row: 0, col: 0 },
            { paramId: "MASTERDELAYFEEDBACK", control: "knob", label: "FDBK", row: 0, col: 1 },
            { paramId: "MASTERDELAYMIX", control: "slider-v", label: "MIX", row: 1, col: 0, colSpan: 2 }
        ],
        footer: {
            paramId: "MASTERDELAYENABLED",
            label: "DIGITAL FX CORE"
        }
    },
    // Universal ADSR (EG-STANDARD-001 / ENV-ADSR-GEN)
    "EG-STANDARD-001": {
        id: "adsr",
        title: "EG-ADSR",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "LAYERAMAINATTACK", control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "LAYERAMAINDECAY", control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "LAYERAMAINSUSTAIN", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "LAYERAMAINRELEASE", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },
    "ENV-ADSR-GEN": {
        id: "adsr",
        title: "EG-ADSR",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "LAYERAMAINATTACK", control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "LAYERAMAINDECAY", control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "LAYERAMAINSUSTAIN", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "LAYERAMAINRELEASE", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },
    // Universal VCA (VCA-STANDARD-001)
    "VCA-STANDARD-001": {
        id: "vca",
        title: "AMP-VCA",
        panelClass: "universal-panel",
        grid: { columns: 1, gap: 12 },
        items: [
            { paramId: "LAYERAMAINVCAGAIN", control: "slider-v", label: "GAIN", row: 0, col: 0 },
            { paramId: "LAYERAMAINVCAMODE", control: "toggle", label: "GATE", row: 1, col: 0 }
        ],
        footer: { label: "AMPLIFIER" }
    },
    // Universal LFO (LFO-STANDARD-001)
    "LFO-STANDARD-001": {
        id: "lfo",
        title: "LFO-MOD",
        panelClass: "universal-panel",
        grid: { columns: 1, gap: 12 },
        items: [
            { paramId: "LAYERAMAINLFORATE", control: "knob", label: "RATE", row: 0, col: 0 },
            { paramId: "LAYERAMAINLFOWAVE", control: "select", label: "WAVE", row: 1, col: 0 }
        ],
        footer: { label: "MODULATOR" }
    },
    // Korg/Prophecy Oscillator (OSC-KORG-P)
    "OSC-KORG-P": {
        id: "korg-osc",
        title: "KORG DCO",
        panelClass: "korg-prophecy-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "LAYERAMAINSAWON", control: "toggle", label: "SAW", row: 0, col: 0 },
            { paramId: "LAYERAMAINPULSEON", control: "toggle", label: "PULSE", row: 0, col: 1 }
        ],
        footer: { label: "MOSS ENGINE" }
    },
    // Korg MS-20 Filter (FLT-VA-003)
    "FLT-VA-003": {
        id: "korg-vcf",
        title: "KORG-35 VCF",
        panelClass: "korg-ms20-panel",
        grid: { columns: 3, gap: 12 },
        items: [
            { paramId: "LAYERAMAINCUTOFF", control: "knob", label: "LPF", row: 0, col: 0 },
            { paramId: "LAYERAKORGHPFCUTOFF", control: "knob", label: "HPF", row: 0, col: 1 },
            { paramId: "LAYERAKORGGRIT", control: "knob", label: "DRIVE", row: 0, col: 2 }
        ],
        footer: { label: "VCF (ANALOG)" }
    },
    // JP Supersaw (OSC-VA-004)
    "OSC-VA-004": {
        id: "jp-supersaw",
        title: "JP SUPERSAW",
        panelClass: "jp-panel",
        grid: { columns: 3, gap: 12 },
        items: [
            { paramId: "LAYERAMAINJPDETUNE", control: "knob", label: "DETUNE", row: 0, col: 0 },
            { paramId: "LAYERAMAINJPSPREAD", control: "knob", label: "SPREAD", row: 0, col: 1 },
            { paramId: "LAYERAMAINANALOGDRIFT", control: "knob", label: "DRIFT", row: 0, col: 2 }
        ],
        footer: { label: "ROLAND SUPERSAW" }
    },
    // Juno Chorus (FX-CH-001)
    "FX-CH-001": {
        id: "juno-chorus",
        title: "JUNO CHORUS",
        panelClass: "juno-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "MASTERCHORUSMODE", control: "select", label: "MODE", row: 0, col: 0 },
            { paramId: "MASTERCHORUSMIX", control: "knob", label: "MIX", row: 0, col: 1 }
        ],
        footer: { label: "BBD EFFECT" }
    }
};
// Global instance for runtime compatibility
// @ts-ignore
window.ModuleDescriptors = ModuleDescriptors;
//# sourceMappingURL=module_descriptors.js.map