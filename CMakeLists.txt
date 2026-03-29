cmake_minimum_required(VERSION 3.25.0)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)

project(OMEGA VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Force static linking for dependencies
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build static libraries" FORCE)

include(FetchContent)

# yaml-cpp
FetchContent_Declare(
    yaml-cpp
    GIT_REPOSITORY https://github.com/jbeder/yaml-cpp.git
    GIT_TAG 0.8.0
)

# Catch2
FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.4.0
)

FetchContent_MakeAvailable(yaml-cpp Catch2)

add_subdirectory(JUCE _juce)
include_directories(JUCE/modules)

# Módulos OMEGA
add_subdirectory(SOURCE/Core)
add_subdirectory(SOURCE/DSP)
add_subdirectory(SOURCE/Plugin)

# Tests
include(CTest)
enable_testing()
add_subdirectory(SOURCE/Tests)
