const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const crypto = require('crypto');
const { createServer } = require('http');
require('dotenv').config();

const User = require('./models/user');

const app = express();
const port = process.env.PORT || 3000;
const websiteId = process.env.WEBSITE_ID;
const publicFolder = path.join(__dirname, 'public');

const ai = new GoogleGenAI({});

const server = createServer(app);

const io = require('socket.io')(server);

// app settings
app.set('view engine', 'ejs');
app.set('view cache', false);

// built-in middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicFolder));
app.use(session({
	secret: process.env.SESSION_SECRET_KEY,
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors({
	origin: process.env.BASE_URL
}));

// passport stuff
passport.use(new LocalStrategy(
	{
		usernameField: 'email',
		passwordField: 'password'
	},
	async (email, password, done) => {
		try {
			if(!email || !password) {
				return done(new Error('Bad Request - Missing Credentials'), null);
			}
			const user = await User.findOne({ email });
			if(!user) {
				return done(new Error('Bad Request - Incorrect Email or Password'), null);
			}
			// user found
			const isValid = await bcrypt.compare(password, user.password);
			if(!isValid) {
				return done(new Error('Bad Request - Incorrect Email or Password'), null);
			}
			// grant the user
			done(null, user);
			
		} catch(err) {
			done(err, null);
		}
	}
));

passport.serializeUser((user, done) => {
	try {
		done(null, user.id);
	} catch(err) {
		done(err, null);
	}
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		if(!user) {
			return done(new Error('Bad Request - Invalid Credentials'), null);
		}
		// grant user
		done(null, user);
		
	} catch(err) {
		done(err, null);
	}
});

const sanitizeInput = (input) => {
	return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// cron job stuff
cron.schedule('0 0 * * *', async () => {
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	await User.deleteMany({
		isVerified: false,
		createdAt: { $lt: sevenDaysAgo }
	});
	console.log('Cleared 7 Days old unverified users');
});

// nodemailer stuff
const transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS
	}
});

const sendVerificationEmail = async (email, token) => {
	const verificationUrl = `${process.env.BASE_URL}/api/verify/email/${token}`;
	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: email,
		subject: 'Verify Your Email',
		html: `
		<h1> Verify Your Email </h1>
		<p> Click on the link below to verify account: </p>
		<a href="${verificationUrl}"> Verify Here </a>
		<p> This link expires in 24 hours. </p>
		`
	};
	await transporter.sendMail(mailOptions);
};

// custom middlewares
const isLoggedIn = (req, res, next) => {
	try {
		if(!req.isAuthenticated()) {
			return res.redirect('/login');
		}
		return next();
	} catch(err) {
		next(err);
	}
};

// CRUD operation
app.get('/signup', (req, res, next) => {
	try {
		res.render('signup');
	} catch(err) {
		next(err);
	}
});

app.post('/signup',[
	body('name')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Bad Request - Name field required'),
	body('email')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Bad Request - Email field is required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Bad Request - Invalid Email address'),
	body('password')
	.trim()
	.notEmpty()
	.withMessage('Bad Request - Password field required')
	.isLength({ min: 6 })
	.withMessage('Bad Request - Password too short'),
	body('confirmPassword')
	.trim()
	.notEmpty()
	.withMessage('Bad Request - Confirm Password field required')
	.isLength({ min: 6 })
	.withMessage('Bad Request - Password too short'),
], async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			const errMsg = errors.array().map(error => error.msg);
			res.json({ error: errMsg });
		}

		const { name, email, password, confirmPassword } = req.body;
		if(!name || !email || !password || !confirmPassword) {
			return next(new Error('Bad Request - Missing Credentials'));
		}
		if(password !== confirmPassword) {
			return next(new Error('Bad Request - Password Mismatch'));
		}
		const user = await User.findOne({ email });
		if(user) {
			return next(new Error('Bad Request - Incorrect Email or Password'));
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const name2 = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
		const verificationToken = crypto.randomBytes(32).toString('hex');
		const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; //1day plus

		const newUser = new User({
			name: name2,
			email,
			password: hashedPassword,
			verificationToken,
			verificationExpires
		});

		await newUser.save(); // save to db
		await sendVerificationEmail(email, verificationToken);
		// let them know
		res.status(200).send('Registration Successful. Please check your email to verify your email.');
		
	} catch(err) {
		next(err);
	}
});

app.get('/api/verify/email/:token', async (req, res, next) => {
	try {
		const token = req.params.token.toString();
		const user = await User.findOne({
			verificationToken: token,
			verificationExpires: { $gt: Date.now() }
		});
		// no user
		if(!user) {
			return res.redirect('/resend/verification/link');
		}
		// true user
		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationExpires = undefined;
		user.verifiedAt = Date.now();
		// save patches
		await user.save();
		// log them in
		req.login(user, (err) => {
			if(err) {
				return res.redirect('/login');
			}
			res.status(200).send('Email verified successfully. Visit <a href="/"> Home </a>');
		});
		
	} catch(err) {
		next(err);
	}
});

app.get('/resend/verification/link', (req, res, next) => {
	try {
		res.render('resend');
	} catch(err) {
		next(err);
	}
});

app.post('/resend/verification/link',[
	body('email')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Bad Request - Email field required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Bad Request - Invalid Email address')
], async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			const errMsg = errors.array().map(error => error.msg);
			return res.json({ error: errMsg });
		}
		
		const { email } = req.body;
		if(!email) {
			return next(new Error('Bad Request - Email field required'));
		}
		const user = await User.findOne({ email });
		if(!user) {
			return next(new Error('Bad Request - Email not registered'));
		}
		if(user.isVerified === true) {
			return next(new Error('Bad Request - Email already verified'));
		}
		// there's unverified user
		const verificationToken = crypto.randomBytes(32).toString('hex');
		const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
		
		user.verificationToken = verificationToken;
		user.verificationExpires = verificationExpires;
		// save patches
		await user.save();
		await sendVerificationEmail(email, verificationToken);
		// let them know
		res.status(200).send('Verification Email Resent. Check your email to verify your email.');
		
	} catch(err) {
		next(err);
	}
});

app.get('/login', (req, res, next) => {
	try {
		res.render('login');
	} catch(err) {
		next(err);
	}
});

app.post('/login', [
	body('email')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Bad Request - Email field required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Bad Request - Invalid Email address')
], passport.authenticate('local', { failureRedirect: '/login' }), ( req, res, next) => {
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			const errMsg = errors.array().map(error => error.msg);
			return res.json({ error: errMsg });
		}
		res.redirect('/');
	} catch(err) {
		next(err);
	}
});

app.get('/', isLoggedIn, (req, res, next) => {
	try {
		res.render('profile', {
			user: req.user
		});
	} catch(err) {
		next(err);
	}
});


io.on('connection', (socket) => {
	socket.on('send-message', async (msg) => {
		try {
			const response = await generateContentMine(msg);
			// console.log("Full result: ", JSON.stringify(response, null, 2));
			socket.emit('handle-send-message', response);

			// sorry guys
			const email = app.locals.email;
			await saveToDb(email, msg, response);
		} catch(err) {
			console.error('Response generation failed: ', err.message);
			socket.emit('error', err);
		}
	});
});

app.get('/service', isLoggedIn, async (req, res, next) => {
	try {
		const { email } = req.user;
		app.locals.email = email;
		const user = await User.findOne({ email });
		const conversations = user.conversations || [];

		res.render('service', {
			user: user,
			conversations: conversations
		});
		
	} catch(err) {
		next(err);
	}
});

async function generateContent(prompt) {
	const result = await ai.models.generateContent({
		model: "gemini-2.0-flash",
		contents: "A 3 line poem about quantum computing"
	});
	// const candidate = result.candidates[0];
	// const responseText  = candidate.content.parts[0].text.trim();
	console.log(result.text);
	return result.text;
};

async function generateContentMine(msg) {
	const response = await bcrypt.hash(msg, 10);
	return response;
};

async function saveToDb(email, quest, ans) {
	try {
		const user = await User.findOne({ email });

		const questTrim = quest.trim();
		const ansTrim = ans.trim();

		const questAnsObj = {
			question: questTrim,
			answer: ansTrim
		};
		
		user.conversations.push(questAnsObj);
		// save patches
		await user.save();
		
	} catch(err) {
		console.error('Error Saving to DB: ', err.message);
	}
};

app.get('/logout', (req, res, next) => {
	try {
		req.logout((err) => {
			if(err) {
				return next(new Error('Failed to Log-Out'));
			}
			res.redirect('/login');
		});
	} catch(err) {
		next(err);
	}
});

app.use((req, res, next) => {
	try {
		next(new Error('404 - Page Not Found'));
	} catch(err) {
		next(err);
	}
});

app.use((err, req, res, next) => {
	if(process.env.NODE_ENV !== 'development') {
		console.log('Error Message: ', err.message);
		console.log('Error Stack: ', err.stack);
		return res.status(500).send('Internal Server Error');
	}
	// development only - faster debugging
	res.json({ error: err.message });
});

server.listen(port, () => {
	console.log(`Server listening on port ${port}...`);
});
