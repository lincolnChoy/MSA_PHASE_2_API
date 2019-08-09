/**
 * 
 * This API handler takes 4 parameters via request body
 * 1 - username: string
 * 2 - first: string
 * 3 - last: string
 * 4: password: string
 * 
 * Returns
 * 1: code: number - indicates if the API call was successful
 * 2: user object: {
 *      first: string,
 *      last: string,
 *      id: number,
 *      picture: string
 * }
 */
const handleRegister = (req, res, db, bcrypt) => {

	/* Destructure request body */
	const { username, first, last, password } = req.body;

	if (!username || !first || !last || !password) {
		return res.status(400).json({ code : 3 });
	}

	db.select('username').from('login')
	.where('username','=', username)
	.then(data => {
		
		/* If username already exists, send error code back to front-end */
		if (data != "") {
			if (data[0].username) {
				return res.send({ code : 2 });
			}
		}
		else {

			/* Synchronous hashing */
			const hash = bcrypt.hashSync(password);

			/* Transaction for consistency */
			db.transaction(trx => {

				const lastSeen = ((new Date).getTime()).toString();
				
				/* First insert into login table */
				trx.insert({
					hash : hash,
					username : username,
					lastseen : lastSeen
				})
				.into('login')
				.returning('id')
				.then(id => {
					return trx('profile')
					.returning('*')
					.insert({
                        id : id[0],
                        first: first,
                        last: last,
						picture: 'https://i.imgur.com/FSgbIi4.png'
					})
                    /* On successful API call, return the user object to the front-end */
                    .then(user => {
                        return res.status(200).json({ code : 0, 
                                                        user: {
                                                            first : user[0].first, 
                                                            last : user[0].last, 
                                                            id : user[0].id, 
                                                            picture : user[0].picture
                                                        } 
                        });
                    });
				})
				/* Commit changes */
				.then(trx.commit)
				/* Delete transaction if failed anywhere */
				.catch(trx.rollback)
			})
			/* Return error code if failed */
			.catch(err => res.json({ code : 4 }));	
		}
	});
}


/**
 * 
 * This API handler takes 2 parameters via request body
 * 1 - username: string
 * 2 - password: string
 * 
 * Returns
 * 1: code: number - indicates if the API call was successful
 * 2: user object: {
 *      first: string,
 *      last: string,
 *      id: number,
 *      picture: string
 * }
 */
const handleSignIn = (req, res, db, bcrypt) => {
	
	/* Destructure request body */
	const { username, password } = req.body;

	if (!(username && password)) {
		return res.status(400).json({ code : 3 });
    }
    
 	/* Grab hash from login table of requested login username */
    db.select('username','hash', 'id').from('login')
	.where('username','=', username)
	.then(user => {

		/* Make sure that this username exists */
		if (user.length !== 0) {

			/* Use synchronous hash compare */
            const isValid = bcrypt.compareSync(password, user[0].hash);
            
			/* On hash match, return the user object from user table */
			if (isValid) {
                updateLastSeen(db, username)
                .then(() => {
                    getProfile(db, user[0].id)
                    .then(profile => {
                        return res.send({ 
                            code: 0, 
                            user : {
                                first : profile.first, 
                                last : profile.last, 
                                id : user[0].id, 
                                picture : profile.picture
                            }		 
                        });
                        
                    })
					.catch(err => {
						return res.status(200).json({ code : 4 });
					})
				})

			}
			/* On password mismatch, send the error code to the front-end */
			else {
				return res.json({ code : 1 });
			}
		}
		/* If username does not exist */
		else {
			return res.json({ code : 1 });
		}

	})
	/* On db failure, send error code */
	.catch(err => {
		return res.json({ code : 4 });
	})
}

const getProfile = async(db, id) => {

    const profile = await db.select('first', 'last', 'picture').from('profile').where('id','=',id);    
	return profile[0];
}

const updateLastSeen = (db, username) => {

    return new Promise((resolve, reject) => {
        const timeNow = (new Date).getTime().toString();
        db('login').update({ lastseen : timeNow })
        .where('username','=',username)
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject();
        })
    })
}


const validateUserWithUsername = (db, bcrypt, username, password) => {

    return new Promise((resolve, reject) => {
        db.select('hash').from('login')
        .where('username','=', username)
        .then(user => {
            if (user.length !== 0) {
                /* Use synchronous hash compare */
                const isValid = bcrypt.compareSync(password,user[0].hash);
                resolve(isValid);
            }
        })
        .catch(err => {
            reject(false);
        })
    })
    
}

const validateUserWithID = (db, bcrypt, id, password) => {
    return new Promise((resolve, reject) => {
        db.select('hash').from('login')
        .where('id','=', id)
        .then(user => {
            if (user.length !== 0) {
                /* Use synchronous hash compare */
                const isValid = bcrypt.compareSync(password,user[0].hash);
                resolve(isValid);
            }
        })
        .catch(err => {
            reject(false);
        })
    })
}

module.exports = {
    handleRegister : handleRegister,
    handleSignIn : handleSignIn,
    validateUserWithID: validateUserWithID,
    validateUserWithUsername: validateUserWithUsername
}