"""
VeriStream: Real-Time Multimodal Fact Verification Engine
FastAPI Backend Application
"""
import sys
from pathlib import Path

# Ensure backend directory is in sys.path for direct or package execution
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

__version__ = "1.0.0"
