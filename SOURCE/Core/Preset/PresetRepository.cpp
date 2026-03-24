#include "PresetRepository.h"
#include <yaml-cpp/yaml.h>
#include <fstream>
#include <chrono>
#include <algorithm>
#include <juce_core/juce_core.h>

namespace YAML {
    template<>
    struct convert<Omega::Core::Preset::PresetVersion> {
        static Node encode(const Omega::Core::Preset::PresetVersion& rhs) {
            Node node;
            node["hash"] = rhs.hash;
            node["parent"] = rhs.parentHash;
            node["author"] = rhs.author;
            node["message"] = rhs.message;
            node["timestamp"] = rhs.timestamp;
            if (!rhs.tagName.empty()) node["tag"] = rhs.tagName;
            return node;
        }

        static bool decode(const Node& node, Omega::Core::Preset::PresetVersion& rhs) {
            if (!node["hash"]) return false;
            rhs.hash = node["hash"].as<std::string>();
            if (node["parent"]) rhs.parentHash = node["parent"].as<std::string>();
            if (node["author"]) rhs.author = node["author"].as<std::string>();
            if (node["message"]) rhs.message = node["message"].as<std::string>();
            if (node["timestamp"]) rhs.timestamp = node["timestamp"].as<uint64_t>();
            if (node["tag"]) rhs.tagName = node["tag"].as<std::string>();
            return true;
        }
    };
}

namespace Omega::Core::Preset {

PresetRepository::PresetRepository(const std::filesystem::path& rootPath)
    : mRootPath(rootPath) {}

PresetRepository::~PresetRepository() {}
 
std::vector<std::string> PresetRepository::listPresets() const {
    DBG("[REPO] Listing presets from: " << mRootPath.string());
    std::vector<std::string> presets;
    if (!std::filesystem::exists(mRootPath)) {
        DBG("[REPO] ERROR: Root path does not exist!");
        return presets;
    }

    for (const auto& entry : std::filesystem::recursive_directory_iterator(mRootPath)) {
        if (entry.is_regular_file()) {
            auto path = entry.path();
            if (path.extension() == ".yaml") {
                auto relative = std::filesystem::relative(path, mRootPath);
                std::string filename = relative.string();
                
                if (filename.find(".history") == std::string::npos && 
                    filename.find(".snapshots") == std::string::npos) {
                    DBG("[REPO] Found preset: " << filename);
                    presets.push_back(filename);
                }
            }
        }
    }
    DBG("[REPO] Total presets found: " << (int)presets.size());
    return presets;
}

std::string PresetRepository::saveSnapshot(const OmegaPreset& preset, 
                                          const std::string& author,
                                          const std::string& message) {
    if (preset.id.empty()) return "";

    std::string currentHash = preset.calculateHash();
    PresetHistory history;
    loadHistory(preset.id, history);

    // Don't save if it's the same as the current branch head
    std::string headHash = history.getHashForBranch(history.currentBranch);
    if (currentHash == headHash) return currentHash;

    // Create a new version
    PresetVersion v;
    v.hash = currentHash;
    v.parentHash = headHash;
    v.author = author;
    v.message = message;
    v.timestamp = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());

    // Add to history
    history.snapshots.push_back(v);
    history.branches[history.currentBranch] = currentHash;

    // Save snapshot file
    auto snapshotPath = getSnapshotPath(preset.id, currentHash);
    std::filesystem::create_directories(snapshotPath.parent_path());
    
    std::ofstream fout(snapshotPath);
    fout << preset.toYaml();
    fout.close();

    // Update history file
    saveHistory(history);

    return currentHash;
}

bool PresetRepository::checkout(const std::string& presetId, 
                               const std::string& hash, 
                               OmegaPreset& outPreset) const {
    auto snapshotPath = getSnapshotPath(presetId, hash);
    if (!std::filesystem::exists(snapshotPath)) return false;

    std::ifstream fin(snapshotPath);
    std::stringstream buffer;
    buffer << fin.rdbuf();
    return OmegaPreset::fromYaml(buffer.str(), outPreset);
}

bool PresetRepository::createBranch(const std::string& presetId, 
                                   const std::string& branchName, 
                                   const std::string& fromHash) {
    PresetHistory history;
    if (!loadHistory(presetId, history)) return false;

    std::string targetHash = fromHash;
    if (targetHash.empty()) {
        targetHash = history.getHashForBranch(history.currentBranch);
    }

    if (targetHash.empty()) return false; // Fail if no history yet

    history.branches[branchName] = targetHash;
    history.currentBranch = branchName;
    return saveHistory(history);
}

PresetHistory PresetRepository::getHistory(const std::string& presetId) const {
    PresetHistory history;
    loadHistory(presetId, history);
    return history;
}

std::filesystem::path PresetRepository::getHistoryPath(const std::string& presetId) const {
    return mRootPath / (presetId + ".history.yaml");
}

std::filesystem::path PresetRepository::getSnapshotPath(const std::string& presetId, const std::string& hash) const {
    return mRootPath / (presetId + ".snapshots") / (hash + ".yaml");
}

bool PresetRepository::loadHistory(const std::string& presetId, PresetHistory& outHistory) const {
    auto path = getHistoryPath(presetId);
    if (!std::filesystem::exists(path)) {
        outHistory.presetId = presetId;
        outHistory.currentBranch = "main";
        return false;
    }

    try {
        YAML::Node root = YAML::LoadFile(path.string());
        outHistory.presetId = presetId;
        if (root["currentBranch"]) outHistory.currentBranch = root["currentBranch"].as<std::string>();
        if (root["branches"]) outHistory.branches = root["branches"].as<std::map<std::string, std::string>>();
        if (root["snapshots"]) outHistory.snapshots = root["snapshots"].as<std::vector<PresetVersion>>();
        return true;
    } catch (...) {
        return false;
    }
}

bool PresetRepository::saveHistory(const PresetHistory& history) const {
    auto path = getHistoryPath(history.presetId);
    YAML::Emitter out;
    out << YAML::BeginMap;
    out << YAML::Key << "currentBranch" << YAML::Value << history.currentBranch;
    out << YAML::Key << "branches" << YAML::Value << history.branches;
    out << YAML::Key << "snapshots" << YAML::BeginSeq;
    for (const auto& v : history.snapshots) {
        out << YAML::Node(v);
    }
    out << YAML::EndSeq;
    out << YAML::EndMap;

    std::ofstream fout(path);
    fout << out.c_str();
    return true;
}

} // namespace Omega::Core::Preset
