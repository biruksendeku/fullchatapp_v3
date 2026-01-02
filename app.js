const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
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
app.use(flash()); // the flash middleware
app.use(helmet());

// making flash messages available to all views
app.use((req, res, next) => {
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	res.locals.errors = req.flash('errors');
	next();
});

// passport stuff
passport.use(new LocalStrategy(
	{
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true
	}, async (req, email, password, done) => {
		try {
			if(!email || !password) {
				return done(null, false, req.flash('error', 'Missing credentials'));
			}
			const user = await User.findOne({ email });
			if(!user) {
				return done(null, false, req.flash('error', 'Incorrect email or password'));
			}
			const isValid = await bcrypt.compare(password, user.password);
			if(!isValid) {
				return done(null, false, req.flash('error', 'Incorrect email or password'));
			}
			// successfully log-in req
			done(null, user);
		} catch(err) {
			next(err);
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
		done(null, user);
		
	} catch(err) {
		done(err, null);
	}
});

const sanitizeInput = (input) => {
	return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 5 mins
	max: 5, // 1 req per 24 secs
	message: 'Too many requests. Try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true
});

app.use('/signup', authLimiter);
app.use('/login', authLimiter);

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 mins
	max: 10, // too much??
	message: 'Too many requests. Try again later.',
	standardHeaders: true,
	legacyHeaders: false
});
app.use('/api', apiLimiter);

const browseLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 75,
	message: 'Too many requests. Try again later.',
	standardHeaders: true,
	legacyHeaders: false
});
app.use('/', browseLimiter);

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

const sendResetEmail = async (email, token) => {
	const resetUrl = `${process.env.BASE_URL}/api/reset/password/verification/${token}`;
	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: email,
		subject: 'Approve Password Reset',
		html: `
		<h1> Approve Password Reset </h1>
		<p> Click on the link below to reset old Password with the new Password: </p>
		<a href="${resetUrl}"> Reset Here </a>
		<p> This link expires in 24 hours. </p>
		`
	};
	await transporter.sendMail(mailOptions);
};

const successfulResetEmail = async (email) => {
	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: email,
		subject: 'Your Password Has Beed Updated Successfully',
		html: `
		<h1> Password Reset Request Approved Successfully </h1>
		<p> If you have any complains you can contact us.</p>
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
	.withMessage('Name field required'),
	body('email')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Email field is required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Invalid Email address'),
	body('password')
	.trim()
	.notEmpty()
	.withMessage('Password field required')
	.isLength({ min: 6 })
	.withMessage('Password too short'),
	body('confirmPassword')
	.trim()
	.notEmpty()
	.withMessage('Confirm Password field required')
], async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			const errMsg = errors.array().map(error => error.msg);
			req.flash('error', errMsg);
			return res.redirect('/signup');
		}

		const { name, email, password, confirmPassword } = req.body;
		if(!name || !email || !password || !confirmPassword) {
			req.flash('error', 'Missing Credentials');
			return res.redirect('/signup');
		}
		if(password !== confirmPassword) {
			req.flash('error', 'Password Mismatch');
			return res.redirect('/signup');
		}
		const user = await User.findOne({ email });
		if(user) {
			req.flash('error', 'Incorrect email or password');
			return res.redirect('/signup');
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
			return res.redirect('/api/resend/verification/link');
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

app.get('/api/resend/verification/link', (req, res, next) => {
	try {
		res.render('resend');
	} catch(err) {
		next(err);
	}
});

app.post('/api/resend/verification/link',[
	body('email')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Email field required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Invalid Email address')
], async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			const errMsg = errors.array().map(error => error.msg);
			req.flash('error', errMsg);
			return res.redirect('/api/resend/verification/link');
		}
		
		const { email } = req.body;
		if(!email) {
			req.flash('error', 'Email field required');
			return res.redirect('/api/resend/verification/link');
		}
		const user = await User.findOne({ email });
		if(!user) {
			req.flash('error', 'Email not registered');
			return res.redirect('/api/resend/verification/link');
		}
		if(user.isVerified === true) {
			req.flash('error', 'Email already verified');
			return res.redirect('/api/resend/verification/link');
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
	.withMessage('Email field required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Invalid email address'),
	body('password')
	.trim()
	.notEmpty()
	.withMessage('Password field required')
	.isLength({ min: 6 })
	.withMessage('Password too short'),
],(req, res, next) => {
	// using passport with custom callback
	passport.authenticate('local', {
		failureRedirect: '/login',
		failureFlash: true,
		successFlash: 'Welcome Back!'
	})(req, res, next);
	// sanitizing again
	const errors = validationResult(req);
	if(!errors.isEmpty()) {
		const errMsg = errors.array().map(error => error.msg);
		req.flash('error', errMsg);
		return res.redirect('/login');
	}
	res.redirect('/');
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
			const response = await generateContent(msg);
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
	prompt = sanitizeInput(prompt);
	const promptInput = `
	You are an expert AI support assistant for ${websiteUrl}. Your 
	personality is: warm, human like, one solution generator 
	(try to satisfy users with one solution on purpose, don't end response 
	with open question). If you don't think it's not satisfying leave 
	a contact us link below.
	`;
	const result = await ai.models.generateContent({
		model: "gemini-2.0-flash",
		contents: promptInput
	});
	const candidate = result.candidates[0];
	const responseText  = candidate.content.parts[0].text.trim();
	console.log('RESPONSE-TEXT: ', responseText);
	return responseText;
};

async function generateContentDemoAsyncFunc(msg) {
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
			answer: ansTrim,
			createdAt: Date.now()
		};
		
		user.conversations.push(questAnsObj);
		// save patches
		await user.save();
		
	} catch(err) {
		console.error('Error Saving to DB: ', err.message);
	}
};

app.get('/api/reset/password', (req, res, next) => {
	try {
		res.render('reset');
	} catch(err) {
		next(err);
	}
});

app.post('/api/reset/password',[
	body('email')
	.trim()
	.escape()
	.notEmpty()
	.withMessage('Email field required')
	.isEmail()
	.normalizeEmail()
	.withMessage('Invalid Email Address'),
	body('newPassword')
	.trim()
	.notEmpty()
	.withMessage('Email field required')
	.isLength({ min: 6 })
	.withMessage('Password too short'),
], async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			const errMsg = errors.array().map(error => error.msg);
			req.flash('error', errMsg);
		}
		
		const { email, newPassword } = req.body;
		const user = await User.findOne({ email });
		if(!user) {
			req.flash('error', 'Email not registered');
			return res.redirect('/api/reset/password');
		}
		// there's user
		if(user.isVerified === false) {
			req.flash('error', 'Email not verified, not allowed to reset password');
			return res.redirect('/api/reset/password');
		}
		const isSame = await bcrypt.compare(newPassword, user.password);
		if(isSame) {
			req.flash('error', "New password can't be the same as the old one");
			return res.redirect('/api/reset/password');
		}
		// user deserves reset
		const resetToken = crypto.randomBytes(32).toString('hex');
		const resetExpires = Date.now() + 24 * 60 * 60 * 1000; //1day plus

		const newHashedPassword = await bcrypt.hash(newPassword, 10);

		user.resetToken = resetToken;
		user.resetExpires = resetExpires;
		user.newPassword = newHashedPassword;

		// save patches
		await user.save();
		await sendResetEmail(email, resetToken);
		res.status(200).send('Reset Password approval link sent, please check your email to approve the Password update!');
		
	} catch(err) {
		next(err);
	}
});

app.get('/api/reset/password/verification/:token', async (req, res, next) => {
	try {
		const token = req.params.token.toString();
		const user = await User.findOne({
			resetToken: token,
			resetExpires: { $gt: Date.now() }
		});
		if(!user) {
			// return res.status(400).send('Invalid or Expired Reset link. Try again.');
			req.flash('error', 'Invalid or Expired Reset Link. Try again later.');
			return res.redirect('/api/reset/password');
		}

		// user really is trying it's best, congrats user!!👊
		const newPassword = user.newPassword;

		user.password = newPassword; // first replace it
		user.resetToken = undefined;
		user.resetExpires = undefined;
		user.newPassword = undefined; // then remove it
		// save patches
		await user.save();
		await successfulResetEmail(user.email);
		res.status(200).send('Password Changed Successfully. Now <a href="/login"> Login. </a>');

	} catch(err) {
		next(err);
	}
});

app.get('/logout', isLoggedIn, (req, res, next) => {
	try {
		req.logout((err) => {
			if(err) {
				return res.status(400).send('Failed to Log-Out. Please try again.');
			}
			res.redirect('/login');
		});
	} catch(err) {
		next(err);
	}
});

app.use((req, res, next) => {
	try {
		res.status(404).send(`<h1> 404 </h1> <h2> Page Not Found </h2>`);
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
