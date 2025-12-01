
// Helper to fix double-encoded strings (Mojibake)
// e.g. Fixes "GÃ³mez" -> "Gómez" which occurs when UTF-8 is interpreted as Latin-1
export const repairMojibake = (str: string): string => {
    if (!str) return str;
    try {
        // If string contains characters that look like Latin-1 representation of UTF-8 bytes
        // We attempt to convert them back to bytes and decode as UTF-8.
        // We check if all chars are within single byte range to avoid breaking proper Unicode
        let isLatin1 = true;
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code > 255) {
                isLatin1 = false;
                break;
            }
            bytes[i] = code;
        }

        if (isLatin1) {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            return decoder.decode(bytes);
        }
    } catch (e) {
        // If decoding fails or is not applicable, return original string
    }
    return str;
};
