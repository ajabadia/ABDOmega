export const NORMATIVE_PINS = [
  { id: 'activity', type: 'float', roles: ['telemetry'], label: 'ACTIVITY LED', description: 'Real-time processing activity indicator.' },
  { id: 'system:cpu_load', type: 'float', roles: ['telemetry'], label: 'CPU LOAD', description: 'Percentage of host CPU usage.' },
  { id: 'system:memory_load', type: 'float', roles: ['telemetry'], label: 'MEMORY LOAD', description: 'Percentage of host memory usage.' },
  { id: 'system:midi_monitor', type: 'list', roles: ['telemetry'], label: 'MIDI MONITOR', description: 'History of recent MIDI events.' },
  { id: 'system:audio_in', type: 'audio', roles: ['input', 'stream'], label: 'SYSTEM AUDIO IN', description: 'Host audio input stream.' },
  { id: 'system:audio_out', type: 'audio', roles: ['output', 'stream'], label: 'SYSTEM AUDIO OUT', description: 'Master audio output stream.' }
];
