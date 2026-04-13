# ------------------------------------------------------------------------------
# Build configuration for omega_core (Static Library)
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Source Gathering (Recursively)
# ------------------------------------------------------------------------------
file(GLOB_RECURSE OMEGA_CORE_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

# Exclude tool source from main library to avoid duplicate main()
list(REMOVE_ITEM OMEGA_CORE_SOURCES "Ace/omega-schema-tool.cpp")


# ------------------------------------------------------------------------------
# Library Definition
# ------------------------------------------------------------------------------
add_library(omega_core STATIC ${OMEGA_CORE_SOURCES})

# ------------------------------------------------------------------------------
# Include Paths
# ------------------------------------------------------------------------------
target_include_directories(omega_core 
    PUBLIC 
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/Input
        ${CMAKE_CURRENT_SOURCE_DIR}/Preset
        ${CMAKE_CURRENT_SOURCE_DIR}/Ace
        ${CMAKE_CURRENT_SOURCE_DIR}/Providers
        ${CMAKE_CURRENT_SOURCE_DIR}/Modulation
        ${CMAKE_CURRENT_SOURCE_DIR}/Voice
        ${CMAKE_CURRENT_SOURCE_DIR}/Wasm
)

target_compile_definitions(omega_core
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1
)

# ------------------------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------------------------
target_link_libraries(omega_core 
    PUBLIC 
        yaml-cpp
        vmlib
        juce::juce_core
        juce::juce_cryptography
        juce::juce_data_structures
        juce::juce_audio_basics
)

# ------------------------------------------------------------------------------
# Schema Tool Executable (VEM-169)
# ------------------------------------------------------------------------------
add_executable(omega-schema-tool Ace/omega-schema-tool.cpp)
target_link_libraries(omega-schema-tool PRIVATE omega_core juce::juce_core juce::juce_events)
target_compile_definitions(omega-schema-tool PRIVATE JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1)
