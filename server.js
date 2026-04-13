const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// CORS — restrict to known origins; update the allowlist as needed
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [`http://localhost:${port}`];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
}));

// Rate limiting — prevent brute-force / DoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to the Quiz Generator!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
