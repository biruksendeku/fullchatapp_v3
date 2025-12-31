const express = require('express');
const User = require('./models/user');

const app = express();
const port = 3000;

async function loadUsers() {
	const users = await User.find({});
	console.log(users);
};

loadUsers();

app.delete('/user/:id', (req, res) => {
	const id = req.params.id.toString();
	User.findByIdAndDelete(id)
	.then(() => {
		res.send('Deleted Successfully');
	})
	.catch((err) => {
		res.status(400).json({ error: err.message });
	});
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}...`);
});
