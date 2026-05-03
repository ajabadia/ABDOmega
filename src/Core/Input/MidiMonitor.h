#pragma once
#include <juce_audio_basics/juce_audio_basics.h>
#include <array>
#include <atomic>
#include <mutex>
#include <vector>

/** [BUILD_FORCE_15] Aseptic MIDI Monitor for OMEGA Era 7. **/
namespace Omega {
namespace Core {
namespace Input {

    /**
     * @brief Información básica de un evento MIDI para visualización en la UI.
     */
    struct MidiEventInfo {
        uint8_t type;
        uint8_t channel;
        uint8_t data1;
        uint8_t data2;
        double timestamp;
    };

    /**
     * @brief Monitor de eventos MIDI thread-safe.
     * Almacena los últimos eventos MIDI para que la UI los consulte.
     */
    class MidiMonitor {
    public:
        static constexpr int kMaxEvents = 32;

        static MidiMonitor& getInstance() {
            static MidiMonitor instance;
            return instance;
        }

        /**
         * @brief Registra un nuevo mensaje MIDI. Llamado desde el Audio Thread.
         */
        void pushEvent(const juce::MidiMessage& msg) {
            std::lock_guard<std::mutex> lock(mMutex);
            int pos = (int)(mWritePos % kMaxEvents);
            
            MidiEventInfo info;
            const uint8_t* rawData = msg.getRawData();
            int size = msg.getRawDataSize();
            
            info.type = (size > 0) ? rawData[0] : 0;
            info.channel = (uint8_t)msg.getChannel();
            info.data1 = (size > 1) ? rawData[1] : 0;
            info.data2 = (size > 2) ? rawData[2] : 0;
            info.timestamp = msg.getTimeStamp();
            
            mEvents[pos] = info;
            mWritePos++;
        }

        /**
         * @brief Obtiene una copia de los eventos más recientes. Llamado desde el UI/Message Thread.
         */
        std::vector<MidiEventInfo> getRecentEvents(int maxToReturn) {
            std::lock_guard<std::mutex> lock(mMutex);
            std::vector<MidiEventInfo> result;
            
            uint64_t totalAvailable = mWritePos.load();
            if (totalAvailable > kMaxEvents) totalAvailable = kMaxEvents;
            
            int count = (maxToReturn < (int)totalAvailable) ? maxToReturn : (int)totalAvailable;
            
            for (int i = 0; i < count; ++i) {
                // Leer de más reciente a más antiguo
                int pos = (int)((mWritePos - 1 - i) % kMaxEvents);
                if (pos < 0) pos += kMaxEvents;
                result.push_back(mEvents[pos]);
            }
            
            return result;
        }

        /**
         * @brief Limpia el buffer (útil en reset o preparación).
         */
        void clear() {
            std::lock_guard<std::mutex> lock(mMutex);
            mWritePos = 0;
        }

    private:
        MidiMonitor() : mWritePos(0) {
            mEvents.fill({0,0,0,0,0.0});
        }
        
        std::array<MidiEventInfo, kMaxEvents> mEvents;
        std::atomic<uint64_t> mWritePos;
        std::mutex mMutex;
    };

} // namespace Input
} // namespace Core
} // namespace Omega
