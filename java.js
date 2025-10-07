const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

// Initialize Express App
const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (CSS, Images)

// Set up SQLite Database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    // Create Tables
    db.run(`
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            image_url TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    // Insert Sample Products
    db.run(`INSERT INTO products (name, description, price, image_url) VALUES
        ('Smart Watch', 'Feature-rich smart watch', 399.99, 'https://via.placeholder.com/150'),
        ('Neckband', 'Comfortable neckband with clear sound', 150.50, 'https://via.placeholder.com/150'),
        ('Sneakers', 'Trendy sneakers for all-day wear', 200.00, 'https://via.placeholder.com/150'),
        ('Earpods', 'Wireless earpods with great sound', 399.00, 'https://via.placeholder.com/150')
    `);
});

// Serve HTML Page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Commerce App</title>
    <style>
        /* Your CSS here */
        body { font-family: Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
        nav { background: #292828; padding: 10px; text-align: center; }
        nav a { color: white; text-decoration: none; margin: 0 10px; }
        .product-list { display: flex; flex-wrap: wrap; justify-content: space-around; margin: 20px; }
        .product { background: white; padding: 20px; margin: 10px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .product img { max-width: 100%; }
        .order-form { display: none; padding: 20px; background: white; max-width: 400px; margin: 20px auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px; }
    </style>
</head>
<body>
    <nav>
        <a href="/">Home</a>
    </nav>
    <div class="product-list" id="product-list"></div>
    <div class="order-form" id="order-form">
        <h2>Place Your Order</h2>
        <form id="orderForm">
            <input type="hidden" id="productId">
            <label>Name: <input type="text" id="customerName" required></label><br><br>
            <label>Email: <input type="email" id="customerEmail" required></label><br><br>
            <label>Phone: <input type="text" id="customerPhone" required></label><br><br>
            <label>Address: <textarea id="customerAddress" required></textarea></label><br><br>
            <button type="submit">Submit Order</button>
        </form>
    </div>
    <script>
        fetch('/products')
            .then(res => res.json())
            .then(data => {
                const productList = document.getElementById('product-list');
                data.forEach(product => {
                    const productDiv = document.createElement('div');
                    productDiv.className = 'product';
                    productDiv.innerHTML = \`
                        <img src="\${product.image_url}" alt="\${product.name}">
                        <h3>\${product.name}</h3>
                        <p>\${product.description}</p>
                        <p>Price: $\${product.price}</p>
                        <button onclick="showOrderForm(\${product.id})">Buy Now</button>
                    \`;
                    productList.appendChild(productDiv);
                });
            });

        function showOrderForm(productId) {
            document.getElementById('productId').value = productId;
            document.getElementById('order-form').style.display = 'block';
        }

        document.getElementById('orderForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const order = {
                product_id: document.getElementById('productId').value,
                name: document.getElementById('customerName').value,
                email: document.getElementById('customerEmail').value,
                phone: document.getElementById('customerPhone').value,
                address: document.getElementById('customerAddress').value,
                quantity: 1
            };
            fetch('/place-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            })
            .then(res => res.json())
            .then(data => alert(data.message));
        });
    </script>
</body>
</html>
    `);
});

// API: Fetch Products
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', (err, rows) => {
        if (err) throw err;
        res.json(rows);
    });
});

// API: Place Order
app.post('/place-order', (req, res) => {
    const { name, email, phone, address, product_id, quantity } = req.body;

    db.run(
        `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
        [name, email, phone, address],
        function(err) {
            if (err) throw err;
            const customerId = this.lastID;
            db.run(
                `INSERT INTO orders (customer_id, product_id, quantity) VALUES (?, ?, ?)`,
                [customerId, product_id, quantity],
                function(err) {
                    if (err) throw err;
                    res.json({ message: 'Order placed successfully!' });
                }
            );
        }
    );
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
