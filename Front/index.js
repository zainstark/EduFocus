// Authentication utilities
class AuthManager {
    static isAuthenticated() {
        return !!localStorage.getItem('access_token');
    }

    static getUserProfile() {
        const profile = localStorage.getItem('user_profile');
        return profile ? JSON.parse(profile) : null;
    }

    static redirectToDashboard() {
        const user = this.getUserProfile();
        if (user) {
            if (user.role === 'instructor') {
                window.location.href = 'instructor-dashboard.html';
            } else if (user.role === 'student') {
                window.location.href = 'student-dashboard.html';
            }
        }
    }
}

// Check if user is already authenticated and redirect
if (AuthManager.isAuthenticated()) {
    AuthManager.redirectToDashboard();
}

// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.querySelector('.nav-links');

mobileMenuToggle.addEventListener('click', function() {
    navLinks.classList.toggle('mobile-open');
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.feature-card, .step, .hero-content, .about-container');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
});

// Handle role-specific registration links
document.querySelectorAll('a[href*="register.html"]').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.includes('?role=')) {
            // Store the role preference for the registration page
            const url = new URL(href, window.location.origin);
            const role = url.searchParams.get('role');
            if (role) {
                sessionStorage.setItem('preferred_role', role);
            }
        }
    });
});

// Dynamic typing effect for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect on page load
window.addEventListener('load', function() {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        // Only run typing effect on desktop to avoid performance issues
        if (window.innerWidth > 768) {
            setTimeout(() => {
                typeWriter(heroTitle, originalText.replace(/<[^>]*>/g, ''), 50);
            }, 500);
        }
    }
});

// Stats counter animation
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }
    
    updateCounter();
}

// Trigger counter animation when stats section comes into view
const statsObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('.stat-number');
            counters.forEach((counter, index) => {
                // Animate with different values for demo
                const targets = [100, 500, 1000];
                if (targets[index]) {
                    setTimeout(() => {
                        animateCounter(counter, targets[index]);
                    }, index * 200);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }
});

// Add loading states for CTA buttons
document.querySelectorAll('.cta-buttons .btn').forEach(button => {
    button.addEventListener('click', function(e) {
        // Don't prevent default, let the link work
        this.style.opacity = '0.8';
        this.style.transform = 'translateY(-1px)';
        
        setTimeout(() => {
            this.style.opacity = '1';
            this.style.transform = 'translateY(-3px)';
        }, 200);
    });
});

// Parallax effect for hero section
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const heroVisual = document.querySelector('.hero-visual');
    
    if (hero && heroVisual) {
        const rate = scrolled * -0.5;
        heroVisual.style.transform = `translateY(${rate}px)`;
    }
});

// Form validation helper for registration links
function validateRegistrationFlow() {
    // Check if user came from a specific role button
    const preferredRole = sessionStorage.getItem('preferred_role');
    if (preferredRole) {
        // This will be used by the registration page
        return true;
    }
    return false;
}

// Add subtle hover effects to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(-8px) scale(1)';
    });
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    // Handle Escape key to close mobile menu
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
        navLinks.classList.remove('mobile-open');
        const icon = mobileMenuToggle.querySelector('i');
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
    }
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounced scroll handler
const debouncedScrollHandler = debounce(function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
}, 10);

window.addEventListener('scroll', debouncedScrollHandler);

// Handle window resize for responsive behavior
window.addEventListener('resize', function() {
    // Close mobile menu if window becomes large
    if (window.innerWidth > 768 && navLinks.classList.contains('mobile-open')) {
        navLinks.classList.remove('mobile-open');
        const icon = mobileMenuToggle.querySelector('i');
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
    }
});

// Add error handling for navigation
document.querySelectorAll('.nav-btn, .btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Check if it's an external link or file that might not exist
        if (href && (href.endsWith('.html') || href.startsWith('http'))) {
            // Add a subtle loading state
            this.style.pointerEvents = 'none';
            this.style.opacity = '0.8';
            
            // Restore state after a short delay (in case of navigation failure)
            setTimeout(() => {
                this.style.pointerEvents = 'auto';
                this.style.opacity = '1';
            }, 2000);
        }
    });
});

console.log('EduFocus index page loaded successfully');