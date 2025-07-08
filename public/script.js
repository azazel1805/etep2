// public/script.js
document.addEventListener('DOMContentLoaded', () => {

    const loader = document.getElementById('loader');
    const newQuestionsBtn = document.getElementById('new-questions-btn');
    let voices = [], femaleVoice, maleVoice;

    // --- TTS (Text-to-Speech) SETUP ---
    function loadVoices() {
        voices = window.speechSynthesis.getVoices();
        // These names might vary by browser/OS. This is a best-effort selection.
        femaleVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) || voices.find(v => v.lang.startsWith('en') && v.gender === 'female') || voices.find(v => v.lang.startsWith('en-US'));
        maleVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Male')) || voices.find(v => v.lang.startsWith('en') && v.gender === 'male') || voices.find(v => v.lang.startsWith('en-GB'));
        
        const q5playBtn = document.getElementById('q5-play-btn');
        const q5status = document.getElementById('q5-status');

        if (q5playBtn && q5status) {
             if(femaleVoice && maleVoice) {
                q5status.textContent = 'Ready to play.';
                q5playBtn.disabled = false;
            } else {
                q5status.textContent = 'Distinct English voices not found.';
            }
        }
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }
    function speak(text, voice) {
        return new Promise(resolve => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = voice;
            utterance.rate = 0.95;
            utterance.onend = resolve;
            window.speechSynthesis.speak(utterance);
        });
    }

    // --- General Helper Functions ---
    const showLoader = (show) => loader.style.display = show ? 'flex' : 'none';
    async function evaluate(payload) {
        showLoader(true);
        try {
            const response = await fetch('/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Evaluation failed');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            showLoader(false);
        }
    }

    // --- Question Setup Functions (Renderers) ---

    function setupParagraphMatching(qData) {
        const essayEl = document.getElementById('q1-essay');
        const questionsEl = document.getElementById('q1-questions');
        const evalBtn = document.getElementById('q1-eval-btn');
        const resultEl = document.getElementById('q1-result');
        
        resultEl.innerHTML = '';
        essayEl.innerHTML = Object.entries(qData.essay).map(([key, val]) => `<p><strong>Paragraph ${key}:</strong> ${val}</p>`).join('');
        questionsEl.innerHTML = qData.questions.map((q, i) => `
            <div class="question"><p><strong>${i+1}.</strong> Which paragraph contains info about: <em>"${q}"</em>?</p>
            <select id="q1-ans-${i}"><option value="">Select...</option>${Object.keys(qData.essay).map(k => `<option value="${k}">${k}</option>`).join('')}</select></div>
        `).join('');

        evalBtn.onclick = async () => {
            const userAnswers = qData.questions.map((_, i) => document.getElementById(`q1-ans-${i}`).value);
            if (userAnswers.some(a => !a)) return alert('Please answer all questions.');
            const result = await evaluate({ userAnswers, correctAnswers: qData.correctAnswers });
            if (result) {
                resultEl.innerHTML = '<h3>Results:</h3>' + result.results.map((r, i) => `
                    <div class="result-item ${r.isCorrect}"><strong>Q${i+1}:</strong> Your answer (${userAnswers[i]}) was ${r.isCorrect}. ${r.isCorrect === 'incorrect' ? `Correct was <strong>${r.correctAnswer}</strong>.` : ''}</div>
                `).join('');
            }
        };
    }

    function setupMultipleChoice(qData) {
        const essayEl = document.getElementById('q2-essay');
        const questionsEl = document.getElementById('q2-questions');
        const evalBtn = document.getElementById('q2-eval-btn');
        const resultEl = document.getElementById('q2-result');

        resultEl.innerHTML = '';
        essayEl.innerHTML = Object.entries(qData.essay).map(([key, val]) => `<p><strong>Paragraph ${key}:</strong> ${val}</p>`).join('');
        questionsEl.innerHTML = qData.questions.map((q, i) => `
            <div class="question"><p><strong>${i+1}.</strong> ${q.q}</p>
            ${q.options.map(opt => `<label><input type="radio" name="q2-ans-${i}" value="${opt}"> ${opt}</label>`).join('<br>')}</div>
        `).join('');

        evalBtn.onclick = async () => {
            const userAnswers = qData.questions.map((_, i) => document.querySelector(`input[name="q2-ans-${i}"]:checked`)?.value || "");
            if (userAnswers.some(a => !a)) return alert('Please answer all questions.');
            const correctAnswers = qData.questions.map(q => q.correctAnswer);
            const result = await evaluate({ userAnswers, correctAnswers });
            if (result) {
                resultEl.innerHTML = '<h3>Results:</h3>' + result.results.map((r, i) => `
                    <div class="result-item ${r.isCorrect}"><strong>Q${i+1}:</strong> Your answer was ${r.isCorrect}. ${r.isCorrect === 'incorrect' ? `Correct was: "<strong>${r.correctAnswer}</strong>".` : ''}</div>
                `).join('');
            }
        };
    }

    function setupFillInTheBlank(qData) {
        const essayEl = document.getElementById('q3-essay');
        const questionsEl = document.getElementById('q3-questions');
        const evalBtn = document.getElementById('q3-eval-btn');
        const resultEl = document.getElementById('q3-result');

        resultEl.innerHTML = '';
        essayEl.innerHTML = Object.entries(qData.essay).map(([key, val]) => `<p><strong>Paragraph ${key}:</strong> ${val}</p>`).join('');
        const shuffledOptions = [...qData.options].sort(() => Math.random() - 0.5);
        questionsEl.innerHTML = Object.keys(qData.essay).map((key, i) => `
            <div class="question"><p><strong>Fill blank in Paragraph ${key}:</strong></p>
            <select id="q3-ans-${i}"><option value="">Select sentence...</option>
            ${shuffledOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select></div>
        `).join('');

        evalBtn.onclick = async () => {
            const userAnswers = Object.keys(qData.essay).map((_, i) => document.getElementById(`q3-ans-${i}`).value);
            if (userAnswers.some(a => !a)) return alert('Please answer all questions.');
            const result = await evaluate({ userAnswers, correctAnswers: qData.options });
            if (result) {
                resultEl.innerHTML = '<h3>Results:</h3>' + result.results.map((r, i) => `
                    <div class="result-item ${r.isCorrect}"><strong>Blank ${Object.keys(qData.essay)[i]}:</strong> Your choice was ${r.isCorrect}. ${r.isCorrect === 'incorrect' ? `Correct was: "<strong>${r.correctAnswer}</strong>".` : ''}</div>
                `).join('');
            }
        };
    }
    
    function setupSpokenAnswer(qData) {
        document.getElementById('q4-question').innerHTML = `<p>${qData.question}</p>`;
        document.getElementById('q4-result').innerHTML = '';
        document.getElementById('speech-transcript').value = '';
        document.getElementById('q4-eval-btn').onclick = () => alert("Evaluation for spoken answers would require a separate AI call and is handled differently.");
    }

    function setupDialogueComprehension(qData) {
        document.getElementById('q5-topic').textContent = qData.topic;
        const playBtn = document.getElementById('q5-play-btn');
        const statusEl = document.getElementById('q5-status');
        const q1Container = document.getElementById('q5-questions-part1');
        const q2Container = document.getElementById('q5-questions-part2');
        const evalBtn = document.getElementById('q5-eval-btn');
        const resultEl = document.getElementById('q5-result');

        [q1Container, q2Container, resultEl].forEach(el => el.innerHTML = '');
        [q1Container, q2Container, evalBtn].forEach(el => el.style.display = 'none');
        
        playBtn.onclick = async () => {
            playBtn.disabled = true;
            statusEl.textContent = 'Playing Part 1...';
            for (const item of qData.dialoguePart1) await speak(`${item.speaker}: ${item.line}`, item.speaker === qData.speakers[0] ? femaleVoice : maleVoice);
            q1Container.innerHTML = '<h4>Part 1 Questions:</h4>' + qData.questionsPart1.map((q, i) => `<div class="question"><p><strong>${i+1}.</strong> ${q.q}</p>${q.options.map(opt => `<label><input type="radio" name="q5p1-ans-${i}" value="${opt}"> ${opt}</label>`).join('<br>')}</div>`).join('');
            q1Container.style.display = 'block';

            statusEl.textContent = 'Playing Part 2...';
            for (const item of qData.dialoguePart2) await speak(`${item.speaker}: ${item.line}`, item.speaker === qData.speakers[0] ? femaleVoice : maleVoice);
            q2Container.innerHTML = '<h4>Part 2 Questions:</h4>' + qData.questionsPart2.map((q, i) => `<div class="question"><p><strong>${i+4}.</strong> ${q.q}</p>${q.options.map(opt => `<label><input type="radio" name="q5p2-ans-${i}" value="${opt}"> ${opt}</label>`).join('<br>')}</div>`).join('');
            q2Container.style.display = 'block';
            evalBtn.style.display = 'block';
        };

        evalBtn.onclick = async () => {
            const userAnswers = [
                ...qData.questionsPart1.map((_, i) => document.querySelector(`input[name="q5p1-ans-${i}"]:checked`)?.value || ""),
                ...qData.questionsPart2.map((_, i) => document.querySelector(`input[name="q5p2-ans-${i}"]:checked`)?.value || "")
            ];
            if (userAnswers.some(a => !a)) return alert('Please answer all questions.');
            const correctAnswers = [...qData.questionsPart1.map(q => q.correctAnswer), ...qData.questionsPart2.map(q => q.correctAnswer)];
            const result = await evaluate({ userAnswers, correctAnswers });
            if(result) resultEl.innerHTML = '<h3>Results:</h3>' + result.results.map((r, i) => `<div class="result-item ${r.isCorrect}"><strong>Q${i+1}:</strong> Your answer was ${r.isCorrect}. ${r.isCorrect === 'incorrect' ? `Correct was: "<strong>${r.correctAnswer}</strong>".` : ''}</div>`).join('');
        };
    }
    
    function setupSpeakerMatching(qData) {
        document.getElementById('q6-topic').textContent = qData.topic;
        document.getElementById('q6-monologues').innerHTML = Object.entries(qData.monologues).map(([speaker, text]) => `<div class="monologue"><strong>${speaker}:</strong> ${text}</div>`).join('');
        const questionsEl = document.getElementById('q6-questions');
        const evalBtn = document.getElementById('q6-eval-btn');
        const resultEl = document.getElementById('q6-result');

        resultEl.innerHTML = '';
        questionsEl.innerHTML = '<h4>Who said the following?</h4>' + qData.questions.map((q, i) => `
            <div class="question"><p><strong>${i+1}.</strong> <em>"${q.keySentence}"</em></p>
            ${qData.speakers.map(s => `<label><input type="radio" name="q6-ans-${i}" value="${s}">${s}</label>`).join('<br>')}</div>
        `).join('');

        evalBtn.onclick = async () => {
            const userAnswers = qData.questions.map((_, i) => document.querySelector(`input[name="q6-ans-${i}"]:checked`)?.value || "");
            if (userAnswers.some(a => !a)) return alert('Please answer all questions.');
            const correctAnswers = qData.questions.map(q => q.correctSpeaker);
            const result = await evaluate({ userAnswers, correctAnswers });
            if (result) resultEl.innerHTML = '<h3>Results:</h3>' + result.results.map((r, i) => `<div class="result-item ${r.isCorrect}"><strong>Statement ${i+1}:</strong> Your answer was ${r.isCorrect}. ${r.isCorrect === 'incorrect' ? `Correct was: <strong>${r.correctAnswer}</strong>.` : ''}</div>`).join('');
        };
    }

    // --- Main Function to Generate and Load All Questions ---
    async function generateAndLoad() {
        showLoader(true);
        newQuestionsBtn.disabled = true;
        try {
            const response = await fetch('/api/generate-all-questions');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch questions from server.');
            }
            const data = await response.json();
            
            setupParagraphMatching(data.paragraphMatching);
            setupMultipleChoice(data.multipleChoice);
            setupFillInTheBlank(data.fillInTheBlank);
            setupSpokenAnswer(data.spokenAnswer);
            setupDialogueComprehension(data.dialogueComprehension);
            setupSpeakerMatching(data.speakerMatching);

        } catch (error) {
            console.error(error);
            alert("An error occurred while generating new questions: " + error.message);
        } finally {
            showLoader(false);
            newQuestionsBtn.disabled = false;
        }
    }

    // --- Initial Load ---
    newQuestionsBtn.addEventListener('click', generateAndLoad);
    generateAndLoad(); // Generate questions on first page load
});
