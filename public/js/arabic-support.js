/**
 * Arabic support for jsPDF
 * This file adds basic Arabic text support to jsPDF
 */

// Wait for jsPDF to be available
window.addEventListener('load', function() {
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF is not defined');
        return;
    }

    const jsPDF = window.jspdf.jsPDF;

    // Arabic character mappings
    const arabicSubstitutionA = {
        0x0621: [0xFE80], // HAMZA
        0x0622: [0xFE81, 0xFE82], // ALEF WITH MADDA ABOVE
        0x0623: [0xFE83, 0xFE84], // ALEF WITH HAMZA ABOVE
        0x0624: [0xFE85, 0xFE86], // WAW WITH HAMZA ABOVE
        0x0625: [0xFE87, 0xFE88], // ALEF WITH HAMZA BELOW
        0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // YEH WITH HAMZA ABOVE
        0x0627: [0xFE8D, 0xFE8E], // ALEF
        0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // BEH
        0x0629: [0xFE93, 0xFE94], // TEH MARBUTA
        0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], // TEH
        0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // THEH
        0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // JEEM
        0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // HAH
        0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // KHAH
        0x062F: [0xFEA9, 0xFEAA], // DAL
        0x0630: [0xFEAB, 0xFEAC], // THAL
        0x0631: [0xFEAD, 0xFEAE], // REH
        0x0632: [0xFEAF, 0xFEB0], // ZAIN
        0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // SEEN
        0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // SHEEN
        0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // SAD
        0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // DAD
        0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // TAH
        0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // ZAH
        0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // AIN
        0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], // GHAIN
        0x0640: [0x0640], // TATWEEL
        0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], // FEH
        0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], // QAF
        0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // KAF
        0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // LAM
        0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // MEEM
        0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // NOON
        0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // HEH
        0x0648: [0xFEED, 0xFEEE], // WAW
        0x0649: [0xFEEF, 0xFEF0], // ALEF MAKSURA
        0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // YEH
        0x0671: [0xFB50, 0xFB51], // ALEF WASLA
        0x0677: [0xFBDD], // U WITH HAMZA ABOVE
        0x0679: [0xFB66, 0xFB67, 0xFB68, 0xFB69], // TTEH
        0x067A: [0xFB5E, 0xFB5F, 0xFB60, 0xFB61], // TTEHEH
        0x067B: [0xFB52, 0xFB53, 0xFB54, 0xFB55], // BEEH
        0x067E: [0xFB56, 0xFB57, 0xFB58, 0xFB59], // PEH
        0x067F: [0xFB62, 0xFB63, 0xFB64, 0xFB65], // TEHEH
        0x0680: [0xFB5A, 0xFB5B, 0xFB5C, 0xFB5D], // BEHEH
        0x0683: [0xFB76, 0xFB77, 0xFB78, 0xFB79], // NYEH
        0x0684: [0xFB72, 0xFB73, 0xFB74, 0xFB75], // DYEH
        0x0686: [0xFB7A, 0xFB7B, 0xFB7C, 0xFB7D], // TCHEH
        0x0687: [0xFB7E, 0xFB7F, 0xFB80, 0xFB81], // TCHEHEH
        0x0688: [0xFB88, 0xFB89], // DDAL
        0x068C: [0xFB84, 0xFB85], // DAHAL
        0x068D: [0xFB82, 0xFB83], // DDAHAL
        0x068E: [0xFB86, 0xFB87], // DUL
        0x0691: [0xFB8C, 0xFB8D], // RREH
        0x0698: [0xFB8A, 0xFB8B], // JEH
        0x06A4: [0xFB6A, 0xFB6B, 0xFB6C, 0xFB6D], // VEH
        0x06A6: [0xFB6E, 0xFB6F, 0xFB70, 0xFB71], // PEHEH
        0x06A9: [0xFB8E, 0xFB8F, 0xFB90, 0xFB91], // KEHEH
        0x06AD: [0xFBD3, 0xFBD4, 0xFBD5, 0xFBD6], // NG
        0x06AF: [0xFB92, 0xFB93, 0xFB94, 0xFB95], // GAF
        0x06B1: [0xFB9A, 0xFB9B, 0xFB9C, 0xFB9D], // NGOEH
        0x06B3: [0xFB96, 0xFB97, 0xFB98, 0xFB99], // GUEH
        0x06BA: [0xFB9E, 0xFB9F], // NOON GHUNNA
        0x06BB: [0xFBA0, 0xFBA1, 0xFBA2, 0xFBA3], // RNOON
        0x06BE: [0xFBAA, 0xFBAB, 0xFBAC, 0xFBAD], // HEH DOACHASHMEE
        0x06C0: [0xFBA4, 0xFBA5], // HEH WITH YEH ABOVE
        0x06C1: [0xFBA6, 0xFBA7, 0xFBA8, 0xFBA9], // HEH GOAL
        0x06C5: [0xFBE0, 0xFBE1], // KIRGHIZ OE
        0x06C6: [0xFBD9, 0xFBDA], // OE
        0x06C7: [0xFBD7, 0xFBD8], // U
        0x06C8: [0xFBDB, 0xFBDC], // YU
        0x06C9: [0xFBE2, 0xFBE3], // KIRGHIZ YU
        0x06CB: [0xFBDE, 0xFBDF], // VE
        0x06CC: [0xFBFC, 0xFBFD, 0xFBFE, 0xFBFF], // FARSI YEH
        0x06D0: [0xFBE4, 0xFBE5, 0xFBE6, 0xFBE7], // E
        0x06D2: [0xFBAE, 0xFBAF], // YEH BARREE
        0x06D3: [0xFBB0, 0xFBB1] // YEH BARREE WITH HAMZA ABOVE
    };

    // Arabic diacritics
    const ARABIC_DIACRITICS = [
        0x064B, // FATHATAN
        0x064C, // DAMMATAN
        0x064D, // KASRATAN
        0x064E, // FATHA
        0x064F, // DAMMA
        0x0650, // KASRA
        0x0651, // SHADDA
        0x0652, // SUKUN
        0x0653, // MADDAH ABOVE
        0x0654, // HAMZA ABOVE
        0x0655, // HAMZA BELOW
        0x0656, // SUBSCRIPT ALEF
        0x0657, // INVERTED DAMMA
        0x0658, // MARK NOON GHUNNA
        0x0659, // ZWARAKAY
        0x065A, // VOWEL SIGN SMALL V ABOVE
        0x065B, // VOWEL SIGN INVERTED SMALL V ABOVE
        0x065C, // VOWEL SIGN DOT BELOW
        0x065D, // REVERSED DAMMA
        0x065E, // FATHA WITH TWO DOTS
        0x065F, // WAVY HAMZA BELOW
        0x0670, // SUPERSCRIPT ALEF
        0x06D6, // SMALL FATHA
        0x06D7, // SMALL DAMMA
        0x06D8, // SMALL KASRA
        0x06D9, // SMALL KASRA
        0x06DA, // SMALL WAW
        0x06DB, // SMALL YEH
        0x06DC, // SMALL SEEN
        0x06DF, // SMALL ROUNDED HIGH STOP WITH FILLED CENTRE
        0x06E0, // SMALL HIGH UPRIGHT RECTANGULAR ZERO
        0x06E1, // SMALL HIGH DOTLESS HEAD OF KHAH
        0x06E2, // SMALL HIGH MEEM ISOLATED FORM
        0x06E3, // SMALL LOW SEEN
        0x06E4, // SMALL HIGH MADDA
        0x06E7, // SMALL HIGH YEH
        0x06E8, // SMALL HIGH NOON
        0x06EA, // EMPTY CENTRE LOW STOP
        0x06EB, // EMPTY CENTRE HIGH STOP
        0x06EC, // ROUNDED HIGH STOP WITH FILLED CENTRE
        0x06ED // SMALL LOW MEEM
    ];

    // Function to check if a character is a diacritic
    function isDiacritic(char) {
        const code = char.charCodeAt(0);
        return ARABIC_DIACRITICS.indexOf(code) !== -1;
    }

    // Function to check if a character is Arabic
    function isArabicCharacter(char) {
        const code = char.charCodeAt(0);
        return code >= 0x0600 && code <= 0x06FF;
    }

    // Function to check if a character is a letter
    function isArabicLetter(char) {
        const code = char.charCodeAt(0);
        return isArabicCharacter(char) && !isDiacritic(char);
    }

    // Function to get the form of an Arabic letter
    function getForm(char, prevChar, nextChar) {
        if (!isArabicLetter(char)) return char;

        const code = char.charCodeAt(0);
        const forms = arabicSubstitutionA[code];

        if (!forms) return char;

        let prevCanConnect = prevChar && isArabicLetter(prevChar) && !isIsolatedArabicChar(prevChar);
        let nextCanConnect = nextChar && isArabicLetter(nextChar) && !isIsolatedArabicChar(nextChar);

        if (!prevCanConnect && !nextCanConnect) return String.fromCharCode(forms[0]); // Isolated
        if (!prevCanConnect && nextCanConnect) return String.fromCharCode(forms[1] || forms[0]); // Initial
        if (prevCanConnect && !nextCanConnect) return String.fromCharCode(forms[2] || forms[0]); // Final
        if (prevCanConnect && nextCanConnect) return String.fromCharCode(forms[3] || forms[0]); // Medial

        return char;
    }

    // Function to check if a character is isolated in Arabic
    function isIsolatedArabicChar(char) {
        const isolatedChars = [
            0x0621, // HAMZA
            0x0622, // ALEF WITH MADDA ABOVE
            0x0623, // ALEF WITH HAMZA ABOVE
            0x0624, // WAW WITH HAMZA ABOVE
            0x0625, // ALEF WITH HAMZA BELOW
            0x0627, // ALEF
            0x062F, // DAL
            0x0630, // THAL
            0x0631, // REH
            0x0632, // ZAIN
            0x0648, // WAW
            0x0649, // ALEF MAKSURA
            0x0671, // ALEF WASLA
            0x0677, // U WITH HAMZA ABOVE
            0x0688, // DDAL
            0x068C, // DAHAL
            0x068D, // DDAHAL
            0x068E, // DUL
            0x0691, // RREH
            0x0698, // JEH
            0x06BA, // NOON GHUNNA
            0x06C0, // HEH WITH YEH ABOVE
            0x06C5, // KIRGHIZ OE
            0x06C6, // OE
            0x06C7, // U
            0x06C8, // YU
            0x06C9, // KIRGHIZ YU
            0x06CB, // VE
            0x06D2, // YEH BARREE
            0x06D3  // YEH BARREE WITH HAMZA ABOVE
        ];

        const code = char.charCodeAt(0);
        return isolatedChars.indexOf(code) !== -1;
    }

    // Function to process Arabic text
    function processArabicText(text) {
        if (!text) return '';

        // Reverse the text for RTL
        const chars = text.split('');
        let result = '';

        // Process each character
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const prevChar = i > 0 ? chars[i - 1] : null;
            const nextChar = i < chars.length - 1 ? chars[i + 1] : null;

            if (isArabicLetter(char)) {
                result += getForm(char, prevChar, nextChar);
            } else {
                result += char;
            }
        }

        return result;
    }

    // Add Arabic text processing to jsPDF
    jsPDF.API.processArabicText = processArabicText;

    // Override the text function to handle Arabic text
    const originalText = jsPDF.API.text;
    jsPDF.API.text = function(text, x, y, options) {
        if (typeof text === 'string' && /[\u0600-\u06FF]/.test(text)) {
            // Process Arabic text
            const processedText = this.processArabicText(text);

            // Set options for RTL text
            options = options || {};
            if (!options.align) {
                options.align = 'right';
            }

            // Call the original text function with processed text
            return originalText.call(this, processedText, x, y, options);
        }

        // Call the original text function for non-Arabic text
        return originalText.apply(this, arguments);
    };

    // Add a simple helper function to the window object
    window.processArabicPdf = function(text) {
        if (!text) return '';
        if (!/[\u0600-\u06FF]/.test(text)) return text;

        // Simple Arabic text processing for PDF
        // Reverse the text for RTL display
        return text.split('').reverse().join('');
    };
});
