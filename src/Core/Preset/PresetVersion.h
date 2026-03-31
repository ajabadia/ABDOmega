#pragma once

#include <string>
#include <vector>
#include <map>

namespace Omega::Core::Preset {

/**
 * A unique snapshot of a preset state.
 */
struct PresetVersion {
    std::string hash;        // SHA-256 of the YAML content
    std::string parentHash;  // Hash of the version this was based on
    std::string author;      // User name or email
    std::string message;     // Commit/snapshot description
    uint64_t timestamp = 0;   // Seconds since epoch
    std::string tagName;     // Optional tag (e.g. "v1.0", "Release")
};

/**
 * History of a specific preset ID.
 */
struct PresetHistory {
    std::string presetId;
    std::vector<PresetVersion> snapshots;
    std::map<std::string, std::string> branches; // Name -> Hash
    std::string currentBranch = "main";

    std::string getHashForBranch(const std::string& name) const {
        auto it = branches.find(name);
        return (it != branches.end()) ? it->second : "";
    }
};

} // namespace Omega::Core::Preset
