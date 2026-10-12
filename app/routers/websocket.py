from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.task_manager import task_manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time user notifications and streaming agent thoughts.
    """
    await task_manager.register_websocket(websocket)
    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        task_manager.unregister_websocket(websocket)
    except Exception:
        task_manager.unregister_websocket(websocket)
