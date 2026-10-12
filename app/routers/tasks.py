from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.task_manager import task_manager

router = APIRouter(prefix="/api/tasks", tags=["Asynchronous Tasks"])

@router.get("/{task_id}", summary="Get Status of Verification Task")
async def get_task_status(task_id: str):
    """
    Polls the current status, agent thoughts, or final result of a background verification task.
    """
    if task_id not in task_manager.tasks:
        raise HTTPException(status_code=404, detail="Task ID not found.")
    return task_manager.tasks[task_id]

@router.get("", summary="List Recent Verification Tasks")
async def list_recent_tasks(limit: int = 20):
    """
    Retrieves the history of recent verification jobs.
    """
    tasks_list = list(task_manager.tasks.values())
    return tasks_list[-limit:]
