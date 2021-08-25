/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';

const { Client } = pg;

const PORT = process.argv[2];

const { Pool } = pg;
// set the way we will connect to the server
let pgConnectionConfigs;
if (process.env.ENV === 'PRODUCTION') {
  // determine how we connect to the remote Postgres server
  pgConnectionConfigs = {
    user: 'postgres',
    // set DB_PASSWORD as an environment variable for security.
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    database: 'birding',
    port: 5432,
  };
}
else {
  pgConnectionConfigs = {
    user: 'justin',
    host: 'localhost',
    database: 'birding',
    port: 5432, // Postgres server always runs on this port
  };
}
const pool = new Pool(pgConnectionConfigs);
// create the var we'll use
const client = new Client(pgConnectionConfigs);

// make the connection to the server
client.connect();

const app = express();
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

const whenQueryDone = (error, result) => {
  // this error is anything that goes wrong with the query
  if (error) {
    console.log('error', error);
  } else {
    // rows key has the data
    console.table(result.rows);
  }
};

const handleIndex = (request, response) => {
  console.log(`COOKIE${request.cookies.userId}`);
  const indexQuery = 'SELECT * FROM birds';
  pool.query(indexQuery, (error, result) => {
    if (error) {
      console.log('error', error);
    } else {
    // rows key has the data
      const obj = { notes: result.rows };
      console.log(obj);
      response.render('index', obj);
    }
  });
};

const handleGetForm = (request, response) => {
  pool.query('SELECT * FROM species', (error, result) => {
    if (error) {
      throw error;
    }
    const speciesList = result.rows;
    pool.query('SELECT * FROM behaviour', (error2, result) => {
      if (error2) {
        throw error2;
      }
      const data = {
        species: speciesList,
        behaviour: result.rows,
      };
      response.render('form', data);
    });
  });
};

const handlePostForm = (request, response) => {
  const formQuery = 'INSERT INTO birds (habitat, date, appearance, behaviour, vocalisations, flock_size, species, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7, $8) RETURNING *;';
  const formRawData = request.body;
  // console.log(request.body.behaviourChecklist);
  const formData = [formRawData.habitat, formRawData.date_time, formRawData.appearance,
    formRawData.behaviour, formRawData.vocalisations,
    Number(formRawData.flock_size), formRawData.species,
    request.cookies.userId];
  pool.query(formQuery, formData, (error, result) => {
    if (error) { throw error; }
    const birdID = result.rows[0].id;
    const behavioursID = request.body.behaviourChecklist.slice();
    const secondFormQuery = 'INSERT INTO bird_behaviours (bird_id, behaviour_id) VALUES ($1,$2)';
    behavioursID.forEach((behaviourID, index) => {
      pool.query(secondFormQuery, [birdID, behaviourID], (error2, result2) => {
        if (error2) { throw error2; }
      });
    });
  });
  response.redirect('/index');
};

const handleGetNote = (request, response) => {
  const { index } = request.params;
  const formQuery = `SELECT * FROM birds WHERE id = ${index}`;
  pool.query(formQuery, (error, result) => {
    if (error) {
      console.log('error', error);
    } else {
    // rows key has the data
      const obj = result.rows[0];
      console.log(request.params);
      response.render('note', obj);
    }
  });
};

// find a way to combine this with above
const handleEditNote = (request, response) => {
  const { index } = request.params;
  console.log(index);
  const formQuery = `SELECT * FROM birds WHERE id = ${index}`;
  pool.query(formQuery, (error, result) => {
    if (error) {
      console.log('error', error);
    } else {
    // rows key has the data
      const obj = result.rows[0];
      response.render('edit', obj);
    }
  });
};

const handleEditPut = (request, response) => {
  const { index } = request.params;
  console.log(index);
  const formRawData = request.body;
  console.log(request.body);
  const formQuery = `UPDATE birds SET habitat = '${formRawData.habitat}', date = '${formRawData.date_time}', appearance = '${formRawData.appearance}', behaviour = '${formRawData.behaviour}', vocalisations = '${formRawData.vocalisations}', flock_size = '${formRawData.flock_size}' WHERE id = '${index}'`;
  pool.query(formQuery, whenQueryDone);
  response.redirect(`/note/${index}`);
};

const handleDeleteNote = (request, response) => {
  const { index } = request.params;
  const formQuery = `DELETE FROM birds WHERE id = ${index}`;
  pool.query(formQuery, whenQueryDone);
  response.redirect('/index');
};

const handleGetUserNotes = (request, response) => {
  const { id } = request.params;
  console.log(`id ${id}`);
  const userQuery = `SELECT * FROM birds WHERE created_by = ${id}`;
  pool.query(userQuery, (error, result) => {
    if (error) {
      console.log('error', error);
    } else {
    // rows key has the data
      const obj = { notes: result.rows };
      console.log(obj);
      response.render('users', obj);
    }
  });
};

const handleGetSpeciesForm = (request, response) => {
  pool.query('SELECT * FROM species', (error, result) => {
    const data = {
      species: result.rows,
    };
    response.render('speciesForm', data);
  });
};

const handlePostSpecies = (request, response) => {
  const formQuery = 'INSERT INTO species (name, scientific_name) VALUES ($1,$2);';
  const formRawData = request.body;
  const formData = [formRawData.species, formRawData.scientific_name];
  console.log(formRawData.species);
  console.log(formRawData.scientific_name);
  pool.query(formQuery, formData, whenQueryDone);
  response.redirect('/index');
};
const handleGetBehaviours = (request, response) => {
  const indexQuery = 'SELECT * FROM behaviour';
  pool.query(indexQuery, (error, result) => {
    if (error) {
      console.log('error', error);
    } else {
    // rows key has the data
      const obj = { behaviours: result.rows };
      console.log(obj);
      response.render('behaviours', obj);
    }
  });
};

const handleGetSingleBehaviour = (request, response) => {
  const { index } = request.params;
  let sqlQuery = 'SELECT bird_behaviours.bird_id, bird_behaviours.behaviour_id, behaviour.id FROM behaviour INNER JOIN bird_behaviours ON bird_behaviours.behaviour_id = behaviour.id WHERE behaviour.id = $1';
  const behaviourID = [Number(index)];
  pool.query(sqlQuery, behaviourID, (error, result) => {
    if (error) { throw error; }
    const birdIDResults = result.rows;
    sqlQuery = 'SELECT species FROM birds WHERE id = $1';
    const birdNameResults = [];
    birdIDResults.forEach((birdObj) => {
      pool.query(sqlQuery, [birdObj.bird_id], (error2, result2) => {
        if (error2) { throw error2; }
        birdNameResults.push(result2.rows[0].species);
        if (birdNameResults.length === birdIDResults.length) {
          const data = { birdIDResults, birdNameResults };
          response.render('single-behaviour', data);
        }
      });
    });
  });
};

app.get('/note', handleGetForm);
app.post('/note', handlePostForm);
app.get('/', handleIndex);
app.get('/index', handleIndex);
app.get('/note/:index', handleGetNote);
app.get('/note/:index/edit', handleEditNote);
app.put('/note/:index/edit', handleEditPut);
app.delete('/note/:index', handleDeleteNote);
app.get('/users/:id', handleGetUserNotes);
app.get('/species', handleGetSpeciesForm);
app.post('/species', handlePostSpecies);
app.get('/behaviours', handleGetBehaviours);
app.get('/behaviours/:index', handleGetSingleBehaviour);

app.get('/signup', (request, response) => {
  response.render('signup');
});

// COOKIES N STUFF
app.post('/signup', (request, response) => {
  const values = [request.body.email];
  // check if user email has already been entered into DB
  pool.query('SELECT * FROM users WHERE email = $1', values, (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      response.status(503).send('error');
      return;
    }
    // if result.rows.length is not 0, then the email already exists
    if (result.rows.length !== 0) {
      response.status(403).send('sorry!');
      return;
    }
    const signupQuery = `INSERT INTO users (email, password) VALUES ('${request.body.email}', '${request.body.password}')`;
    pool.query(signupQuery, (error, result) => {
      if (error) {
        console.log('Error executing query', error.stack);
        response.status(503).send(result.rows);
        return;
      }
      console.log('User signed up successfully');
      response.redirect('index');
    });
  });
});

app.get('/login', (request, response) => {
  response.render('login');
});
app.post('/login', (request, response) => {
  console.log('request came in');

  const values = [request.body.email];

  pool.query('SELECT * FROM users WHERE email=$1', values, (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      response.status(503).send(result.rows);
      return;
    }

    if (result.rows.length === 0) {
      // we didnt find a user with that email.
      // the error for password and user are the same.
      // don't tell the user which error they got for security reasons,
      //  otherwise people can guess if a person is a user of a given service.
      response.status(403).send('sorry!');
      return;
    }

    const user = result.rows[0];

    if (user.password === request.body.password) {
      response.cookie('loggedIn', true);
      response.cookie('userId', user.id);
      response.send('logged in!');
    } else {
      // password didn't match
      response.status(403).send('sorry!');
    }
  });
});
app.delete('/logout', (request, response) => {
  if (request.cookies.loggedIn === undefined) {
    console.log('user was not logged in');
    response.status(403).send('You need to log in first!');
    return;
  }
  response.clearCookie('loggedIn');
  response.redirect('/index');
});
app.listen(PORT);

// CREATE TABLE birds (id SERIAL PRIMARY KEY, habitat TEXT, date TEXT, appearance TEXT, behaviour TEXT, vocalisations TEXT, flock_size INTEGER, created_by INTEGER, species TEXT)
