const socket = io();

const msgs = document.getElementById('msgs');
const input = document.getElementById('message');
const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');

socket.on('handle-user-connection', (name) => {
	if(name !== currentUser.name) {
		appendMsg(`${name} connected`);
	}
});

socket.on('handle-send-message', (data) => {
	if(data.name !== currentUser.name) {
		appendMsg(`${data.name}: ${data.message}`);
	}
});

socket.on('handle-user-disconnection', (name) => {
	if(name !== currentUser.name) {
		appendMsg(`${name} disconnected`);
	}
});

// error handlers
socket.on('error', (err) => {
	console.log('Socket error: ', err);
	appendMsg(`Error: ${err}`);
});

socket.on('connect_error', (err) => {
	console.log('Connection Error: ', err);
	appendMsg(`Connection Error: ${err}`);
});

// message sending
btn1.addEventListenet('click', (e) => {
	e.preventDefault();
	const msg = input.value.trim();
	if(!msg) return;
	appendMsg(`You: ${msg}`);
	socket.emit('send-message', { message: msg });
	input.value = '';
});

// disconnection handler
btn2.addEventListener('click', () => {
	window.location.href = "/"; // closing window will trigger auto-disconnect
});

function appendMsg(message) {
	const newDiv = document.createElement('div');
	newDiv.textContent = message;
	msgs.appendChild(newDiv);
	msgs.scrollTop = msgs.scrollHeight;
};

appendMsg('You joined the chat');
