import unittest
from flask import current_app
from app import create_app, db
from app.models import User
from app.auth.security import SecurityConfig, generate_csrf_token
from config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite://'
    WTF_CSRF_ENABLED = False

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_password_validation(self):
        # Test password requirements
        valid, _ = SecurityConfig.validate_password("Test123!@#")
        self.assertTrue(valid)

        valid, message = SecurityConfig.validate_password("weak")
        self.assertFalse(valid)
        self.assertIn("at least 8 characters", message)

    def test_user_registration(self):
        # Test user registration
        response = self.client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'password': 'Test123!@#',
            'name': 'Test User',
            'role': 'patient'
        })
        self.assertEqual(response.status_code, 201)

    def test_login_attempts(self):
        # Create test user
        user = User(email='test@example.com', name='Test User', role='patient')
        user.set_password('Test123!@#')
        db.session.add(user)
        db.session.commit()

        # Test successful login
        response = self.client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'Test123!@#'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', response.json)

        # Test failed login attempts
        for _ in range(SecurityConfig.MAX_LOGIN_ATTEMPTS):
            response = self.client.post('/api/auth/login', json={
                'email': 'test@example.com',
                'password': 'wrong_password'
            })
            self.assertEqual(response.status_code, 401)

        # Test lockout
        response = self.client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'Test123!@#'
        })
        self.assertEqual(response.status_code, 403)
        self.assertIn('account is locked', response.json['error'])

    def test_csrf_protection(self):
        # Test CSRF token generation and validation
        token = generate_csrf_token()
        self.assertTrue(len(token) > 32)  # Ensure token is sufficiently long

        # Test protected route without CSRF token
        response = self.client.post('/api/protected-route')
        self.assertEqual(response.status_code, 403)

        # Test protected route with valid CSRF token
        response = self.client.post('/api/protected-route', 
                                  headers={'X-CSRF-TOKEN': token})
        self.assertEqual(response.status_code, 200) 