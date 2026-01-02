    // Password visibility toggle
    const showBtn1 = document.getElementById('show-btn1');
    const showBtn2 = document.getElementById('show-btn2');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordMatch = document.getElementById('passwordMatch');
    const signupForm = document.getElementById('signupForm');

    // Toggle password visibility
    function togglePasswordVisibility(input, button) {
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);

      // Toggle eye icon
      const icon = button.querySelector('i');
      if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        button.setAttribute('aria-label', 'Hide password');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        button.setAttribute('aria-label', 'Show password');
      }
    }

    // Check if passwords match
    function checkPasswordMatch() {
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (!confirmPassword) {
        passwordMatch.innerHTML = '';
        passwordMatch.style.color = '';
        return;
      }

      if (password === confirmPassword) {
        passwordMatch.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match';
        passwordMatch.style.color = '#4CAF50';
      } else {
        passwordMatch.innerHTML = '<i class="fas fa-exclamation-circle"></i> Passwords do not match';
        passwordMatch.style.color = '#ff4757';
      }
    }

    // Form validation
    function validateForm() {
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Basic validation
      if (!name) {
        showError('Please enter your full name');
        return false;
      }

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
        showError('Please enter a password');
        return false;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return false;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match');
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

      // Scroll to error message
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

    // Event listeners
    showBtn1.addEventListener('click', () => {
      togglePasswordVisibility(passwordInput, showBtn1);
    });

    showBtn2.addEventListener('click', () => {
      togglePasswordVisibility(confirmPasswordInput, showBtn2);
    });

    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    // Optional: Also check when password field changes
    passwordInput.addEventListener('input', checkPasswordMatch);

    signupForm.addEventListener('submit', function(e) {
      // If client-side validation fails, prevent form submission
      if (!validateForm()) {
        e.preventDefault();
      }
      // If validation passes, let the form submit to your backend
    });

    // Add some sample validation on page load for demo
    document.addEventListener('DOMContentLoaded', function() {
      // Focus on name field
      document.getElementById('name').focus();

      // Add ripple effect to all buttons
      const buttons = document.querySelectorAll('button');
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
