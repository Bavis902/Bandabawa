const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// In-memory quiz storage (simulates a database)
const quizzes = [];

// ─── Middleware ─────────────────────────────────────────────

// Enable CORS
app.use(cors());

// Parse JSON bodies with error handling for malformed JSON
app.use((req, res, next) => {
    express.json()(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid JSON in request body.',
            });
        }
        next();
    });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ─── Routes ────────────────────────────────────────────────

// Home route
app.get('/', (req, res) => {
    res.send('Welcome to the Quiz Generator!');
});

// GET /api/quizzes - Retrieve all quizzes
app.get('/api/quizzes', (req, res, next) => {
    try {
        res.json({ quizzes });
    } catch (err) {
        next(err);
    }
});

// GET /api/quizzes/:id - Retrieve a quiz by ID
app.get('/api/quizzes/:id', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Quiz ID must be a non-negative integer.',
            });
        }

        const quiz = quizzes.find((q) => q.id === id);
        if (!quiz) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Quiz with ID ${id} not found.`,
            });
        }

        res.json({ quiz });
    } catch (err) {
        next(err);
    }
});

// POST /api/quizzes - Create a new quiz
app.post('/api/quizzes', (req, res, next) => {
    try {
        const { title, questions } = req.body;

        // Validate required fields
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'A non-empty "title" string is required.',
            });
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: '"questions" must be a non-empty array.',
            });
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: `Question at index ${i} must have a non-empty "text" string.`,
                });
            }

            if (!Array.isArray(q.choices) || q.choices.length < 2) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: `Question at index ${i} must have a "choices" array with at least 2 options.`,
                });
            }

            if (
                typeof q.correctIndex !== 'number' ||
                !Number.isInteger(q.correctIndex) ||
                q.correctIndex < 0 ||
                q.correctIndex >= q.choices.length
            ) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: `Question at index ${i} must have a valid "correctIndex" (integer between 0 and ${q.choices.length - 1}).`,
                });
            }
        }

        const newQuiz = {
            id: quizzes.length,
            title: title.trim(),
            questions,
            createdAt: new Date().toISOString(),
        };

        quizzes.push(newQuiz);

        res.status(201).json({ quiz: newQuiz });
    } catch (err) {
        next(err);
    }
});

// POST /api/quizzes/:id/submit - Submit answers for a quiz
app.post('/api/quizzes/:id/submit', (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Quiz ID must be a non-negative integer.',
            });
        }

        const quiz = quizzes.find((q) => q.id === id);
        if (!quiz) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Quiz with ID ${id} not found.`,
            });
        }

        const { answers } = req.body;

        if (!Array.isArray(answers)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: '"answers" must be an array.',
            });
        }

        if (answers.length !== quiz.questions.length) {
            return res.status(400).json({
                error: 'Bad Request',
                message: `Expected ${quiz.questions.length} answers but received ${answers.length}.`,
            });
        }

        // Validate and score answers
        let score = 0;
        const results = quiz.questions.map((question, index) => {
            const answer = answers[index];

            if (typeof answer !== 'number' || !Number.isInteger(answer)) {
                return { question: question.text, valid: false, error: `Answer at index ${index} must be an integer.` };
            }

            if (answer < 0 || answer >= question.choices.length) {
                return {
                    question: question.text,
                    valid: false,
                    error: `Answer at index ${index} must be between 0 and ${question.choices.length - 1}.`,
                };
            }

            const correct = answer === question.correctIndex;
            if (correct) score++;

            return { question: question.text, selectedAnswer: answer, correct };
        });

        const invalidAnswer = results.find((r) => r.valid === false);
        if (invalidAnswer) {
            return res.status(400).json({
                error: 'Bad Request',
                message: invalidAnswer.error,
            });
        }

        res.json({
            quizId: id,
            score,
            total: quiz.questions.length,
            results,
        });
    } catch (err) {
        next(err);
    }
});

// ─── 404 Handler ───────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `The route ${req.method} ${req.originalUrl} does not exist.`,
    });
});

// ─── Global Error Handler ──────────────────────────────────

app.use((err, req, res, _next) => {
    console.error(`${new Date().toISOString()} - Error: ${err.message}`);
    console.error(err.stack);

    // Handle specific error types
    if (err.name === 'MongoNetworkError' || err.name === 'MongoServerError') {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database connection error. Please try again later.',
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Payload Too Large',
            message: 'Request body exceeds the allowed size limit.',
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
        });
    }

    // Default to 500 Internal Server Error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
        message:
            statusCode === 500
                ? 'An unexpected error occurred. Please try again later.'
                : err.message,
    });
});

// ─── Start Server ──────────────────────────────────────────

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
