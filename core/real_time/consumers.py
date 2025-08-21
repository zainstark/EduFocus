import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from asgiref.sync import sync_to_async
from session.models import Session
from performance.models import Performance
from classrooms.models import Enrollment

logger = logging.getLogger(__name__)
User = get_user_model()

class SessionConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = None
        self.session_group_name = None
        self.user = None
        self.user_role = None

    async def connect(self):
        try:
            self.session_id = self.scope['url_route']['kwargs']['session_id']
            self.session_group_name = f'session_{self.session_id}'
            logger.info(f'Connecting to session {self.session_id}')
            
            # Extract token from query parameters
            query_string = self.scope.get('query_string', b'').decode()
            token = None
            for param in query_string.split('&'):
                if param.startswith('token='):
                    token = param.split('=')[1]
                    break
            
            logger.info(f'Token: {token}')
            if not token:
                await self.close(code=4001)  # Custom code for missing token
                return
                
            # Authenticate user
            self.user = await self.authenticate_user(token)
            logger.info(f'User: {self.user}')
            if not self.user:
                await self.close(code=4002)  # Custom code for invalid token
                return
                
            # Check session access
            has_access = await self.check_session_access()
            if not has_access:
                await self.close(code=4003)  # Custom code for access denied
                return
                
            # Join session group
            await self.channel_layer.group_add(
                self.session_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'WebSocket connection established successfully',
                'session_id': self.session_id,
                'user_id': self.user.id,
                'user_role': self.user.role
            }))
            
            # Notify group about user joining (only for students)
            if self.user.role == 'student':
                await self.update_attendance(True)
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'user_joined',
                        'user_id': self.user.id,
                        'user_name': self.user.full_name,
                        'timestamp': await sync_to_async(self.get_current_time)()
                    }
                )
                
            logger.info(f"User {self.user.id} connected to session {self.session_id}")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connection: {str(e)}")
            await self.close(code=4000)  # Generic error code

    async def disconnect(self, close_code):
        try:
            # Leave session group
            if self.session_group_name:
                await self.channel_layer.group_discard(
                    self.session_group_name,
                    self.channel_name
                )
            
            # Notify group about user leaving (only for students)
            if self.user and self.user.role == 'student':
                await self.update_attendance(False)
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user.id,
                        'user_name': self.user.full_name,
                        'timestamp': await sync_to_async(self.get_current_time)()
                    }
                )
                
            logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from session {self.session_id}")
            
        except Exception as e:
            logger.error(f"Error in WebSocket disconnection: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'focus_update':
                await self.handle_focus_update(data)
                
            elif message_type == 'timer_update':
                await self.handle_timer_update(data)
                
            elif message_type == 'session_control':
                await self.handle_session_control(data)
                
            elif message_type == 'chat_message':
                await self.handle_chat_message(data)
                
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Error processing message'
            }))

    async def handle_focus_update(self, data):
        """Handle focus score updates from students"""
        if self.user.role != 'student':
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Only students can submit focus scores'
            }))
            return
            
        focus_score = data.get('focus_score')
        if focus_score is None or not isinstance(focus_score, (int, float)):
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid focus score'
            }))
            return
            
        # Update the focus score in the database
        success = await self.update_focus_score(focus_score)
        if not success:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to update focus score'
            }))
            return
            
        # Broadcast focus update to teacher
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'focus_update',
                'user_id': self.user.id,
                'user_name': self.user.full_name,
                'focus_score': focus_score,
                'timestamp': await sync_to_async(self.get_current_time)()
            }
        )
        
        await self.send(text_data=json.dumps({
            'type': 'focus_update_ack',
            'message': 'Focus score updated successfully'
        }))

    async def handle_timer_update(self, data):
        """Handle timer updates from teacher"""
        if self.user.role != 'instructor':
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Only instructors can update timer'
            }))
            return
            
        elapsed_time = data.get('elapsed_time')
        if elapsed_time is None or not isinstance(elapsed_time, (int, float)):
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid elapsed time'
            }))
            return
            
        # Broadcast timer to all participants
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'timer_update',
                'elapsed_time': elapsed_time,
                'sent_by': self.user.id,
                'timestamp': await sync_to_async(self.get_current_time)()
            }
        )

    async def handle_session_control(self, data):
        """Handle session control commands from teacher"""
        if self.user.role != 'instructor':
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Only instructors can control sessions'
            }))
            return
            
        control_type = data.get('control_type')
        if control_type not in ['start', 'pause', 'resume', 'end']:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid control type'
            }))
            return
            
        # Handle session end
        if control_type == 'end':
            success = await self.end_session()
            if not success:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Failed to end session'
                }))
                return
                
        # Broadcast control command to all participants
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'session_control',
                'control_type': control_type,
                'sent_by': self.user.id,
                'timestamp': await sync_to_async(self.get_current_time)()
            }
        )

    async def handle_chat_message(self, data):
        """Handle chat messages from participants"""
        message = data.get('message')
        if not message or not isinstance(message, str):
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid chat message'
            }))
            return
            
        # Broadcast chat message to all participants
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'chat_message',
                'user_id': self.user.id,
                'user_name': self.user.full_name,
                'user_role': self.user.role,
                'message': message,
                'timestamp': await sync_to_async(self.get_current_time)()
            }
        )

    # Handler methods for different message types
    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))

    async def focus_update(self, event):
        # Only send to instructor
        if self.user.role == 'instructor':
            await self.send(text_data=json.dumps({
                'type': 'focus_update',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'focus_score': event['focus_score'],
                'timestamp': event['timestamp']
            }))

    async def timer_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'timer_update',
            'elapsed_time': event['elapsed_time'],
            'sent_by': event['sent_by'],
            'timestamp': event['timestamp']
        }))

    async def session_control(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session_control',
            'control_type': event['control_type'],
            'sent_by': event['sent_by'],
            'timestamp': event['timestamp']
        }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_role': event['user_role'],
            'message': event['message'],
            'timestamp': event['timestamp']
        }))

    # Database operations
    @database_sync_to_async
    def authenticate_user(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def check_session_access(self):
        logger.info(f'Checking access for user {self.user.id} in session {self.session_id}')
        try:
            session = Session.objects.get(id=self.session_id)
            if self.user.role == 'instructor':
                has_access = session.classroom.instructor == self.user
                logger.info(f'Instructor access: {has_access}\r\n')
                return has_access
            else:
                has_access = Enrollment.objects.filter(
                    classroom=session.classroom, 
                    student=self.user
                ).exists()
                logger.info(f'Student access: {has_access}\r\n')
                return has_access
        except Session.DoesNotExist:
            logger.error(f'Session {self.session_id} does not exist')
            return False

    @database_sync_to_async
    def update_attendance(self, attended):
        try:
            session = Session.objects.get(id=self.session_id)
            performance, created = Performance.objects.get_or_create(
                session=session,
                student=self.user,
                defaults={'attended': attended}
            )
            if not created:
                performance.attended = attended
                performance.save()
            return True
        except Exception:
            return False

    @database_sync_to_async
    def update_focus_score(self, focus_score):
        try:
            session = Session.objects.get(id=self.session_id)
            performance, created = Performance.objects.get_or_create(
                session=session,
                student=self.user,
                defaults={'focus_score': focus_score, 'attended': True}
            )
            if not created:
                performance.focus_score = focus_score
                performance.save()
            return True
        except Exception:
            return False

    @database_sync_to_async
    def end_session(self):
        try:
            session = Session.objects.get(id=self.session_id)
            session.is_active = False
            session.save()
            return True
        except Exception:
            return False

    @database_sync_to_async
    def get_current_time(self):
        from django.utils import timezone
        return timezone.now().isoformat()