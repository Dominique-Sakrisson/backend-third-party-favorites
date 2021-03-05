const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const morgan = require('morgan');
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');
const request = require('superagent');


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev')); // http logging

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

app.get('/quotes', async(req, res) => {
  try {
    // const data = await client.query('SELECT * FROM favorites WHERE owner_id=$1', [req.userId]);
    const data = await request.get('https://the-one-api.dev/v2/quote')
      .set('Authorization', `Bearer ${process.env.LOTR_API_KEY}`);
    
    res.json(data.body);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/character', async(req, res) => {
  try {
    // const characterName = req.params.character;
    // const data = await client.query('SELECT * FROM favorites WHERE owner_id=$1', [req.userId]);
    
    const data = await request.get('https://the-one-api.dev/v2/character')
      .set('Authorization', `Bearer ${process.env.LOTR_API_KEY}`);
    
    res.json(data.body.docs);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/character/:name', async(req, res) => {
  try {
    
    const name = req.params.name;

    const getQuotes = req.query.quote;

   
    const data = await request.get(`https://the-one-api.dev/v2/character?name=${name}`)
      .set('Authorization', `Bearer ${process.env.LOTR_API_KEY}`);

    const [character] = data.body.docs;
    
    if(getQuotes){
      const quotes = await request.get(`https://the-one-api.dev/v2/character/${character._id}/quote`).set('Authorization', `Bearer ${process.env.LOTR_API_KEY}`);
      character.quotes = quotes.body.docs;

    }
    
    res.json(character);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/character/:_id/quotes', async(req, res) => {
  try {

    const character = req.params._id;
    // const data = await client.query('SELECT * FROM favorites WHERE owner_id=$1', [req.userId]);
    const data = await request.get(`https://the-one-api.dev/v2/character/name=${character}`)
      .set('Authorization', `Bearer ${process.env.LOTR_API_KEY}`);
    
    res.json(data.body.docs);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/favorites', async(req, res) => {
  try {
    const data = await client.query('SELECT * FROM favorites WHERE owner_id=$1', [req.userId]);
    // const data = await request.get('https://the-one-api.dev/v2/quote?limit=50')
    //   .set('Authorization', `Bearer ${process.env.LOTR_API_KEY}`);
    
    res.json(data.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/favorites/', async(req, res) => {
  try {
    const {
      _db_quote_id,
      dialog,
      character,
    } = req.body;
 
    const data = await client.query(`
    INSERT INTO favorites (_db_quote_id, dialog, character, owner_id)
    VALUES ($1, $2, $3, $4) RETURNING *;
`,
    [_db_quote_id, dialog, character, req.userId]);
    console.log(data.rows);
    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/favorites/:id', async(req, res) => {
  try {
    const data = await client.query('DELETE from favorites WHERE owner_id=$1 AND id=$2', [req.userId, req.params.id]);
    
    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});



app.use(require('./middleware/error'));

module.exports = app;
