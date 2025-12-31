const socket = io();

// const color = prompt('What background color?');
// document.body.style.backgroundColor = color.trim();

const msgs = document.getElementById('msgs');
const input = document.getElementById('message');
const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');

const divQuest = document.getElementById('div-quest');
const divAns = document.getElementById('div-ans');

btn1.addEventListener('click', (e) => {
	e.preventDefault();
	const msg = input.value.trim();
	appendQuest(`You: ${msg}`);
	socket.emit('send-message', msg);
	input.value = '';
});

socket.on('handle-send-message', (response) => {
	appendAns(`AI: ${response}`);
});

btn2.addEventListener('click', () => {
	window.location.href = '/'; // close the window and navigate away
});

function appendQuest(message) {
	const newQuestDiv = document.createElement('div');
	const newQuestPara = document.createElement('p');
	
	newQuestPara.textContent = message;

	newQuestPara.classList.add('quest-para');
	newQuestDiv.classList.add('div-quest-ans', 'div-quest');

	newQuestDiv.append(newQuestPara);
	msgs.append(newQuestDiv);
	
	msgs.scrollTop = msgs.scrollHeight;
};

function appendAns(message) {
	const newAnsDiv = document.createElement('div');
	const newAnsPara = document.createElement('p');
	
	newAnsPara.textContent = message;
	
	newAnsPara.classList.add('ans-para');
	newAnsDiv.classList.add('div-quest-ans', 'div-quest');

	newAnsDiv.append(newAnsPara);
	msgs.append(newAnsDiv);
	
	msgs.scrollTop = msgs.scrollHeight;
};
