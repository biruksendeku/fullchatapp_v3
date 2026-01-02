    // Simple password toggle
    const showBtn = document.getElementById('show-btn');
    const newPasswordInput = document.getElementById('newPassword');
    const submitBtn = document.getElementById('btn');
    const resetForm = document.getElementById('resetForm');

    // Toggle password visibility
    showBtn.addEventListener('click', function() {
      const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      newPasswordInput.setAttribute('type', type);

      // Toggle eye icon
      const icon = this.querySelector('i');
      if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });

    // Simple client-side validation
    resetForm.addEventListener('submit', function(e) {
      const email = document.getElementById('email').value.trim();
      const password = newPasswordInput.value;

      if (!email.includes('@')) {
        e.preventDefault();
        showMessage('Please enter a valid email address', 'error');
        return;
      }

      if (password.length < 6) {
        e.preventDefault();
        showMessage('Password must be at least 6 characters', 'error');
        return;
      }

      // Disable button and show loading
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    });

    function showMessage(message, type) {
      // Remove any existing messages
      const oldError = document.querySelector('.alert-error');
      const oldSuccess = document.querySelector('.alert-success');
      if (oldError) oldError.style.display = 'none';
      if (oldSuccess) oldSuccess.style.display = 'none';

      // Create new message
      const messageDiv = document.createElement('div');
      messageDiv.className = type === 'error' ? 'alert-error' : 'alert-success';
      messageDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;

      // Insert after reset-msg
      const resetMsg = document.querySelector('.reset-msg');
      resetMsg.parentNode.insertBefore(messageDiv, resetMsg.nextSibling);

      // Scroll to message
      messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Re-enable button after error
      if (type === 'error') {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Email';
      }
    }
