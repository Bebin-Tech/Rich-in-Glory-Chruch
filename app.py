"""Vercel WSGI entry point; local development uses backend.app:create_app."""
from backend.app import create_app

app = create_app()
