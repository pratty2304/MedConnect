from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from config import Config

db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app)

    # Import models
    from app.models import User, Appointment, Report, Message

    # Register blueprints
    from app.auth import bp as auth_bp
    from app.users import bp as users_bp
    from app.appointments import bp as appointments_bp
    from app.messages import bp as messages_bp
    from app.reports import bp as reports_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not Found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal Server Error'}), 500

    # Create tables within application context
    with app.app_context():
        db.create_all()

    return app 