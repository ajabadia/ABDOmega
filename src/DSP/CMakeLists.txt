file(GLOB_RECURSE OMEGA_DSP_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

add_library(omega_dsp STATIC ${OMEGA_DSP_SOURCES})

target_include_directories(omega_dsp
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/..
)

target_link_libraries(omega_dsp
    PUBLIC
        juce::juce_dsp
        omega_core
        omega_engine
)
