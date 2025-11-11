"""
Camelot Wheel Notation Conversion

The Camelot Wheel is a tool used by DJs for harmonic mixing. It simplifies
key relationships by mapping musical keys to a 12-position wheel with
inner (minor) and outer (major) tracks.

Harmonic mixing rules:
    - Same number: Perfect match (relative major/minor)
    - Adjacent numbers: Compatible (±1 on wheel)
    - Same letter different number: Energy shift

References:
    - https://www.mixedinkey.com/harmonic-mixing-guide/
    - https://en.wikipedia.org/wiki/Camelot_Wheel
"""


def key_to_camelot(key):
    """
    Convert musical key notation to Camelot wheel notation.

    The Camelot system maps the 12 major and 12 minor keys to a wheel
    numbered 1-12, with 'A' for minor keys and 'B' for major keys.

    Args:
        key: Musical key in standard notation (string)
             Examples: "C", "Am", "F#", "Bbm", "C#", "D#m"

    Returns:
        Camelot notation string (e.g., "8A", "11B") or original key if not found

    Examples:
        >>> key_to_camelot("C")
        "8B"
        >>> key_to_camelot("Am")
        "8A"
        >>> key_to_camelot("F#m")
        "11A"
        >>> key_to_camelot("Db")
        "3B"

    Camelot Wheel Layout:
        Major Keys (B):           Minor Keys (A):
        1B = B                    1A = G#m/Abm
        2B = F#/Gb                2A = D#m/Ebm
        3B = Db/C#                3A = Bbm/A#m
        4B = Ab/G#                4A = Fm
        5B = Eb/D#                5A = Cm
        6B = Bb/A#                6A = Gm
        7B = F                    7A = Dm
        8B = C                    8A = Am
        9B = G                    9A = Em
        10B = D                   10A = Bm
        11B = A                   11A = F#m/Gbm
        12B = E                   12A = C#m/Dbm

    Notes:
        - Enharmonic equivalents (e.g., C# and Db) map to same Camelot key
        - Returns original key string if not found in map (graceful fallback)
        - Case-sensitive: expects standard notation (capital letter + optional accidental + optional 'm')
    """
    camelot_map = {
        # Major keys (B - outer wheel)
        'C': '8B', 'Db': '3B', 'C#': '3B', 'D': '10B', 'Eb': '5B', 'D#': '5B',
        'E': '12B', 'F': '7B', 'Gb': '2B', 'F#': '2B', 'G': '9B',
        'Ab': '4B', 'G#': '4B', 'A': '11B', 'Bb': '6B', 'A#': '6B', 'B': '1B',

        # Minor keys (A - inner wheel)
        'Cm': '5A', 'Dbm': '12A', 'C#m': '12A', 'Dm': '7A', 'Ebm': '2A', 'D#m': '2A',
        'Em': '9A', 'Fm': '4A', 'Gbm': '11A', 'F#m': '11A', 'Gm': '6A',
        'Abm': '1A', 'G#m': '1A', 'Am': '8A', 'Bbm': '3A', 'A#m': '3A', 'Bm': '10A',
    }
    return camelot_map.get(key, key)
