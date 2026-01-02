const socket = io();

const msgs = document.getElementById('msgs');
const input = document.getElementById('message');
const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');
const form1 = document.getElementById('form1');
const showSocketError = document.getElementById('show-socket-error');
const typingIndicator = document.getElementById('typingIndicator');

// Handle form submission
form1.addEventListener('submit', (e) => {
  e.preventDefault();
  let msg = input.value.trim();
  if (msg) {
    appendQuest(msg);
    socket.emit('send-message', msg);
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
  }
});

// Handle Enter key (Shift+Enter for new line)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form1.dispatchEvent(new Event('submit'));
  }
});

socket.on('handle-send-message', (response) => {
  // Hide typing indicator
  hideTypingIndicator();
  // Add small delay for natural feel
  setTimeout(() => {
    appendAns(response);
  }, 300);
});

socket.on('error', (error) => {
	showSocketError.style.display = "block";
	setTimeout(() => {
		showSocketError.style.display = "none";
	}, 4000);
	console.log('Socket.IO error: ', error.message);
});

btn2.addEventListener('click', () => {
  /*if (confirm('Are you sure you want to disconnect?')) {
    window.location.href = '/';
  }*/
  window.location.href = '/';
});

// New message functions for the updated UI
function appendQuest(message) {
  const messageRow = document.createElement('div');
  messageRow.className = 'message-row user-message';
  
  messageRow.innerHTML = `
    <div class="message-content">
      <div class="message-bubble">
        <p>${escapeHtml(message)}</p>
        <span class="message-time">${formatTime()}</span>
      </div>
    </div>
    <div class="avatar user-avatar">
      <i class="fas fa-user"></i>
    </div>
  `;
  
  msgs.appendChild(messageRow);
  scrollToBottom();
}

function appendAns(message) {
  const messageRow = document.createElement('div');
  messageRow.className = 'message-row ai-message';
  
  messageRow.innerHTML = `
    <div class="avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="message-content">
      <div class="message-bubble">
        <p>${escapeHtml(message)}</p>
        <span class="message-time">${formatTime()}</span>
      </div>
    </div>
  `;
  
  msgs.appendChild(messageRow);
  scrollToBottom();
}

function showTypingIndicator() {
  typingIndicator.classList.add('active');
  scrollToBottom();
}

function hideTypingIndicator() {
  typingIndicator.classList.remove('active');
}

function scrollToBottom() {
  setTimeout(() => {
    msgs.scrollTop = msgs.scrollHeight;
  }, 100);
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-focus input on load
window.addEventListener('load', () => {
  msgs.scrollTop = msgs.scrollHeight;
  input.focus();
  
  // Remove empty state if there are messages
  const emptyState = document.querySelector('.empty-state');
  if (emptyState && msgs.children.length > 1) {
    emptyState.remove();
  }
});
