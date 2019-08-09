const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex');
const bodyParser = require('body-parser');
const cors = require('cors');

// const signIn = require('./controllers/signIn');
const auth = require('./controllers/auth');
const list = require('./controllers/list');


/* Comment these sections out depending on deployment method */
/* Leave section 1 uncommented for Heroku */
/* Leave section 2 uncommented for local development and change configurations as necessary */

/* Section 1 */
// const db = knex({
// 	client : 'pg',
// 	connection : {
// 		connectionString : process.env.DATABASE_URL,
// 		ssl : true,
// 	}
// });

/* Section 2 */
const db = knex({
	client : 'pg',
	connection : {
		host : '127.0.0.1',
		user : 'postgres',
		password : '',
		database : 'chime',
	} 
});


const app = express();
app.use(cors());

/* Body parser to parse json */
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));


/* API routes */
app.get('/', (req, res) => { res.send('Server is up'); });

app.post('/register', (req, res) => { auth.handleRegister(req, res, db, bcrypt) });
app.post('/signIn', (req, res) => { auth.handleSignIn(req, res, db, bcrypt) });
app.get('/getList', (req, res) => { list.handleGetList(req, res, db, bcrypt)});

app.listen(3001, () => {
	console.log('Server started');
});
