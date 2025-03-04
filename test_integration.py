import unittest
from flask import current_app
from app import create_app, db
from app.models import User, Appointment, Message
from datetime import datetime, timedelta

class IntegrationTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()
        self.create_test_data()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def create_test_data(self):
        # Create test users
        self.doctor = User(
            email='doctor@example.com',
            name='Dr. Smith',
            role='doctor'
        )
        self.doctor.set_password('password123')

        self.patient = User(
            email='patient@example.com',
            name='John Doe',
            role='patient'
        )
        self.patient.set_password('password123')

        db.session.add_all([self.doctor, self.patient])
        db.session.commit()

    def test_appointment_workflow(self):
        # Login as patient
        response = self.client.post('/api/auth/login', json={
            'email': 'patient@example.com',
            'password': 'password123'
        })
        token = response.json['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        # Book appointment
        appointment_data = {
            'doctor_id': self.doctor.id,
            'date': (datetime.utcnow() + timedelta(days=1)).isoformat(),
            'time': '14:00',
            'type': 'consultation',
            'notes': 'Test appointment'
        }
        response = self.client.post('/api/appointments', 
                                  json=appointment_data,
                                  headers=headers)
        self.assertEqual(response.status_code, 201)
        appointment_id = response.json['id']

        # Check appointment details
        response = self.client.get(f'/api/appointments/{appointment_id}',
                                 headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'pending')

        # Login as doctor
        response = self.client.post('/api/auth/login', json={
            'email': 'doctor@example.com',
            'password': 'password123'
        })
        doctor_token = response.json['access_token']
        doctor_headers = {'Authorization': f'Bearer {doctor_token}'}

        # Confirm appointment
        response = self.client.put(f'/api/appointments/{appointment_id}/confirm',
                                 headers=doctor_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'confirmed')

    def test_messaging_system(self):
        # Login users
        patient_token = self.get_auth_token('patient@example.com', 'password123')
        doctor_token = self.get_auth_token('doctor@example.com', 'password123')

        # Patient sends message
        message_data = {
            'recipient_id': self.doctor.id,
            'content': 'Test message from patient'
        }
        response = self.client.post('/api/messages',
                                  json=message_data,
                                  headers={'Authorization': f'Bearer {patient_token}'})
        self.assertEqual(response.status_code, 201)
        message_id = response.json['id']

        # Doctor reads message
        response = self.client.get(f'/api/messages/{message_id}',
                                 headers={'Authorization': f'Bearer {doctor_token}'})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['read'])

    def get_auth_token(self, email, password):
        response = self.client.post('/api/auth/login', json={
            'email': email,
            'password': password
        })
        return response.json['access_token'] 