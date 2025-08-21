from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="edufocus",
    version="1.0.0",
    author="EduFocus Team",
    author_email="contact@edufocus.com",
    description="A comprehensive Django-based educational management system",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/EduFocus",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Education",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Framework :: Django",
        "Framework :: Django :: 5.2",
        "Topic :: Education",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "coverage>=6.0",
            "pytest>=7.0",
            "pytest-django>=4.5",
            "black>=22.0",
            "flake8>=5.0",
            "isort>=5.0",
        ],
    },
    include_package_data=True,
    zip_safe=False,
    keywords="education, django, real-time, analytics, classroom-management",
    project_urls={
        "Bug Reports": "https://github.com/yourusername/EduFocus/issues",
        "Source": "https://github.com/yourusername/EduFocus",
        "Documentation": "https://github.com/yourusername/EduFocus#readme",
    },
)
