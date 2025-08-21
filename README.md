# EduFocus

A comprehensive Django-based educational management system with real-time features, performance tracking, and analytics.

## 🚀 Features

- **User Management**: Custom user model with role-based authentication
- **Classroom Management**: Create and manage virtual classrooms
- **Real-time Communication**: WebSocket-based real-time messaging and notifications
- **Performance Tracking**: Monitor student and teacher performance metrics
- **Session Management**: Track and manage educational sessions
- **Reporting & Analytics**: Generate comprehensive reports and charts
- **RESTful API**: Full-featured API with JWT authentication
- **Background Tasks**: Celery integration for asynchronous processing

## 🏗️ Architecture

- **Backend**: Django 5.2.5 with Django REST Framework
- **Real-time**: Django Channels with Redis
- **Authentication**: JWT tokens with refresh mechanism
- **Task Queue**: Celery with Redis broker
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **Charts**: Matplotlib for data visualization

## 📋 Prerequisites

- Python 3.8+
- pip
- Redis (for real-time features and Celery)
- Virtual environment (recommended)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/EduFocus.git
   cd EduFocus
   ```

2. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Navigate to the Django project**:
   ```bash
   cd core
   ```

5. **Set up environment variables** (create a `.env` file):
   ```bash
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   DATABASE_URL=sqlite:///db.sqlite3
   REDIS_URL=redis://localhost:6379/0
   ```

6. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

7. **Create a superuser**:
   ```bash
   python manage.py createsuperuser
   ```

8. **Start Redis** (required for real-time features):
   ```bash
   # On Windows (if using WSL or Docker)
   # On macOS
   brew install redis && redis-server
   # On Linux
   sudo systemctl start redis
   ```

9. **Run the development server**:
   ```bash
   python manage.py runserver
   ```

10. **Start Celery worker** (in a separate terminal):
    ```bash
    celery -A core worker -l info
    ```

The application will be available at `http://127.0.0.1:8000/`.

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `POST /api/auth/logout/` - User logout

### User Management
- `GET /api/users/` - List users
- `POST /api/users/` - Create user
- `GET /api/users/{id}/` - Get user details
- `PUT /api/users/{id}/` - Update user

### Classroom Management
- `GET /api/classrooms/` - List classrooms
- `POST /api/classrooms/` - Create classroom
- `GET /api/classrooms/{id}/` - Get classroom details

### Performance Tracking
- `GET /api/performance/` - Get performance metrics
- `POST /api/performance/` - Record performance data

### Reports
- `GET /api/reports/` - Generate reports
- `GET /api/reports/analytics/` - Get analytics data

## 🔧 Configuration

### Environment Variables
- `SECRET_KEY`: Django secret key
- `DEBUG`: Debug mode (True/False)
- `DATABASE_URL`: Database connection string
- `REDIS_URL`: Redis connection string
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts

### Celery Configuration
The project uses Celery for background tasks. Make sure Redis is running and configure the broker URL in settings.

### Channels Configuration
Real-time features use Django Channels with Redis as the channel layer backend.

## 🧪 Testing

Run the test suite:
```bash
python manage.py test
```

## 📦 Project Structure

```
EduFocus/
├── core/                    # Django project root
│   ├── core/               # Main Django settings
│   ├── users/              # User management app
│   ├── classrooms/         # Classroom management app
│   ├── session/            # Session tracking app
│   ├── performance/        # Performance metrics app
│   ├── reports/            # Reporting and analytics app
│   ├── notifications/      # Notification system app
│   ├── real_time/          # WebSocket consumers
│   └── manage.py           # Django management script
├── requirements.txt         # Python dependencies
├── README.md               # This file
└── .gitignore              # Git ignore rules
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/yourusername/EduFocus/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🔮 Roadmap

- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Video conferencing integration
- [ ] AI-powered insights
- [ ] Advanced reporting features
