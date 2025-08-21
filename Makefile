.PHONY: help install migrate run test clean docker-build docker-run docker-stop

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install Python dependencies
	pip install -r requirements.txt

migrate: ## Run database migrations
	cd core && python manage.py migrate

makemigrations: ## Create database migrations
	cd core && python manage.py makemigrations

run: ## Run the development server
	cd core && python manage.py runserver

run-celery: ## Run Celery worker
	cd core && celery -A core worker -l info

run-celery-beat: ## Run Celery beat scheduler
	cd core && celery -A core beat -l info

test: ## Run tests
	cd core && python manage.py test

test-coverage: ## Run tests with coverage
	cd core && coverage run --source='.' manage.py test && coverage report

lint: ## Run linting checks
	flake8 core/
	black --check core/
	isort --check-only core/

format: ## Format code with black and isort
	black core/
	isort core/

shell: ## Open Django shell
	cd core && python manage.py shell

superuser: ## Create a superuser
	cd core && python manage.py createsuperuser

collectstatic: ## Collect static files
	cd core && python manage.py collectstatic --noinput

clean: ## Clean up Python cache files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +

docker-build: ## Build Docker image
	docker build -t edufocus .

docker-run: ## Run with Docker Compose
	docker-compose up -d

docker-stop: ## Stop Docker Compose services
	docker-compose down

docker-logs: ## View Docker Compose logs
	docker-compose logs -f

docker-shell: ## Open shell in running container
	docker-compose exec web bash

setup-dev: ## Set up development environment
	python -m venv venv
	@echo "Virtual environment created. Activate it with:"
	@echo "  source venv/bin/activate  # On macOS/Linux"
	@echo "  venv\\Scripts\\activate     # On Windows"
	@echo "Then run: make install"

setup-docker: ## Set up Docker environment
	docker-compose up -d db redis
	@echo "Waiting for services to be ready..."
	sleep 10
	docker-compose up -d web celery celery-beat
	@echo "EduFocus is running at http://localhost:8000"

reset-db: ## Reset database (WARNING: This will delete all data)
	cd core && python manage.py flush --noinput
	cd core && python manage.py migrate

backup-db: ## Create database backup
	cd core && python manage.py dumpdata > backup_$(shell date +%Y%m%d_%H%M%S).json

load-backup: ## Load database backup (specify FILE=backup_file.json)
	cd core && python manage.py loaddata $(FILE)
