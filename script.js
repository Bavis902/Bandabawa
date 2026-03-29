// Quiz Generator Functionality

class QuizGenerator {
    constructor(questions) {
        this.questions = questions;
        this.score = 0;
        this.currentQuestionIndex = 0;
    }
    // Method to start the quiz
    start() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.nextQuestion();
    }
    // Method to show the next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length) {
            const question = this.questions[this.currentQuestionIndex];
            this.displayQuestion(question);
        } else {
            this.displayScore();
        }
    }
    // Method to display a single question
    displayQuestion(question) {
        console.log(`Question ${this.currentQuestionIndex + 1}: ${question.text}`);
        question.choices.forEach((choice, index) => {
            console.log(`${index + 1}: ${choice}`);
        });
    }
    // Method to answer a question
    answerQuestion(choice) {
        const question = this.questions[this.currentQuestionIndex];
        if (question.correctIndex === choice - 1) {
            this.score++;
            console.log('Correct!');
        } else {
            console.log('Wrong!');
        }
        this.currentQuestionIndex++;
        this.nextQuestion();
    }
    // Method to display final score
    displayScore() {
        console.log(`Your final score is ${this.score} out of ${this.questions.length}`);
    }
}

// Example usage
const questions = [
    {
        text: 'What is the capital of France?',
        choices: ['Berlin', 'Madrid', 'Paris', 'Rome'],
        correctIndex: 2
    },
    {
        text: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correctIndex: 1
    }
];

const quiz = new QuizGenerator(questions);
quiz.start();
// To answer a question use quiz.answerQuestion(choice);
