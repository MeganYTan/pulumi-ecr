'use strict';

const express = require('express');

// Constants
const PORT = process.env.PORT || 80;
const HOST = '0.0.0.0';
const HELLO_NAME = process.env.HELLO_NAME || "World";
console.log("Environment Variables:", process.env);

// App
const app = express();
app.get('/', (req, res) => {
    res.send(`Hello, ${HELLO_NAME}`);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);