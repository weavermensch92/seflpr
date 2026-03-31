from fastapi import APIRouter
from app.api.v1 import auth, profiles, projects, admin, points

router = APIRouter()
router.include_router(auth.router)
router.include_router(profiles.router)
router.include_router(projects.router)
router.include_router(admin.router)
router.include_router(points.router)
