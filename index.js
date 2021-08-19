/* eslint-disable no-unused-vars */
import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';

const { Client } = pg;

const { Pool } = pg;
// set the way we will connect to the server
const pgConnectionConfigs = {
  user: 'justin',
  host: 'localhost',
  database: 'birding',
  port: 5432, // Postgres server always runs on this port
};
const pool = new Pool(pgConnectionConfigs);
// create the var we'll use
const client = new Client(pgConnectionConfigs);

// make the connection to the server
client.connect();

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
const PORT = 3004;

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
  response.render('form');
};

const handlePostForm = (request, response) => {
  const formQuery = 'INSERT INTO birds (habitat, date, appearance, behaviour, vocalisations, flock_size) VALUES ($1,$2,$3,$4,$5,$6);';
  const formRawData = request.body;
  const formData = [formRawData.habitat, formRawData.date_time, formRawData.appearance,
    formRawData.behaviour, formRawData.vocalisations, Number(formRawData.flock_size)];
  pool.query(formQuery, formData, whenQueryDone);
  // response.redirect(`/notes/${index}`)
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

app.get('/note', handleGetForm);
app.post('/note', handlePostForm);
app.get('/', handleIndex);
app.get('/note/:index', handleGetNote);
app.get('/note/:index/edit', handleEditNote);
app.put('/note/:index/edit', (request, response) => {
  const { index } = request.params;
  console.log(index);
  const formRawData = request.body;
  console.log(request.body);
  const formQuery = `UPDATE birds SET habitat = '${formRawData.habitat}', date = '${formRawData.date_time}', appearance = '${formRawData.appearance}', behaviour = '${formRawData.behaviour}', vocalisations = '${formRawData.vocalisations}', flock_size = '${formRawData.flock_size}' WHERE id = '${index}'`;
  pool.query(formQuery, whenQueryDone);
  response.redirect(`/note/${index}`);
});
app.listen(PORT);

// CREATE TABLE birds (id SERIAL PRIMARY KEY, habitat TEXT, date TEXT, appearance TEXT, behaviour TEXT, vocalisations TEXT, flock_size INTEGER);
