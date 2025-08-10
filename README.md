# EduFocus

This is a Django-based application for educational purposes.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Python 3.x
*   pip

### Installing

1.  Clone the repository:
    ```
    git clone https://github.com/zainstark/EduFocus.git
    ```
2.  Navigate to the `back` directory:
    ```
    cd EduFocus/back
    ```
3.  Install the required packages:
    ```
    pip install -r requirements.txt
    ```
4.  Apply the database migrations:
    ```
    python manage.py migrate
    ```
5.  Run the development server:
    ```
    python manage.py runserver
    ```

The application will be available at `http://127.0.0.1:8000/`.
