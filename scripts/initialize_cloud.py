"""Explicit, build-time initialization for a new hosted church database.

Enable once with INITIALIZE_CHURCH_DATABASE=1. Never run in request handlers.
"""
import os
from pathlib import Path
from flask_migrate import upgrade
from sqlalchemy import text
from backend.app import create_app, db, User, Audit


def initialize():
    if os.getenv('INITIALIZE_CHURCH_DATABASE') != '1':
        return
    email = os.environ.get('INITIAL_ADMIN_EMAIL', '').strip().lower()
    password_hash = os.environ.get('INITIAL_ADMIN_PASSWORD_HASH', '')
    if not email or not password_hash.startswith('scrypt:32768:8:1$') or len(password_hash) > 255:
        raise RuntimeError('Provide the initial administrator email and scrypt hash securely.')
    app = create_app()
    with app.app_context():
        with db.engine.connect() as lock:
            if lock.execute(text("SELECT GET_LOCK('rich_in_glory_migrations', 60)")).scalar() != 1:
                raise RuntimeError('Another database initialization is running.')
            try:
                upgrade(directory=str(Path(__file__).resolve().parents[1] / 'backend/migrations'))
                user = User.query.filter_by(email=email).first()
                if not user:
                    user = User(email=email, password_hash=password_hash, role='admin')
                    db.session.add(user)
                    db.session.flush()
                    db.session.add(Audit(user_id=user.id, action='deployment.initialize', target=str(user.id)))
                    db.session.commit()
                elif user.role != 'admin':
                    raise RuntimeError('Initial administrator email belongs to a non-admin account.')
            finally:
                lock.execute(text("SELECT RELEASE_LOCK('rich_in_glory_migrations')"))
    # Import only the previously verified, public church information and photos.
    import scripts.import_church_listing
    print('Hosted church schema, administrator, and verified public content initialized.')


if __name__ == '__main__':
    initialize()
