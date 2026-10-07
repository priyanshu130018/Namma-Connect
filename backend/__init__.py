"""Namma Connect Backend Package.

Ensures that the backend directory is in sys.path so that internal package
imports (e.g. `from app...`) resolve seamlessly whether invoked from within
`backend/` or from the repository root.
"""

import sys
from pathlib import Path

_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
