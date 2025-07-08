require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from our frontend
app.use(express.json()); // Parse JSON bodies
app.use(express.static('../public')); // Serve static files from the 'public' directory

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- API Endpoint for Evaluation ---
app.post('/evaluate', async (req, res) => {
    const { questionType, context, questions, userAnswers } = req.body;

    let prompt;

    try {
        switch (questionType) {
            case 'paragraph-matching':
                prompt = `
                    Context Essay:
                    Paragraph A: ${context.A}
                    Paragraph B: ${context.B}
                    Paragraph C: ${context.C}
                    Paragraph D: ${context.D}
                    Paragraph E: ${context.E}

                    Task: The user was asked which paragraph contains the specific information below.
                    Evaluate if the user's answers are correct.

                    Information 1: "${questions[0]}"
                    User's Answer: Paragraph ${userAnswers[0]}

                    Information 2: "${questions[1]}"
                    User's Answer: Paragraph ${userAnswers[1]}

                    Information 3: "${questions[2]}"
                    User's Answer: Paragraph ${userAnswers[2]}

                    Provide your evaluation in a JSON object format. For each question, state if the user's answer is "correct" or "incorrect" and provide the "correctParagraph" letter (A, B, C, D, or E).
                    Example JSON response:
                    {
                      "results": [
                        { "isCorrect": "correct", "correctParagraph": "B" },
                        { "isCorrect": "incorrect", "correctParagraph": "D" },
                        { "isCorrect": "correct", "correctParagraph": "A" }
                      ]
                    }
                `;
                break;

            case 'multiple-choice':
                prompt = `
                    Context Essay:
                    Paragraph A: ${context.A}
                    Paragraph B: ${context.B}
                    Paragraph C: ${context.C}
                    Paragraph D: ${context.D}
                    Paragraph E: ${context.E}

                    Task: Evaluate the user's answers to the following multiple-choice questions based on the essay.

                    Question 1: ${questions[0].q}
                    Options: A) ${questions[0].options[0]}, B) ${questions[0].options[1]}, C) ${questions[0].options[2]}
                    User's Answer: ${userAnswers[0]}

                    Question 2: ${questions[1].q}
                    Options: A) ${questions[1].options[0]}, B) ${questions[1].options[1]}, C) ${questions[1].options[2]}
                    User's Answer: ${userAnswers[1]}
                    
                    Question 3: ${questions[2].q}
                    Options: A) ${questions[2].options[0]}, B) ${questions[2].options[1]}, C) ${questions[2].options[2]}
                    User's Answer: ${userAnswers[2]}

                    Provide your evaluation in a JSON object. For each question, indicate if the user's answer is "correct" or "incorrect" and provide the "correctAnswer" text.
                    Example JSON:
                     {
                       "results": [
                         { "isCorrect": "correct", "correctAnswer": "The main theme is climate change." },
                         { "isCorrect": "incorrect", "correctAnswer": "The author uses a persuasive tone." },
                         { "isCorrect": "correct", "correctAnswer": "Paragraph C." }
                       ]
                     }
                `;
                break;

             case 'fill-in-the-blank':
                prompt = `
                    Context Essay with missing sentences marked as [_BLANK_]:
                    Paragraph A: ${context.A}
                    Paragraph B: ${context.B}
                    Paragraph C: ${context.C}
                    Paragraph D: ${context.D}
                    Paragraph E: ${context.E}

                    Task: The user chose a sentence to fill each blank from a list of options. Evaluate if the chosen sentences are the best fit contextually and grammatically.

                    Blank 1 (Paragraph A): User chose "${userAnswers[0]}"
                    Blank 2 (Paragraph B): User chose "${userAnswers[1]}"
                    Blank 3 (Paragraph C): User chose "${userAnswers[2]}"
                    Blank 4 (Paragraph D): User chose "${userAnswers[3]}"
                    Blank 5 (Paragraph E): User chose "${userAnswers[4]}"

                    Provide your evaluation in a JSON object. For each blank, indicate if the user's choice is "correct" or "incorrect" and provide the "bestFitSentence" from the provided options. The options for all blanks were: ${JSON.stringify(questions.options)}.

                    Example JSON:
                    {
                      "results": [
                        { "isCorrect": "correct", "bestFitSentence": "This led to further discoveries." },
                        { "isCorrect": "incorrect", "bestFitSentence": "However, the opposite was true." }
                      ]
                    }
                `;
                break;

            case 'spoken-answer':
                 prompt = `
                    Question: "${questions[0]}"

                    User's Spoken Answer (transcribed): "${userAnswers[0]}"

                    Task: Evaluate the user's spoken answer based on the following criteria. The user was expected to speak for about 45 seconds.
                    1.  **Relevance:** How well does the answer address the question?
                    2.  **Clarity:** How clear and understandable is the explanation?
                    3.  **Completeness:** How thorough is the answer, given the time limit?

                    Provide a detailed evaluation in a JSON object. Include a score from 1 (poor) to 5 (excellent) for each criterion, and a brief "overallFeedback" text.
                    Example JSON:
                    {
                      "evaluation": {
                        "relevance": { "score": 5, "comment": "Directly answers the question." },
                        "clarity": { "score": 4, "comment": "Mostly clear, with some minor rambling." },
                        "completeness": { "score": 3, "comment": "Good start, but could have added more detail on one point." },
                        "overallFeedback": "A solid answer that directly addresses the question. To improve, try to structure your thoughts to provide a more complete picture within the time frame."
                      }
                    }
                `;
                break;

            default:
                return res.status(400).json({ error: 'Invalid question type' });
        }
        
        // Ask Gemini and get the response
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Clean up the response text to ensure it's valid JSON
        const jsonResponseText = response.text().replace('```json', '').replace('```', '').trim();
        const jsonResponse = JSON.parse(jsonResponseText);

        res.json(jsonResponse);

    } catch (error) {
        console.error('Error with Gemini API:', error);
        res.status(500).json({ error: 'Failed to evaluate answer.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});