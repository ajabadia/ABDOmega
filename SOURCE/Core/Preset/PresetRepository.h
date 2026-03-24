#pragma once

#include "OmegaPreset.h"
#include "PresetVersion.h"
#include <string>
#include <vector>
#include <filesystem>
#include <memory>

namespace Omega {
namespace Core {
namespace Preset {

/**
 * @brief Manages history and snapshots for presets.
 * [Git-for-Sounds]: Implements the versioning, branching and history logic.
 */
class PresetRepository {
public:
    PresetRepository(const std::filesystem::path& rootPath);
    ~PresetRepository();
    
    std::vector<std::string> listPresets() const;

    /**
     * @brief Saves a new snapshot of the given preset.
     * @return The hash of the new snapshot.
     */
    std::string saveSnapshot(const OmegaPreset& preset, 
                             const std::string& author,
                             const std::string& message);

    /**
     * @brief Retrieves a specific version of a preset.
     */
    bool checkout(const std::string& presetId, 
                  const std::string& hash, 
                  OmegaPreset& outPreset) const;

    /**
     * @brief Creates a new branch pointing to the current hash of another branch (or a specific hash).
     */
    bool createBranch(const std::string& presetId, 
                      const std::string& branchName, 
                      const std::string& fromHash = "");

    /**
     * @brief Returns the history of a preset.
     */
    PresetHistory getHistory(const std::string& presetId) const;

    /**
     * @brief Returns the path to the main YAML file for a preset.
     */
    std::filesystem::path getPresetPath(const std::string& presetId) const;

private:
    std::filesystem::path mRootPath;
    
    // Internal helpers
    std::filesystem::path getHistoryPath(const std::string& presetId) const;
    bool loadHistory(const std::string& presetId, PresetHistory& outHistory) const;
    bool saveHistory(const PresetHistory& history) const;
    
    std::filesystem::path getSnapshotPath(const std::string& presetId, const std::string& hash) const;
};

} // namespace Preset
} // namespace Core
} // namespace Omega
