// backend/server.js
require('dotenv').config();
const express = require('express');
const cors =require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('../public')); // Serve frontend files

// --- Gemini AI Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Helper function to parse Gemini's JSON response ---
async function generateAndParse(prompt) {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(responseText);
}

// --- The ONLY Endpoint to Generate All Questions ---
app.get('/api/generate-all-questions', async (req, res) => {
    console.log("Generating a new set of questions...");
    try {
        const [q1, q2, q3, q4, q5, q6] = await Promise.all([
            // Question 1: Paragraph Matching
            generateAndParse(`
                Generate a question set for a 'paragraph matching' task.
                1. Create a 5-paragraph essay on an interesting academic topic (e.g., ancient history, biology, astronomy).
                2. Create 3 distinct "information sentences" that are each found within one of the paragraphs.
                3. The final output must be a single JSON object with this exact structure:
                {
                  "type": "paragraph-matching",
                  "essay": { "A": "Paragraph content...", "B": "...", "C": "...", "D": "...", "E": "..." },
                  "questions": ["Information sentence 1", "Information sentence 2", "Information sentence 3"],
                  "correctAnswers": ["Correct paragraph letter for info 1", "Correct letter for info 2", "Correct letter for info 3"]
                }
            `),

            // Question 2: Multiple Choice
            generateAndParse(`
                Generate a 'multiple-choice' comprehension question set.
                1. Create a 5-paragraph essay on a topic related to technology or social science.
                2. Create 3 distinct multiple-choice questions about the essay. Each question must have 3 options.
                3. The final output must be a single JSON object with this exact structure:
                {
                  "type": "multiple-choice",
                  "essay": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
                  "questions": [
                    { "q": "Question 1 text?", "options": ["Option A", "Option B", "Correct Option C"], "correctAnswer": "Correct Option C" },
                    { "q": "Question 2 text?", "options": ["Option X", "Correct Option Y", "Option Z"], "correctAnswer": "Correct Option Y" },
                    { "q": "Question 3 text?", "options": ["Correct Option 1", "Option 2", "Option 3"], "correctAnswer": "Correct Option 1" }
                  ]
                }
            `),

            // Question 3: Fill in the Blank
            generateAndParse(`
                Generate a 'fill-in-the-blank' question set.
                1. Write a 5-paragraph essay on a specific historical event.
                2. In each paragraph, remove one key sentence and replace it with "[_BLANK_]".
                3. Provide the 5 correct sentences that were removed.
                4. The final output must be a single JSON object with this exact structure:
                {
                  "type": "fill-in-the-blank",
                  "essay": { "A": "Text with a [_BLANK_]...", "B": "...", "C": "...", "D": "...", "E": "..." },
                  "options": ["Correct sentence for blank in A", "Correct sentence for B", "Correct for C", "Correct for D", "Correct for E"]
                }
            `),

            // Question 4: Spoken Answer
            generateAndParse(`
                Generate a 'spoken-answer' question.
                1. Create one open-ended question that prompts a user to explain a simple, common-knowledge concept. The question should encourage a 45-second explanation.
                2. The final output must be a single JSON object with this exact structure:
                {
                  "type": "spoken-answer",
                  "question": "The generated question text."
                }
            `),

            // Question 5: Dialogue Comprehension (TTS)
            generateAndParse(`
                Generate a two-part dialogue comprehension question set for TTS.
                1. Pick a topic for a dialogue between two people, Sarah (female) and David (male).
                2. Write a 'dialoguePart1' (4-6 lines) and a 'dialoguePart2' (4-6 lines) that continues the story.
                3. For each part, create 3 multiple-choice questions based on the dialogue.
                4. The final output must be a single JSON object with this exact structure:
                {
                  "type": "dialogue-comprehension",
                  "topic": "The topic of the dialogue",
                  "speakers": ["Sarah", "David"],
                  "dialoguePart1": [{"speaker": "Sarah", "line": "..."}],
                  "questionsPart1": [{"q": "?", "options": [], "correctAnswer": "..."}],
                  "dialoguePart2": [{"speaker": "David", "line": "..."}],
                  "questionsPart2": [{"q": "?", "options": [], "correctAnswer": "..."}]
                }
            `),
            
            // Question 6: Speaker Matching
            generateAndParse(`
                Generate a 'speaker-matching' question set.
                1. Topic: Four people (Alex, Brenda, Carlos, Dana) discuss a common workplace issue (e.g., hybrid work, team meetings). Give each a clear role or opinion.
                2. Write a short monologue (2-3 sentences) for each of the four speakers.
                3. Create 4 "key sentences", each summarizing a point made by one of the speakers.
                4. The final output must be a single JSON object with this exact structure:
                {
                  "type": "speaker-matching",
                  "topic": "The discussion topic.",
                  "speakers": ["Alex (Role)", "Brenda (Role)", "Carlos (Role)", "Dana (Role)"],
                  "monologues": { "Alex (Role)": "Monologue...", "Brenda (Role)": "..." },
                  "questions": [
                    { "keySentence": "A key sentence from one speaker.", "correctSpeaker": "The name of the speaker who said it." }
                  ]
                }
            `)
        ]);

        res.json({
            paragraphMatching: q1,
            multipleChoice: q2,
            fillInTheBlank: q3,
            spokenAnswer: q4,
            dialogueComprehension: q5,
            speakerMatching: q6
        });
        console.log("Successfully generated and sent all questions.");

    } catch (error) {
        console.error("Error generating questions from AI:", error);
        res.status(500).json({ error: "Failed to generate questions. The AI may be busy or an error occurred." });
    }
});


// --- SIMPLIFIED Evaluation Endpoint ---
// This endpoint no longer needs AI. It just compares the user's answers to the correct answers.
app.post('/evaluate', (req, res) => {
    const { userAnswers, correctAnswers } = req.body;

    if (!userAnswers || !correctAnswers || userAnswers.length !== correctAnswers.length) {
        return res.status(400).json({ error: "Invalid evaluation request. Answer data is missing or mismatched." });
    }

    const results = userAnswers.map((answer, i) => ({
        isCorrect: answer.toLowerCase() === correctAnswers[i].toLowerCase() ? 'correct' : 'incorrect',
        correctAnswer: correctAnswers[i]
    }));

    res.json({ results });
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
