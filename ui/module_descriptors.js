/**
 * OMEGA Module Descriptors
 * Declarative layouts for modular components.
 */
window.ModuleDescriptors = {
    // Juno DCO (OSC-VA-001)
    "OSC-VA-001": {
        id: "juno-dco",
        panelClass: "juno-panel dco",
        grid: { columns: 2, gap: 10 },
        items: [
            { paramId: "LAYERAMAINSAWON",     control: "toggle",   label: "SAW",   row: 0, col: 0, variant: "juno-red" },
            { paramId: "LAYERAMAINPULSEON",   control: "toggle",   label: "PULSE", row: 0, col: 1, variant: "juno-red" },
            { paramId: "LAYERASUBOSELEVEL",   control: "slider-v", label: "SUB",   row: 1, col: 0 },
            { paramId: "LAYERANOISELEVEL",    control: "slider-v", label: "NOISE", row: 1, col: 1 },
            { paramId: "LAYERAPWMMODE",       control: "select",   label: "PWM",   row: 2, col: 0 },
            { paramId: "LAYERAPWMAMOUNT",     control: "slider-v", label: "AMT",   row: 2, col: 1 }
        ]
    },

    // Juno VCF (FLT-VA-001)
    "FLT-VA-001": {
        id: "juno-vcf",
        panelClass: "juno-panel vcf",
        grid: { columns: 3, gap: 10 },
        items: [
            { paramId: "LAYERAMAINCUTOFF",    control: "knob",     label: "FREQ",  row: 0, col: 0 },
            { paramId: "LAYERAMAINRESONANCE", control: "knob",     label: "RES",   row: 0, col: 1 },
            { paramId: "LAYERAVCFKYBD",       control: "knob",     label: "KEY",   row: 0, col: 2 },
            { paramId: "LAYERAVCFENVDEPTH",   control: "knob",     label: "ENV",   row: 1, col: 0 },
            { paramId: "LAYERAVCFMODDEPTH",   control: "knob",     label: "LFO",   row: 1, col: 1 },
            { paramId: "LAYERAVCFENVPOL",     control: "toggle",   label: "POL",   row: 1, col: 2, variant: "juno-orange" },
            { paramId: "LAYERAMAINHPF",       control: "select",   label: "HPF",   row: 2, col: 0, colSpan: 3 }
        ]
    },

    // Space Echo (FX-DL-002)
    "FX-DL-002": {
        id: "space-echo",
        panelClass: "space-panel",
        grid: { columns: 2, gap: 10 },
        items: [
            { paramId: "LAYERAFXSPACESPEED",     control: "knob",     label: "RATE",  row: 0, col: 0 },
            { paramId: "LAYERAFXSPACEINTENSITY", control: "knob",     label: "INTEN", row: 0, col: 1 },
            { paramId: "LAYERAFXSPACEECHOVOL",   control: "knob",     label: "ECHO",  row: 1, col: 0 },
            { paramId: "LAYERAFXSPACEREVERBVOL", control: "knob",     label: "REV",   row: 1, col: 1 },
            { paramId: "LAYERAFXSPACEMODE",      control: "select",   label: "MODE",  row: 2, col: 0, colSpan: 2 },
            { paramId: "LAYERAFXSPACEWOW",       control: "knob",     label: "WOW",   row: 3, col: 0 },
            { paramId: "LAYERAFXSPACEDRIVE",     control: "knob",     label: "DRIVE", row: 3, col: 1 }
        ],
        footer: {
            paramId: "LAYERAFXSPACEENABLE",
            label: "RE-201 TAPE ECHO"
        }
    },

    // Master Delay (MASTERDELAYENABLED is global, but we can treat it as a module)
    "FX-DL-001": {
        id: "master-delay",
        panelClass: "delay-panel",
        grid: { columns: 2, gap: 8 },
        items: [
            { paramId: "MASTERDELAYTIME",     control: "knob",     label: "TIME",  row: 0, col: 0 },
            { paramId: "MASTERDELAYFEEDBACK", control: "knob",     label: "FDBK",  row: 0, col: 1 },
            { paramId: "MASTERDELAYMIX",      control: "slider-v", label: "MIX",   row: 1, col: 0, colSpan: 2 }
        ],
        footer: {
            paramId: "MASTERDELAYENABLED",
            label: "MASTER DELAY"
        }
    },

    // Universal ADSR (EG-STANDARD-001 / ENV-ADSR-GEN)
    "EG-STANDARD-001": {
        id: "adsr",
        panelClass: "env-panel",
        grid: { columns: 2, gap: 8 },
        items: [
            { paramId: "LAYERAMAINATTACK",  control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "LAYERAMAINDECAY",   control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "LAYERAMAINSUSTAIN", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "LAYERAMAINRELEASE", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },
    "ENV-ADSR-GEN": {
        id: "adsr",
        panelClass: "env-panel",
        grid: { columns: 2, gap: 8 },
        items: [
            { paramId: "LAYERAMAINATTACK",  control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "LAYERAMAINDECAY",   control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "LAYERAMAINSUSTAIN", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "LAYERAMAINRELEASE", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },

    // Universal VCA (VCA-STANDARD-001)
    "VCA-STANDARD-001": {
        id: "vca",
        panelClass: "vca-panel",
        grid: { columns: 1, gap: 8 },
        items: [
            { paramId: "LAYERAMAINVCAGAIN", control: "slider-v", label: "GAIN", row: 0, col: 0 }
        ],
        footer: { label: "AMPLIFIER" }
    },

    // Universal LFO (LFO-STANDARD-001)
    "LFO-STANDARD-001": {
        id: "lfo",
        panelClass: "lfo-panel",
        grid: { columns: 1, gap: 10 },
        items: [
            { paramId: "LAYERAMAINLFORATE", control: "knob", label: "RATE", row: 0, col: 0 },
            { paramId: "LAYERAMAINLFOWAVE", control: "select", label: "WAVE", row: 1, col: 0 }
        ],
        footer: { label: "MODULATOR" }
    },

    // Korg/Prophecy Oscillator (OSC-KORG-P)
    "OSC-KORG-P": {
        id: "korg-osc",
        panelClass: "korg-panel osc",
        grid: { columns: 2, gap: 10 },
        items: [
            { paramId: "LAYERAMAINSAWON", control: "knob", label: "OSC-A", row: 0, col: 0 },
            { paramId: "LAYERAMAINPULSEON", control: "knob", label: "OSC-B", row: 0, col: 1 }
        ],
        footer: { label: "KORG DCO" }
    },

    // Korg MS-20 Filter (FLT-VA-003)
    "FLT-VA-003": {
        id: "korg-vcf",
        panelClass: "korg-panel vcf",
        grid: { columns: 3, gap: 10 },
        items: [
            { paramId: "LAYERAMAINCUTOFF",     control: "knob", label: "LPF", row: 0, col: 0 },
            { paramId: "LAYERAKORGHPFCUTOFF",  control: "knob", label: "HPF", row: 0, col: 1 },
            { paramId: "LAYERAKORGGRIT",       control: "knob", label: "GRIT", row: 0, col: 2 }
        ],
        footer: { label: "KORG-35 VCF" }
    },

    // JP Supersaw (OSC-VA-004)
    "OSC-VA-004": {
        id: "jp-supersaw",
        panelClass: "jp-panel osc",
        grid: { columns: 2, gap: 10 },
        items: [
            { paramId: "LAYERAMAINSAWON", control: "knob", label: "MIX", row: 0, col: 0 },
            { paramId: "LAYERAMAINPULSEON", control: "knob", label: "DETUNE", row: 0, col: 1 }
        ],
        footer: { label: "JP SUPERSAW" }
    },

    // Juno Chorus (FX-CH-001)
    "FX-CH-001": {
        id: "juno-chorus",
        panelClass: "juno-panel chorus",
        grid: { columns: 1, gap: 10 },
        items: [
            { paramId: "LAYERAFXCHORUSMODE", control: "select", label: "MODE", row: 0, col: 0 }
        ],
        footer: { label: "JUNO CHORUS" }
    }
};
