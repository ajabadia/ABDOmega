#include <cstddef>
#include <cstring>

/**
 * MSVC Workaround for missing vectorized STL symbols.
 * These symbols are expected by recent MSVC compilers but may be missing
 * from the linked CRT in some environments.
 */

extern "C" {

    // __std_regex_transform_primary_char fallback (DUMMY)
    size_t __cdecl __std_regex_transform_primary_char(char* dest, char* dest_end, const char* first, const char* last, const void* collvec) {
        (void)collvec;
        size_t len = (size_t)(last - first);
        if (dest && (size_t)(dest_end - dest) >= len) {
            std::memcpy(dest, first, len);
        }
        return len;
    }
}
