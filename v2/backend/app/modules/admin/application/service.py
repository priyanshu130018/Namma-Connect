"""Admin application service."""

from typing import Dict, Any, List
from fastapi import HTTPException, status
from app.modules.admin.infrastructure.repository import AdminRepository
from app.modules.admin.presentation.schemas import PlatformSettingRequest
from app.modules.admin.domain.models import PlatformSetting
from app.modules.user.domain.models import User


class AdminService:
    def __init__(self, repo: AdminRepository):
        self.repo = repo

    def get_overview_stats(self, admin: User) -> Dict[str, Any]:
        if admin.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")
        return self.repo.get_platform_overview_stats()

    def get_settings(self, admin: User) -> List[Dict[str, Any]]:
        if admin.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")
        settings = self.repo.list_platform_settings()
        return [self._serialize_setting(s) for s in settings]

    def set_setting(self, admin: User, payload: PlatformSettingRequest) -> Dict[str, Any]:
        if admin.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")

        setting = self.repo.get_platform_setting(payload.key)
        if not setting:
            setting = PlatformSetting(
                key=payload.key,
                value=payload.value_json,
                description=payload.description,
            )
        else:
            setting.value = payload.value_json
            if payload.description:
                setting.description = payload.description

        saved = self.repo.save_platform_setting(setting)
        return self._serialize_setting(saved)

    def _serialize_setting(self, s: PlatformSetting) -> Dict[str, Any]:
        return {
            "id": str(s.id),
            "key": s.key,
            "value_json": s.value,
            "description": s.description,
            "created_at": s.created_at.isoformat() if s.created_at else "",
            "updated_at": s.updated_at.isoformat() if s.updated_at else "",
        }
