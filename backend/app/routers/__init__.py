from app.routers.verify import router as verify_router
from app.routers.tasks import router as tasks_router
from app.routers.benchmark import router as benchmark_router
from app.routers.websocket import router as websocket_router
from app.routers.mobile import router as mobile_router

__all__ = ["verify_router", "tasks_router", "benchmark_router", "websocket_router", "mobile_router"]
