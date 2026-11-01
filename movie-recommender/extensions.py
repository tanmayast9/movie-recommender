"""
Flask extensions initialization.
Keeps extensions decoupled from the application factory.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
