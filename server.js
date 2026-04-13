const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// In-memory quiz storage
const quizzes = [];
let nextQuizId = 1;

// --- Helper: Validate a single question object ---
function validateQuestion(question, index) {
    const errors = [];
    const prefix = `questions[${index}]`;

    if (!question.text || typeof question.text !== 'string' || question.text.trim().length === 0) {
        errors.push(`${prefix}.text is required and must be a non-empty string`);
    }

    if (!Array.isArray(question.choices)) {
        errors.push(`${prefix}.choices is required and must be an array`);
    } else if (question.choices.length < 2) {
        errors.push(`${prefix}.choices must contain at least 2 options`);
    } else {
        question.choices.forEach((choice, i) => {
            if (typeof choice !== 'string' || choice.trim().length === 0) {
                errors.push(`${prefix}.choices[${i}] must be a non-empty string`);
            }
        });
    }

    if (question.correctIndex === undefined || question.correctIndex === null) {
        errors.push(`${prefix}.correctIndex is required`);
    } else if (typeof question.correctIndex !== 'number' || !Number.isInteger(question.correctIndex)) {
        errors.push(`${prefix}.correctIndex must be an integer`);
    } else if (Array.isArray(question.choices) && (question.correctIndex < 0 || question.correctIndex >= question.choices.length)) {
        errors.push(`${prefix}.correctIndex must be between 0 and ${question.choices.length - 1}`);
    }

    return errors;
}

// --- Routes ---

// GET / - Welcome
app.get('/', (req, res) => {
    res.send('Welcome to the Quiz Generator!');
});

// POST /api/quizzes - Create a new quiz
app.post('/api/quizzes', (req, res) => {
    const { title, questions } = req.body;

    const errors = [];

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
    }

    if (!questions || !Array.isArray(questions)) {
        errors.push('questions is required and must be an array');
    } else if (questions.length === 0) {
        errors.push('questions must contain at least one question');
    } else {
        questions.forEach((question, index) => {
            const questionErrors = validateQuestion(question, index);
            errors.push(...questionErrors);
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const quiz = {
        id: nextQuizId++,
        title: title.trim(),
        questions: questions.map(q => ({
            text: q.text.trim(),
            choices: q.choices.map(c => c.trim()),
            correctIndex: q.correctIndex
        })),
        createdAt: new Date().toISOString()
    };

    quizzes.push(quiz);
    res.status(201).json(quiz);
});

// GET /api/quizzes - List all quizzes
app.get('/api/quizzes', (req, res) => {
    res.json(quizzes);
});

// GET /api/quizzes/:id - Get a single quiz by ID
app.get('/api/quizzes/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid quiz ID. Must be a number.' });
    }

    const quiz = quizzes.find(q => q.id === id);

    if (!quiz) {
        return res.status(404).json({ error: `Quiz with ID ${id} not found` });
    }

    res.json(quiz);
});

// PUT /api/quizzes/:id - Update a quiz
app.put('/api/quizzes/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid quiz ID. Must be a number.' });
    }

    const quizIndex = quizzes.findIndex(q => q.id === id);

    if (quizIndex === -1) {
        return res.status(404).json({ error: `Quiz with ID ${id} not found` });
    }

    const { title, questions } = req.body;
    const errors = [];

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
    }

    if (!questions || !Array.isArray(questions)) {
        errors.push('questions is required and must be an array');
    } else if (questions.length === 0) {
        errors.push('questions must contain at least one question');
    } else {
        questions.forEach((question, index) => {
            const questionErrors = validateQuestion(question, index);
            errors.push(...questionErrors);
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    quizzes[quizIndex] = {
        ...quizzes[quizIndex],
        title: title.trim(),
        questions: questions.map(q => ({
            text: q.text.trim(),
            choices: q.choices.map(c => c.trim()),
            correctIndex: q.correctIndex
        })),
        updatedAt: new Date().toISOString()
    };

    res.json(quizzes[quizIndex]);
});

// DELETE /api/quizzes/:id - Delete a quiz
app.delete('/api/quizzes/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid quiz ID. Must be a number.' });
    }

    const quizIndex = quizzes.findIndex(q => q.id === id);

    if (quizIndex === -1) {
        return res.status(404).json({ error: `Quiz with ID ${id} not found` });
    }

    quizzes.splice(quizIndex, 1);
    res.status(204).send();
});

// POST /api/quizzes/:id/submit - Submit quiz answers
app.post('/api/quizzes/:id/submit', (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid quiz ID. Must be a number.' });
    }

    const quiz = quizzes.find(q => q.id === id);

    if (!quiz) {
        return res.status(404).json({ error: `Quiz with ID ${id} not found` });
    }

    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'answers is required and must be an array' });
    }

    if (answers.length !== quiz.questions.length) {
        return res.status(400).json({
            error: `answers array length (${answers.length}) must match the number of questions (${quiz.questions.length})`
        });
    }

    for (let i = 0; i < answers.length; i++) {
        if (typeof answers[i] !== 'number' || !Number.isInteger(answers[i])) {
            return res.status(400).json({
                error: `answers[${i}] must be an integer`
            });
        }
        if (answers[i] < 0 || answers[i] >= quiz.questions[i].choices.length) {
            return res.status(400).json({
                error: `answers[${i}] must be between 0 and ${quiz.questions[i].choices.length - 1}`
            });
        }
    }

    let score = 0;
    const results = quiz.questions.map((question, index) => {
        const correct = question.correctIndex === answers[index];
        if (correct) score++;
        return {
            question: question.text,
            yourAnswer: question.choices[answers[index]],
            correctAnswer: question.choices[question.correctIndex],
            correct
        };
    });

    res.json({
        quizId: quiz.id,
        title: quiz.title,
        score,
        totalQuestions: quiz.questions.length,
        percentage: Math.round((score / quiz.questions.length) * 100),
        results
    });
});

// --- 404 handler for unknown routes ---
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// --- Global error handling middleware ---
app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
