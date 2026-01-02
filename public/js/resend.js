    const form = document.getElementById('resendForm');
    const submitBtn = document.getElementById('submitBtn');
    const cooldownNotice = document.getElementById('cooldownNotice');

    // Simple cooldown system (frontend only - your backend has the real one)
    let canSubmit = true;
    let cooldownTimer = null;

    // Check localStorage for existing cooldown
    function checkCooldown() {
      const lastRequest = localStorage.getItem('lastResendRequest');
      if (lastRequest) {
        const timePassed = Date.now() - parseInt(lastRequest);
        const cooldownTime = 60 * 1000; // 1 minute cooldown

        if (timePassed < cooldownTime) {
          startCooldown(Math.ceil((cooldownTime - timePassed) / 1000));
        }
      }
    }

    function startCooldown(seconds) {
      canSubmit = false;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please Wait...';

      let timeLeft = seconds;

      cooldownTimer = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
          clearInterval(cooldownTimer);
          enableForm();
          cooldownNotice.textContent = '';
          localStorage.removeItem('lastResendRequest');
        } else {
          cooldownNotice.textContent = `Please wait ${timeLeft} seconds before requesting again`;
          cooldownNotice.style.color = '#dc3545';
        }
      }, 1000);

      // Initial display
      cooldownNotice.textContent = `Please wait ${timeLeft} seconds before requesting again`;
      cooldownNotice.style.color = '#dc3545';
    }

    function enableForm() {
      canSubmit = true;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Resend Verification Email';
    }

    // Form submission
    form.addEventListener('submit', function(e) {
      const email = document.getElementById('email').value.trim();

      // Basic validation
      if (!email.includes('@') || !email.includes('.')) {
        e.preventDefault();
        showMessage('Please enter a valid email address', 'error');
        return;
      }

      if (!canSubmit) {
        e.preventDefault();
        showMessage('Please wait before making another request', 'error');
        return;
      }

      // Set cooldown
      localStorage.setItem('lastResendRequest', Date.now().toString());
      startCooldown(60); // 60 second cooldown

      // Change button to loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    });

    function showMessage(message, type) {
      // Remove existing messages
      const oldError = document.querySelector('.alert-error');
      const oldSuccess = document.querySelector('.alert-success');
      if (oldError && oldError.style.display !== 'none') oldError.style.display = 'none';
      if (oldSuccess && oldSuccess.style.display !== 'none') oldSuccess.style.display = 'none';

      // Show new message
      const messageDiv = document.createElement('div');
      messageDiv.className = type === 'error' ? 'alert-error' : 'alert-success';
      messageDiv.textContent = message;

      // Insert after warning header
      const formContainer = document.querySelector('.form-container');
      formContainer.insertBefore(messageDiv, formContainer.firstChild);

      // Scroll to message
      messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Check cooldown on page load
    document.addEventListener('DOMContentLoaded', checkCooldown);
