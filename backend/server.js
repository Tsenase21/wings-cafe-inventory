// Increase the max listeners if needed to prevent warnings
require('events').EventEmitter.defaultMaxListeners = 20;

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // For password hashing

const app = express();
const port = 5000;

// Enable CORS for all requests
app.use(cors());
// Parse incoming JSON requests
app.use(bodyParser.json());

// Create the MySQL connection using environment variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// User Registration
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    // Check if the username already exists
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }

        // Hash the password
        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            db.query(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                (err, results) => {
                    if (err) {
                        console.error('Error inserting user:', err);
                        return res.status(500).json({ success: false, message: 'Error registering user.' });
                    }
                    res.status(201).json({ success: true, message: 'User registered successfully.' });
                }
            );
        } catch (err) {
            console.error('Error hashing password:', err);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });
});

// User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid username or password.' });
        }

        const user = results[0];

        try {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(400).json({ success: false, message: 'Invalid username or password.' });
            }

            res.status(200).json({ success: true, message: 'Login successful.', user: { id: user.id, username: user.username } });
        } catch (err) {
            console.error('Error comparing passwords:', err);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });
});

// Product Operations

// Get all products
app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Error fetching products' });
        }
        res.json(results);
    });
});

// Add a new product
app.post('/products', (req, res) => {
    const { name, description, category, price, quantity } = req.body;

    if (!name || !description || !category || price == null || quantity == null) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.query(
        'INSERT INTO products (name, description, category, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [name, description, category, price, quantity],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Error adding product' });
            }
            res.status(201).json({ id: results.insertId, name, description, category, price, quantity });
        }
    );
});

// Update a product by ID
// Update a product by ID
app.put('/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, category, price, quantity } = req.body;

    // Validation: Ensure all fields are provided
    if (!name || !description || !category || price == null || quantity == null) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Query to update the product
    db.query(
        'UPDATE products SET name = ?, description = ?, category = ?, price = ?, quantity = ? WHERE id = ?',
        [name, description, category, price, quantity, id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Error updating product.' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Product not found.' });
            }

            res.json({
                id,
                name,
                description,
                category,
                price,
                quantity,
                message: 'Product updated successfully.'
            });
        }
    );
});


// Delete a product by ID
app.delete('/products/:id', (req, res) => {
    const { id } = req.params;

    // Query to delete the product
    db.query('DELETE FROM products WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Error deleting product.' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json({ message: 'Product deleted successfully.' });
    });
});



// Fetch all users
app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });
  
  // Add a new user
  app.post('/users', (req, res) => {
    const { username, password } = req.body;
    
    // Hash the password before saving
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ error: 'Password hashing error' });
      }
  
      db.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        (err, results) => {
          if (err) {
            console.error('Error adding user:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          const newUser = { id: results.insertId, username, created_at: new Date() };
          res.status(201).json(newUser);
        }
      );
    });
  });
  
  // Update an existing user
  app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
  
    // If password is being updated, hash it
    const updatePassword = password ? bcrypt.hashSync(password, 10) : null;
  
    const query = 'UPDATE users SET username = ?, password = ? WHERE id = ?';
    db.query(query, [username, updatePassword || '', id], (err, results) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
  
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json({ id, username });
    });
  });
  
  // Delete a user
  app.delete('/users/:id', (req, res) => {
    const { id } = req.params;
  
    db.query('DELETE FROM users WHERE id = ?', [id], (err, results) => {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
  
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json({ message: 'User deleted successfully' });
    });
  });
  

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
