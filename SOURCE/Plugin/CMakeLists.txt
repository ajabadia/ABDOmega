file(GLOB_RECURSE OMEGA_PLUGIN_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

file(GLOB_RECURSE OMEGA_UI_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    ../UI/*.cpp ../UI/*.h
)

juce_add_plugin(omega_plugin
    COMPANY_NAME "ABD-IA"
    BUNDLE_ID    "com.abd-ia.omega"
    IS_SYNTH     TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    PLUGIN_MANUFACTURER_CODE ABDI
    PLUGIN_CODE Ome1
    FORMATS Standalone
    VST3_CAN_REPLACE_VST2 FALSE
    PRODUCT_NAME "OMEGA Synth"
    NEEDS_WEBVIEW2 TRUE
)

target_sources(omega_plugin
    PRIVATE
        ${OMEGA_PLUGIN_SOURCES}
        ${OMEGA_UI_SOURCES}
)

target_link_libraries(omega_plugin
    PRIVATE
        juce::juce_audio_utils
        juce::juce_gui_extra
        omega_core
        omega_dsp
)

target_compile_definitions(omega_plugin
    PRIVATE
        JUCE_USE_WIN_WEBVIEW2=1
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_IGNORE_VST3_MISMATCHED_PARAMETER_ID_WARNING=1
)
