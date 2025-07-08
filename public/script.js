document.addEventListener('DOMContentLoaded', () => {

    // --- UI Elements ---
    const loader = document.getElementById('loader');
    const newQuestionsBtn = document.getElementById('new-questions-btn'); // Get the new button

    // --- General Functions ---
    const showLoader = (show) => {
        loader.style.display = show ? 'flex' : 'none';
    };
    
    async function fetchQuestion(type) {
        try {
            const response = await fetch(`/api/question?type=${type}`);
            if (!response.ok) throw new Error(`Failed to fetch question type ${type}`);
            return await response.json();
        } catch (error) {
            console.error(error);
            const card = document.getElementById(`${type.split('-')[0]}-card`);
            if(card) card.innerHTML = `<h2>Error</h2><p>Could not load question. Please try again.</p>`;
            return null;
        }
    }
    
    const evaluate = async (payload) => {
        showLoader(true);
        try {
            const response = await fetch('/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Evaluation Error:', error);
            alert('An error occurred while evaluating. Please check the console.');
            return null;
        } finally {
            showLoader(false);
        }
    };

    // --- Question Setup Functions (with result clearing) ---

    function setupParagraphMatching(qData) {
        const q1Essay = document.getElementById('q1-essay');
        const q1Questions = document.getElementById('q1-questions');
        const q1EvalBtn = document.getElementById('q1-eval-btn');
        const q1Result = document.getElementById('q1-result');

        q1Result.innerHTML = ''; // Clear previous results
        q1Essay.innerHTML = '';
        Object.entries(qData.essay).forEach(([key, value]) => {
            q1Essay.innerHTML += `<p><strong>Paragraph ${key}:</strong> ${value}</p>`;
        });
        
        q1Questions.innerHTML = '';
        qData.questions.forEach((q, i) => {
            q1Questions.innerHTML += `<div class="question"><p><strong>${i + 1}.</strong> ...<em>"${q}"</em>?</p><select id="q1-ans-${i}"><option value="">Select...</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option></select></div>`;
        });
        
        // Use .onclick to easily replace the event listener each time
        q1EvalBtn.onclick = async () => {
            const userAnswers = [ document.getElementById('q1-ans-0').value, document.getElementById('q1-ans-1').value, document.getElementById('q1-ans-2').value ];
            if (userAnswers.some(a => a === '')) { alert('Please answer all questions.'); return; }
            const payload = { questionType: qData.type, context: qData.essay, questions: qData.questions, userAnswers };
            const result = await evaluate(payload);
            if (result) {
                q1Result.innerHTML = '<h3>Evaluation Results:</h3>';
                result.results.forEach((res, i) => {
                    const isCorrect = res.isCorrect === 'correct';
                    q1Result.innerHTML += `<div class="result-item ${isCorrect ? 'correct' : 'incorrect'}"><strong>Question ${i + 1}:</strong> Your answer (${userAnswers[i]}) was ${res.isCorrect}. ${!isCorrect ? `Correct was <strong>${res.correctParagraph}</strong>.` : ''}</div>`;
                });
            }
        };
    }

    function setupMultipleChoice(qData) {
        const q2Essay = document.getElementById('q2-essay');
        const q2Questions = document.getElementById('q2-questions');
        const q2EvalBtn = document.getElementById('q2-eval-btn');
        const q2Result = document.getElementById('q2-result');

        q2Result.innerHTML = ''; // Clear previous results
        q2Essay.innerHTML = '';
        Object.entries(qData.essay).forEach(([key, value]) => {
            q2Essay.innerHTML += `<p><strong>Paragraph ${key}:</strong> ${value}</p>`;
        });

        q2Questions.innerHTML = '';
        qData.questions.forEach((q, i) => {
            let optionsHtml = '';
            q.options.forEach(opt => { optionsHtml += `<label><input type="radio" name="q2-ans-${i}" value="${opt}"> ${opt}</label><br>`; });
            q2Questions.innerHTML += `<div class="question"><p><strong>${i + 1}.</strong> ${q.q}</p>${optionsHtml}</div>`;
        });
        
        q2EvalBtn.onclick = async () => {
            const userAnswers = qData.questions.map((q, i) => {
                const selected = document.querySelector(`input[name="q2-ans-${i}"]:checked`);
                return selected ? selected.value : "";
            });
            if (userAnswers.some(a => a === '')) { alert('Please answer all questions.'); return; }
            const payload = { questionType: qData.type, context: qData.essay, questions: qData.questions, userAnswers };
            const result = await evaluate(payload);
            if (result) {
                q2Result.innerHTML = '<h3>Evaluation Results:</h3>';
                result.results.forEach((res, i) => {
                    const isCorrect = res.isCorrect === 'correct';
                    q2Result.innerHTML += `<div class="result-item ${isCorrect ? 'correct' : 'incorrect'}"><strong>Question ${i + 1}:</strong> Your answer was ${res.isCorrect}. ${!isCorrect ? `Correct answer is: "<strong>${res.correctAnswer}</strong>"` : ''}</div>`;
                });
            }
        };
    }

    function setupFillInTheBlank(qData) {
        const q3Essay = document.getElementById('q3-essay');
        const q3Questions = document.getElementById('q3-questions');
        const q3EvalBtn = document.getElementById('q3-eval-btn');
        const q3Result = document.getElementById('q3-result');

        q3Result.innerHTML = ''; // Clear previous results
        q3Essay.innerHTML = '';
        Object.entries(qData.essay).forEach(([key, value]) => {
            q3Essay.innerHTML += `<p><strong>Paragraph ${key}:</strong> ${value}</p>`;
        });

        q3Questions.innerHTML = '';
        Object.keys(qData.essay).forEach((p, i) => {
            let optionsHtml = `<option value="">Select a sentence...</option>`;
            [...qData.options].sort(() => Math.random() - 0.5).forEach(opt => { optionsHtml += `<option value="${opt}">${opt}</option>`; });
            q3Questions.innerHTML += `<div class="question"><p><strong>Blank for Paragraph ${Object.keys(qData.essay)[i]}:</strong></p><select id="q3-ans-${i}">${optionsHtml}</select></div>`;
        });

        q3EvalBtn.onclick = async () => {
            const userAnswers = Array.from({ length: 5 }, (_, i) => document.getElementById(`q3-ans-${i}`).value);
            if (userAnswers.some(a => a === '')) { alert('Please answer all questions.'); return; }
            const payload = { questionType: qData.type, context: qData.essay, questions: { options: qData.options }, userAnswers };
            const result = await evaluate(payload);
            if (result && result.results) {
                q3Result.innerHTML = '<h3>Evaluation Results:</h3>';
                result.results.forEach((res, i) => {
                    const isCorrect = res.isCorrect === 'correct';
                    q3Result.innerHTML += `<div class="result-item ${isCorrect ? 'correct' : 'incorrect'}"><strong>Paragraph ${Object.keys(qData.essay)[i]}:</strong> Your choice was ${res.isCorrect}. ${!isCorrect ? `A better fit: "<strong>${res.bestFitSentence}</strong>"` : ''}</div>`;
                });
            }
        };
    }
    
    function setupSpokenAnswer(qData) {
        const q4Question = document.getElementById('q4-question');
        const speechBtn = document.getElementById('speech-btn');
        const speechStatus = document.getElementById('speech-status');
        const speechTranscript = document.getElementById('speech-transcript');
        const q4EvalBtn = document.getElementById('q4-eval-btn');
        const q4Result = document.getElementById('q4-result');

        q4Result.innerHTML = ''; // Clear previous results
        q4Question.innerHTML = `<p>${qData.question}</p>`;
        q4EvalBtn.disabled = true; // Disable eval button until new speech is recorded
        speechTranscript.value = ''; // Clear old transcript

        // ... a lot of the speech recognition logic is complex to re-bind ...
        // We will keep the original speech setup, as it's self-contained and clears its state on each click.
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            let finalTranscript = '';

            recognition.onstart = () => { speechStatus.textContent = 'Recording...'; speechBtn.textContent = 'Stop Recording'; speechBtn.classList.add('recording'); };
            recognition.onend = () => { speechStatus.textContent = 'Idle'; speechBtn.textContent = 'Start Recording (45s)'; speechBtn.classList.remove('recording'); speechTranscript.value = finalTranscript; if (finalTranscript) q4EvalBtn.disabled = false; };
            recognition.onresult = (event) => {
                let interimTranscript = '';
                finalTranscript = '';
                for (let i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript; } 
                    else { interimTranscript += event.results[i][0].transcript; }
                }
                speechTranscript.value = finalTranscript + interimTranscript;
            };

            let recording = false;
            let timer;
            speechBtn.onclick = () => {
                if (recording) {
                    recognition.stop();
                    clearTimeout(timer);
                    recording = false;
                } else {
                    finalTranscript = ''; speechTranscript.value = ''; q4EvalBtn.disabled = true; q4Result.innerHTML = '';
                    recognition.start(); recording = true;
                    timer = setTimeout(() => { if (recording) recognition.stop(); }, 45000);
                }
            };
        } else {
            speechBtn.disabled = true;
            speechStatus.textContent = 'Speech Recognition not supported.';
        }

        q4EvalBtn.onclick = async () => {
            const userAnswer = speechTranscript.value;
            if (!userAnswer) { alert('No speech was recorded.'); return; }
            const payload = { questionType: qData.type, questions: [qData.question], userAnswers: [userAnswer] };
            const result = await evaluate(payload);
            if (result && result.evaluation) {
                const e = result.evaluation;
                q4Result.innerHTML = `<h3>AI Feedback:</h3><p>${e.overallFeedback}</p><ul><li><strong>Relevance:</strong> ${e.relevance.score}/5 - <em>${e.relevance.comment}</em></li><li><strong>Clarity:</strong> ${e.clarity.score}/5 - <em>${e.clarity.comment}</em></li><li><strong>Completeness:</strong> ${e.completeness.score}/5 - <em>${e.completeness.comment}</em></li></ul>`;
            }
        };
    }

    // --- Main function to load all questions ---
    async function loadAllQuestions() {
        showLoader(true);
        newQuestionsBtn.disabled = true; // Disable button while loading

        const [q1Data, q2Data, q3Data, q4Data] = await Promise.all([
            fetchQuestion('paragraph-matching'),
            fetchQuestion('multiple-choice'),
            fetchQuestion('fill-in-the-blank'),
            fetchQuestion('spoken-answer')
        ]);
        
        if (q1Data) setupParagraphMatching(q1Data);
        if (q2Data) setupMultipleChoice(q2Data);
        if (q3Data) setupFillInTheBlank(q3Data);
        if (q4Data) setupSpokenAnswer(q4Data);
        
        showLoader(false);
        newQuestionsBtn.disabled = false; // Re-enable button
    }

    // Add the event listener to the new button
    newQuestionsBtn.addEventListener('click', loadAllQuestions);

    // Load the initial set of questions when the page first loads
    loadAllQuestions();
});
