document.addEventListener('DOMContentLoaded', () => {
    // --- DATA: In a real app, this would come from a database ---
    const q1Data = {
        type: 'paragraph-matching',
        essay: {
            A: "The Industrial Revolution, which began in the 18th century, was a period of major industrialization that saw the mechanization of agriculture and textile manufacturing and a revolution in power, including steam ships and railroads.",
            B: "Social structures were fundamentally altered. Urbanization accelerated as people moved to cities for factory jobs, leading to crowded living conditions and new social classes, namely the bourgeoisie and the proletariat.",
            C: "Technological innovation was the engine of this change. Key inventions like the spinning jenny, the power loom, and James Watt's improved steam engine dramatically increased production efficiency.",
            D: "The economic impact was profound, shifting economies from being agrarian-based to industrial. This created new markets, a surge in international trade, and the rise of capitalism as the dominant economic system.",
            E: "However, the era also had significant downsides. Factory work was often dangerous, child labor was common, and the rapid, unplanned growth of cities led to widespread pollution and sanitation problems."
        },
        questions: [
            "Information about the negative consequences and problems of the era.",
            "Information about specific inventions that drove the change.",
            "Information about the societal shift towards cities and the creation of new classes."
        ]
    };

    const q2Data = {
        type: 'multiple-choice',
        essay: q1Data.essay, // Re-use the same essay
        questions: [
            { q: "What was the primary driver of the Industrial Revolution according to the text?", options: ["Agricultural reform", "Political change", "Technological innovation"], },
            { q: "Which paragraph describes the economic transformation?", options: ["Paragraph A", "Paragraph C", "Paragraph D"], },
            { q: "What was a major social consequence mentioned in the text?", options: ["A decrease in population", "Accelerated urbanization", "The decline of trade"], }
        ]
    };

    const q3Data = {
        type: 'fill-in-the-blank',
        essay: { // Essay with blanks
            A: "The Industrial Revolution was a pivotal period. [_BLANK_] It transformed societies from agrarian to industrial.",
            B: "Urbanization was a direct result of the factory system. [_BLANK_] This created a new urban working class.",
            C: "Technological advancements were key. [_BLANK_] This invention revolutionized how factories were powered.",
            D: "The economic system of capitalism flourished. [_BLANK_] This led to unprecedented wealth for some.",
            E: "Despite the progress, there were severe social costs. [_BLANK_] These issues sparked calls for social reform."
        },
        options: [ // Five correct sentences mixed up
            "For example, James Watt's steam engine was a game-changer.",
            "Factories offered employment, drawing people from the countryside.",
            "Its effects are still felt around the world today.",
            "Factory conditions were harsh and child labor was rampant.",
            "Entrepreneurs invested capital in new industries for profit."
        ]
    };

    const q4Data = {
        type: 'spoken-answer',
        question: "Based on the text about the Industrial Revolution, briefly explain one positive and one negative outcome of that era."
    };
    
    // --- UI Elements ---
    const loader = document.getElementById('loader');

    // --- General Functions ---
    const showLoader = (show) => {
        loader.style.display = show ? 'flex' : 'none';
    };

    const evaluate = async (type, payload) => {
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

    // --- Question 1: Paragraph Matching ---
    const q1Essay = document.getElementById('q1-essay');
    const q1Questions = document.getElementById('q1-questions');
    const q1EvalBtn = document.getElementById('q1-eval-btn');
    const q1Result = document.getElementById('q1-result');

    Object.entries(q1Data.essay).forEach(([key, value]) => {
        q1Essay.innerHTML += `<p><strong>Paragraph ${key}:</strong> ${value}</p>`;
    });
    q1Data.questions.forEach((q, i) => {
        q1Questions.innerHTML += `
            <div class="question">
                <p><strong>${i + 1}.</strong> Which paragraph contains information about: <em>"${q}"</em>?</p>
                <select id="q1-ans-${i}">
                    <option value="">Select Paragraph</option>
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                </select>
            </div>
        `;
    });
    q1EvalBtn.addEventListener('click', async () => {
        const userAnswers = [
            document.getElementById('q1-ans-0').value,
            document.getElementById('q1-ans-1').value,
            document.getElementById('q1-ans-2').value,
        ];
        if (userAnswers.some(a => a === '')) {
            alert('Please answer all questions.');
            return;
        }
        const payload = {
            questionType: q1Data.type,
            context: q1Data.essay,
            questions: q1Data.questions,
            userAnswers: userAnswers
        };
        const result = await evaluate(q1Data.type, payload);
        if(result) {
            q1Result.innerHTML = '<h3>Evaluation Results:</h3>';
            result.results.forEach((res, i) => {
                const isCorrect = res.isCorrect === 'correct';
                q1Result.innerHTML += `
                    <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                        <strong>Question ${i + 1}:</strong> Your answer (${userAnswers[i]}) was ${res.isCorrect}.
                        ${!isCorrect ? `The correct paragraph was <strong>${res.correctParagraph}</strong>.` : ''}
                    </div>
                `;
            });
        }
    });

    // --- Question 2: Multiple Choice ---
    const q2Essay = document.getElementById('q2-essay');
    const q2Questions = document.getElementById('q2-questions');
    const q2EvalBtn = document.getElementById('q2-eval-btn');
    const q2Result = document.getElementById('q2-result');

    Object.entries(q2Data.essay).forEach(([key, value]) => {
        q2Essay.innerHTML += `<p><strong>Paragraph ${key}:</strong> ${value}</p>`;
    });

    q2Data.questions.forEach((q, i) => {
        let optionsHtml = '';
        q.options.forEach((opt, j) => {
            optionsHtml += `
                <label>
                    <input type="radio" name="q2-ans-${i}" value="${opt}">
                    ${opt}
                </label><br>
            `;
        });
        q2Questions.innerHTML += `<div class="question"><p><strong>${i+1}.</strong> ${q.q}</p>${optionsHtml}</div>`;
    });
    
    q2EvalBtn.addEventListener('click', async () => {
        const userAnswers = [];
        q2Data.questions.forEach((q, i) => {
            const selected = document.querySelector(`input[name="q2-ans-${i}"]:checked`);
            userAnswers.push(selected ? selected.value : "");
        });

        if (userAnswers.some(a => a === '')) {
            alert('Please answer all questions.');
            return;
        }

        const payload = {
            questionType: q2Data.type,
            context: q2Data.essay,
            questions: q2Data.questions.map(q => ({ q: q.q, options: q.options })),
            userAnswers: userAnswers
        };
        const result = await evaluate(q2Data.type, payload);
        if(result) {
            q2Result.innerHTML = '<h3>Evaluation Results:</h3>';
            result.results.forEach((res, i) => {
                const isCorrect = res.isCorrect === 'correct';
                q2Result.innerHTML += `
                    <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                        <strong>Question ${i + 1}:</strong> Your answer was ${res.isCorrect}.
                        ${!isCorrect ? `The correct answer is: "<strong>${res.correctAnswer}</strong>"` : ''}
                    </div>
                `;
            });
        }
    });


    // --- Question 3: Fill in the Blank ---
    const q3Essay = document.getElementById('q3-essay');
    const q3Questions = document.getElementById('q3-questions');
    const q3EvalBtn = document.getElementById('q3-eval-btn');
    const q3Result = document.getElementById('q3-result');

    Object.entries(q3Data.essay).forEach(([key, value]) => {
        q3Essay.innerHTML += `<p><strong>Paragraph ${key}:</strong> ${value}</p>`;
    });

    q3Data.essay && Object.keys(q3Data.essay).forEach((p, i) => {
        let optionsHtml = `<option value="">Select a sentence...</option>`;
        q3Data.options.forEach(opt => {
            optionsHtml += `<option value="${opt}">${opt}</option>`;
        });
        q3Questions.innerHTML += `
            <div class="question">
                <p><strong>Fill in the blank for Paragraph ${Object.keys(q3Data.essay)[i]}:</strong></p>
                <select id="q3-ans-${i}">${optionsHtml}</select>
            </div>
        `;
    });

    q3EvalBtn.addEventListener('click', async () => {
        const userAnswers = Array.from({ length: 5 }, (_, i) => document.getElementById(`q3-ans-${i}`).value);
        if (userAnswers.some(a => a === '')) {
            alert('Please answer all questions.');
            return;
        }

        const payload = {
            questionType: q3Data.type,
            context: q3Data.essay,
            questions: { options: q3Data.options },
            userAnswers
        };

        const result = await evaluate(q3Data.type, payload);
        if(result && result.results) {
            q3Result.innerHTML = '<h3>Evaluation Results:</h3>';
            result.results.forEach((res, i) => {
                const isCorrect = res.isCorrect === 'correct';
                q3Result.innerHTML += `
                    <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                        <strong>Paragraph ${Object.keys(q3Data.essay)[i]}:</strong> Your choice was ${res.isCorrect}.
                        ${!isCorrect ? `A better fit would be: "<strong>${res.bestFitSentence}</strong>"` : ''}
                    </div>
                `;
            });
        }
    });

    // --- Question 4: Spoken Answer ---
    const q4Question = document.getElementById('q4-question');
    const speechBtn = document.getElementById('speech-btn');
    const speechStatus = document.getElementById('speech-status');
    const speechTranscript = document.getElementById('speech-transcript');
    const q4EvalBtn = document.getElementById('q4-eval-btn');
    const q4Result = document.getElementById('q4-result');

    q4Question.innerHTML = `<p>${q4Data.question}</p>`;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        let finalTranscript = '';

        recognition.onstart = () => {
            speechStatus.textContent = 'Recording...';
            speechBtn.textContent = 'Stop Recording';
            speechBtn.classList.add('recording');
        };

        recognition.onend = () => {
            speechStatus.textContent = 'Processing...';
            speechBtn.textContent = 'Start Recording';
            speechBtn.classList.remove('recording');
            speechTranscript.value = finalTranscript;
            if(finalTranscript) q4EvalBtn.disabled = false;
            speechStatus.textContent = 'Idle';
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            speechTranscript.value = finalTranscript + interimTranscript;
        };
        
        let recording = false;
        let timer;
        speechBtn.addEventListener('click', () => {
            if (recording) {
                recognition.stop();
                clearTimeout(timer);
                recording = false;
            } else {
                finalTranscript = '';
                speechTranscript.value = '';
                q4EvalBtn.disabled = true;
                q4Result.innerHTML = '';
                recognition.start();
                recording = true;
                timer = setTimeout(() => {
                    if (recording) recognition.stop();
                }, 45000); // 45 seconds
            }
        });

    } else {
        speechBtn.disabled = true;
        speechStatus.textContent = 'Speech Recognition not supported in this browser.';
    }

    q4EvalBtn.addEventListener('click', async () => {
        const userAnswer = speechTranscript.value;
        if (!userAnswer) {
            alert('No speech was recorded.');
            return;
        }

        const payload = {
            questionType: q4Data.type,
            questions: [q4Data.question],
            userAnswers: [userAnswer]
        };

        const result = await evaluate(q4Data.type, payload);
        if(result && result.evaluation) {
            const eval = result.evaluation;
            q4Result.innerHTML = `
                <h3>AI Feedback:</h3>
                <p>${eval.overallFeedback}</p>
                <ul>
                    <li><strong>Relevance:</strong> ${eval.relevance.score}/5 - <em>${eval.relevance.comment}</em></li>
                    <li><strong>Clarity:</strong> ${eval.clarity.score}/5 - <em>${eval.clarity.comment}</em></li>
                    <li><strong>Completeness:</strong> ${eval.completeness.score}/5 - <em>${eval.completeness.comment}</em></li>
                </ul>
            `;
        }
    });

});