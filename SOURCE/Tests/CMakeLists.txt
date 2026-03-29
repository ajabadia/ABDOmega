file(GLOB OMEGA_TEST_SOURCES 
    RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} 
    CONFIGURE_DEPENDS 
    *.cpp *.h
)

add_executable(omegatests
    ${OMEGA_TEST_SOURCES}
    ../Plugin/OmegaAudioProcessor.cpp
    ../UI/OmegaUiBridge.cpp
)

target_link_libraries(omegatests
    PRIVATE
        omega_core
        omega_dsp
        juce::juce_core
        juce::juce_audio_basics
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_gui_extra
        juce::juce_cryptography
        Catch2::Catch2WithMain
)

target_include_directories(omegatests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../Plugin
)

target_compile_definitions(omegatests
    PRIVATE
        JUCE_USE_WIN_WEBVIEW2=0
        OMEGA_UNIT_TESTS=1
)

include(Catch)
catch_discover_tests(omegatests)
