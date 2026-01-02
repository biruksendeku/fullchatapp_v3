    // Password visibility toggle
    const showBtn = document.getElementById('show-btn');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');

    // Toggle password visibility
    function togglePasswordVisibility() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // Toggle eye icon
      const icon = showBtn.querySelector('i');
      if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        showBtn.setAttribute('aria-label', 'Hide password');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        showBtn.setAttribute('aria-label', 'Show password');
      }
    }

    // Form validation
    function validateForm() {
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value;

      // Basic validation
      if (!email) {
        showError('Please enter your email address');
        return false;
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return false;
      }

      if (!password) {
        showError('Please enter your password');
        return false;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return false;
      }

      return true;
    }

    function showError(message) {
      let errorDiv = document.querySelector('.alert-error');

      // If error div doesn't exist, create it
      if (!errorDiv || errorDiv.style.display === 'none') {
        errorDiv = document.createElement('div');
        errorDiv.className = 'alert-error';
        const form = document.querySelector('.form');
        form.insertBefore(errorDiv, form.querySelector('.form-title').nextSibling);
      }

      errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
      errorDiv.style.display = 'flex';

      // Hide any success message
      const successDiv = document.querySelector('.alert-success');
      if (successDiv) successDiv.style.display = 'none';

      // Scroll to error message with smooth animation
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showSuccess(message) {
      let successDiv = document.querySelector('.alert-success');

      // If success div doesn't exist, create it
      if (!successDiv || successDiv.style.display === 'none') {
        successDiv = document.createElement('div');
        successDiv.className = 'alert-success';
        const form = document.querySelector('.form');
        form.insertBefore(successDiv, form.querySelector('.form-title').nextSibling);
      }

      successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
      successDiv.style.display = 'flex';

      // Hide any error message
      const errorDiv = document.querySelector('.alert-error');
      if (errorDiv) errorDiv.style.display = 'none';
    }

    // Add a subtle floating animation to the form
    function addFloatingEffect() {
      const formSection = document.querySelector('.form__section');
      let mouseX = 0;
      let mouseY = 0;

      document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 10;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 10;

        formSection.style.transform = `
          translateY(0)
          rotateX(${mouseY * 0.2}deg)
          rotateY(${mouseX * 0.2}deg)
        `;
      });
    }

    // Event listeners
    showBtn.addEventListener('click', togglePasswordVisibility);

    // Enter key submits form
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (document.activeElement === passwordInput ||
          document.activeElement === document.getElementById('email'))) {
        if (validateForm()) {
          loginForm.submit();
        }
      }
    });

    loginForm.addEventListener('submit', function(e) {
      // If client-side validation fails, prevent form submission
      if (!validateForm()) {
        e.preventDefault();
      }
      // If validation passes, let the form submit to your backend
    });

    // Add some sample validation on page load for demo
    document.addEventListener('DOMContentLoaded', function() {
      // Focus on email field
      document.getElementById('email').focus();

      // Add floating effect on larger screens
      if (window.innerWidth > 768) {
        addFloatingEffect();
      }

      // Add ripple effect to all buttons
      const buttons = document.querySelectorAll('button, .social-btn');
      buttons.forEach(button => {
        button.addEventListener('click', function(e) {
          const x = e.clientX - e.target.getBoundingClientRect().left;
          const y = e.clientY - e.target.getBoundingClientRect().top;

          const ripple = document.createElement('span');
          ripple.style.position = 'absolute';
          ripple.style.borderRadius = '50%';
          ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
          ripple.style.transform = 'scale(0)';
          ripple.style.animation = 'ripple 0.6s linear';
          ripple.style.left = `${x}px`;
          ripple.style.top = `${y}px`;
          ripple.style.width = '5px';
          ripple.style.height = '5px';

          this.appendChild(ripple);

          setTimeout(() => {
            ripple.remove();
          }, 600);
        });
      });
    });
