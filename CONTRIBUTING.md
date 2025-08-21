# Contributing to EduFocus

Thank you for your interest in contributing to EduFocus! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/EduFocus.git
   cd EduFocus
   ```
3. **Set up the development environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd core
   python manage.py migrate
   python manage.py createsuperuser
   ```

## 🔧 Development Setup

### Prerequisites
- Python 3.8+
- Redis (for real-time features and Celery)
- Git

### Running the Development Server
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Django development server
python manage.py runserver

# Terminal 3: Start Celery worker
celery -A core worker -l info
```

## 📝 Code Style

### Python
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guidelines
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions small and focused

### Django
- Follow Django best practices
- Use Django's built-in features when possible
- Write tests for new features
- Use Django's ORM efficiently

### Git Commit Messages
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 50 characters
- Add more details in the body if needed

Example:
```
Add user authentication endpoints

- Implement JWT token authentication
- Add login, logout, and refresh endpoints
- Include comprehensive test coverage
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
python manage.py test

# Run tests for a specific app
python manage.py test users

# Run tests with coverage
coverage run --source='.' manage.py test
coverage report
```

### Writing Tests
- Write tests for all new features
- Test both success and failure cases
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

Example:
```python
def test_user_can_login_with_valid_credentials(self):
    # Arrange
    user = User.objects.create_user(
        username='testuser',
        password='testpass123'
    )
    
    # Act
    response = self.client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'testpass123'
    })
    
    # Assert
    self.assertEqual(response.status_code, 200)
    self.assertIn('access', response.data)
```

## 🔄 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit them:
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** on GitHub with:
   - Clear description of the changes
   - Reference to any related issues
   - Screenshots (if UI changes)
   - Test results

5. **Wait for review** and address any feedback

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, etc.)
- Error messages or logs

## 💡 Feature Requests

When suggesting features:
- Describe the problem you're trying to solve
- Explain how the feature would help
- Provide examples or mockups if applicable
- Consider implementation complexity

## 📚 Documentation

- Update README.md if needed
- Add docstrings to new functions
- Update API documentation
- Include examples for new features

## 🔒 Security

- Don't commit sensitive information (API keys, passwords, etc.)
- Use environment variables for configuration
- Report security issues privately to maintainers
- Follow security best practices

## 🎯 Areas for Contribution

- **Bug fixes**: Check the issues page for known bugs
- **Documentation**: Improve README, docstrings, or API docs
- **Tests**: Add test coverage for existing features
- **Performance**: Optimize slow queries or operations
- **UI/UX**: Improve user interface and experience
- **New features**: Implement requested features

## 📞 Getting Help

- Check existing issues and discussions
- Join our community chat (if available)
- Contact maintainers for guidance
- Use GitHub Discussions for questions

## 🙏 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- GitHub contributors page

Thank you for contributing to EduFocus! 🎉
