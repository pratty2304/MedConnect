from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from datetime import datetime, timedelta
import secrets
from app import db, jwt, bcrypt

def generate_csrf_token():
    """Generate a secure CSRF token"""
    return secrets.token_urlsafe(32)

def verify_csrf_token(token):
    """Verify the CSRF token"""
    stored_token = request.cookies.get('csrf_token')
    return secrets.compare_digest(str(stored_token), str(token))

def require_csrf(f):
    """Decorator to require CSRF token for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            token = request.headers.get('X-CSRF-TOKEN')
            if not token or not verify_csrf_token(token):
                return jsonify({'error': 'Invalid or missing CSRF token'}), 403
        return f(*args, **kwargs)
    return decorated_function

def require_role(*roles):
    """Decorator to require specific user roles"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') not in roles:
                return jsonify({'error': 'Unauthorized access'}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

class SecurityConfig:
    """Security configuration settings"""
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_REQUIRE_UPPER = True
    PASSWORD_REQUIRE_LOWER = True
    PASSWORD_REQUIRE_DIGIT = True
    PASSWORD_REQUIRE_SPECIAL = True
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    SESSION_TIMEOUT = timedelta(hours=1)
    
    @staticmethod
    def validate_password(password):
        """Validate password against security requirements"""
        if len(password) < SecurityConfig.PASSWORD_MIN_LENGTH:
            return False, "Password must be at least 8 characters long"
        
        if SecurityConfig.PASSWORD_REQUIRE_UPPER and not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
            
        if SecurityConfig.PASSWORD_REQUIRE_LOWER and not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
            
        if SecurityConfig.PASSWORD_REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            return False, "Password must contain at least one digit"
            
        if SecurityConfig.PASSWORD_REQUIRE_SPECIAL and not any(not c.isalnum() for c in password):
            return False, "Password must contain at least one special character"
            
        return True, None

class LoginAttemptTracker:
    """Track failed login attempts"""
    def __init__(self):
        self.attempts = {}
        
    def record_attempt(self, user_id, success):
        if success:
            self.attempts.pop(user_id, None)
            return True
            
        current_time = datetime.utcnow()
        user_attempts = self.attempts.get(user_id, {'count': 0, 'lockout_until': None})
        
        if user_attempts['lockout_until'] and current_time < user_attempts['lockout_until']:
            return False
            
        user_attempts['count'] = user_attempts.get('count', 0) + 1
        
        if user_attempts['count'] >= SecurityConfig.MAX_LOGIN_ATTEMPTS:
            user_attempts['lockout_until'] = current_time + SecurityConfig.LOCKOUT_DURATION
            
        self.attempts[user_id] = user_attempts
        return True
        
    def is_locked_out(self, user_id):
        user_attempts = self.attempts.get(user_id)
        if not user_attempts or not user_attempts.get('lockout_until'):
            return False
        return datetime.utcnow() < user_attempts['lockout_until']

login_tracker = LoginAttemptTracker() 