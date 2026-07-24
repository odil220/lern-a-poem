const defaultPoem = `I remember the wonderful moment
When the moonlight touched the sea.
Each wave carried a silver song,
And all my fears turned free.`;

const methods = [
  { id: 'firstletters', label: 'First Letters' },
  { id: 'missingwords', label: 'Missing Words' },
  { id: 'linebyline', label: 'Line by Line' },
  { id: 'stanzabystanza', label: 'Stanza by Stanza' },
  { id: 'shufflelines', label: 'Shuffle Lines' },
  { id: 'shufflewords', label: 'Shuffle Words' },
  { id: 'fillblanks', label: 'Fill in the Blanks' },
  { id: 'memorytest', label: 'Memory Test' },
  { id: 'progressivehiding', label: 'Progressive Hiding' },
  { id: 'firstwordsonly', label: 'First Word Only' },
  { id: 'lastwordsonly', label: 'Last Word Only' },
  { id: 'keywordhighlight', label: 'Keyword Highlight' },
  { id: 'chunklearning', label: 'Chunk Learning' },
  { id: 'readandrepeat', label: 'Read and Repeat' },
  { id: 'timedreading', label: 'Timed Reading' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'orderchallenge', label: 'Order Challenge' },
  { id: 'difficultylevels', label: 'Difficulty Levels' },
  { id: 'practicecounter', label: 'Practice Counter' },
  { id: 'darkmode', label: 'Dark Mode' }
];

const difficultyLevels = [
  { id: 'easy', label: 'Easy', note: 'Gentle hints' },
  { id: 'medium', label: 'Medium', note: 'Balanced challenge' },
  { id: 'hard', label: 'Hard', note: 'More hiding' },
  { id: 'expert', label: 'Expert', note: 'Very sparse clues' }
];

let poemData = { lines: [], stanzas: [] };
let currentMethod = 'firstletters';
let currentDifficulty = 'easy';
let practiceState = {
  lineIndex: 0,
  stanzaIndex: 0,
  chunkIndex: 0,
  step: 0,
  attempts: 0,
  startTime: Date.now(),
  timer: null,
  memoryResponse: '',
  feedback: '',
  feedbackType: '',
  shuffledLines: []
};

const poemInput = document.getElementById('poemInput');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const homeView = document.getElementById('homeView');
const resultsView = document.getElementById('resultsView');
const methodsTabs = document.getElementById('methodsTabs');
const methodContent = document.getElementById('methodContent');
const difficultyButtons = document.getElementById('difficultyButtons');
const themeToggle = document.getElementById('themeToggle');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const timeStat = document.getElementById('timeStat');
const attemptsStat = document.getElementById('attemptsStat');
const completionStat = document.getElementById('completionStat');
const poemTitle = document.getElementById('poemTitle');

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function parsePoem(text) {
  const normalized = text.replace(/\r/g, '').trim();
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const stanzas = normalized
    .split(/\n\s*\n/)
    .map((stanza) => stanza.split('\n').map((line) => line.trim()).filter(Boolean));
  return { lines, stanzas };
}

function startLearning() {
  const text = poemInput.value.trim() || defaultPoem;
  poemData = parsePoem(text);
  poemTitle.textContent = poemData.lines[0] || 'Your poem';
  homeView.hidden = true;
  resultsView.hidden = false;
  practiceState = {
    lineIndex: 0,
    stanzaIndex: 0,
    chunkIndex: 0,
    step: 0,
    attempts: 0,
    startTime: Date.now(),
    timer: null,
    memoryResponse: '',
    feedback: '',
    feedbackType: '',
    shuffledLines: []
  };
  renderDifficultyButtons();
  renderMethodTabs();
  startTimer();
  renderMethod();
}

function resetPractice() {
  clearInterval(practiceState.timer);
  homeView.hidden = false;
  resultsView.hidden = true;
  poemInput.value = '';
  currentMethod = 'firstletters';
  currentDifficulty = 'easy';
  practiceState = {
    lineIndex: 0,
    stanzaIndex: 0,
    chunkIndex: 0,
    step: 0,
    attempts: 0,
    startTime: Date.now(),
    timer: null,
    memoryResponse: '',
    feedback: '',
    feedbackType: '',
    shuffledLines: []
  };
}

function startTimer() {
  clearInterval(practiceState.timer);
  practiceState.timer = setInterval(() => {
    updateStats();
  }, 1000);
}

function updateStats() {
  const elapsed = Math.floor((Date.now() - practiceState.startTime) / 1000);
  timeStat.textContent = `${elapsed}s`;
  attemptsStat.textContent = practiceState.attempts;
  const progress = getProgressPercent();
  progressFill.style.width = `${progress}%`;
  progressLabel.textContent = `${progress}%`;
  completionStat.textContent = `${progress}%`;
}

function getProgressPercent() {
  const totalSteps = Math.max(1, poemData.lines.length + Math.max(1, poemData.stanzas.length));
  return Math.min(100, Math.round(((practiceState.step + 1) / totalSteps) * 100));
}

function renderDifficultyButtons() {
  difficultyButtons.innerHTML = difficultyLevels
    .map((level) => {
      const active = currentDifficulty === level.id ? 'active' : '';
      return `<button class="pill-btn ${active}" type="button" onclick="setDifficulty('${level.id}')">${level.label}</button>`;
    })
    .join('');
}

function renderMethodTabs() {
  methodsTabs.innerHTML = methods
    .map((method) => {
      const active = currentMethod === method.id ? 'active' : '';
      return `<button class="pill-btn ${active}" type="button" onclick="switchMethod('${method.id}')">${method.label}</button>`;
    })
    .join('');
}

function switchMethod(methodId) {
  currentMethod = methodId;
  practiceState.lineIndex = 0;
  practiceState.stanzaIndex = 0;
  practiceState.chunkIndex = 0;
  practiceState.step = 0;
  practiceState.feedback = '';
  practiceState.feedbackType = '';
  practiceState.memoryResponse = '';
  practiceState.shuffledLines = [];
  renderMethodTabs();
  renderMethod();
}

function setDifficulty(levelId) {
  currentDifficulty = levelId;
  renderDifficultyButtons();
  renderMethod();
}

function getDifficultySettings() {
  switch (currentDifficulty) {
    case 'medium':
      return { hideWords: 2, blankCount: 2, readTime: 3 };
    case 'hard':
      return { hideWords: 3, blankCount: 3, readTime: 2 };
    case 'expert':
      return { hideWords: 4, blankCount: 4, readTime: 1 };
    default:
      return { hideWords: 1, blankCount: 1, readTime: 5 };
  }
}

function advanceStep() {
  practiceState.step += 1;
  practiceState.attempts += 1;
  updateStats();
  renderMethod();
}

function renderMethod() {
  let html = '';
  switch (currentMethod) {
    case 'firstletters':
      html = renderFirstLetters();
      break;
    case 'missingwords':
      html = renderMissingWords();
      break;
    case 'linebyline':
      html = renderLineByLine();
      break;
    case 'stanzabystanza':
      html = renderStanzaByStanza();
      break;
    case 'shufflelines':
      html = renderShuffleLines();
      break;
    case 'shufflewords':
      html = renderShuffleWords();
      break;
    case 'fillblanks':
      html = renderFillBlanks();
      break;
    case 'memorytest':
      html = renderMemoryTest();
      break;
    case 'progressivehiding':
      html = renderProgressiveHiding();
      break;
    case 'firstwordsonly':
      html = renderFirstWordOnly();
      break;
    case 'lastwordsonly':
      html = renderLastWordOnly();
      break;
    case 'keywordhighlight':
      html = renderKeywordHighlight();
      break;
    case 'chunklearning':
      html = renderChunkLearning();
      break;
    case 'readandrepeat':
      html = renderReadAndRepeat();
      break;
    case 'timedreading':
      html = renderTimedReading();
      break;
    case 'flashcards':
      html = renderFlashcards();
      break;
    case 'orderchallenge':
      html = renderOrderChallenge();
      break;
    case 'difficultylevels':
      html = renderDifficultyLevels();
      break;
    case 'practicecounter':
      html = renderPracticeCounter();
      break;
    case 'darkmode':
      html = renderDarkMode();
      break;
    default:
      html = renderFirstLetters();
  }
  methodContent.innerHTML = html;
  updateStats();
}

function renderFirstLetters() {
  const lines = poemData.lines.map((line) => {
    const words = line.split(/\s+/);
    const letters = words.map((word) => word.charAt(0).toUpperCase()).join(' ');
    return `<div class="poem-line">${escapeHtml(letters)}</div>`;
  });
  return `
    <h3>First Letters</h3>
    <p>Read the initial letters to build a skeleton of the poem.</p>
    <div class="practice-lines">${lines.join('')}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="advanceStep()">Next step</button>
    </div>
  `;
}

function renderMissingWords() {
  const settings = getDifficultySettings();
  const hideCount = Math.min(settings.hideWords + practiceState.step, 6);
  const lines = poemData.lines.map((line) => {
    const words = line.split(/\s+/);
    const visible = words.map((word, index) => (index < hideCount ? '_____' : word)).join(' ');
    return `<div class="poem-line">${escapeHtml(visible)}</div>`;
  });
  return `
    <h3>Missing Words</h3>
    <p>This mode hides more words as you go.</p>
    <div class="practice-lines">${lines.join('')}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="advanceStep()">Reveal a little more</button>
    </div>
  `;
}

function renderLineByLine() {
  const line = poemData.lines[practiceState.lineIndex] || poemData.lines[0];
  return `
    <h3>Line by Line</h3>
    <p>Focus on one line at a time.</p>
    <div class="poem-line">${escapeHtml(line || 'No poem available')}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="previousLine()">Previous</button>
      <button class="action-btn" onclick="nextLine()">Next</button>
    </div>
  `;
}

function previousLine() {
  practiceState.attempts += 1;
  practiceState.lineIndex = Math.max(0, practiceState.lineIndex - 1);
  renderMethod();
}

function nextLine() {
  practiceState.attempts += 1;
  practiceState.lineIndex = Math.min(poemData.lines.length - 1, practiceState.lineIndex + 1);
  renderMethod();
}

function renderStanzaByStanza() {
  const stanza = poemData.stanzas[practiceState.stanzaIndex] || poemData.stanzas[0] || [];
  const lines = stanza.map((line) => `<div class="poem-line">${escapeHtml(line)}</div>`).join('');
  return `
    <h3>Stanza by Stanza</h3>
    <p>Study one verse at a time, then move on.</p>
    <div class="practice-lines">${lines}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="previousStanza()">Previous</button>
      <button class="action-btn" onclick="nextStanza()">Next</button>
    </div>
  `;
}

function previousStanza() {
  practiceState.attempts += 1;
  practiceState.stanzaIndex = Math.max(0, practiceState.stanzaIndex - 1);
  renderMethod();
}

function nextStanza() {
  practiceState.attempts += 1;
  practiceState.stanzaIndex = Math.min(poemData.stanzas.length - 1, practiceState.stanzaIndex + 1);
  renderMethod();
}

function renderShuffleLines() {
  if (!practiceState.shuffledLines.length) {
    practiceState.shuffledLines = [...poemData.lines].sort(() => Math.random() - 0.5);
  }
  const items = practiceState.shuffledLines.map((line) => `<div class="shuffle-item">${escapeHtml(line)}</div>`).join('');
  return `
    <h3>Shuffle Lines</h3>
    <p>Rebuild the poem order by restoring the lines.</p>
    <div class="practice-lines">${items}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="shuffleLinesAgain()">Shuffle again</button>
      <button class="action-btn" onclick="revealOriginalLines()">Reveal answer</button>
    </div>
  `;
}

function shuffleLinesAgain() {
  practiceState.attempts += 1;
  practiceState.shuffledLines = [...poemData.lines].sort(() => Math.random() - 0.5);
  renderMethod();
}

function revealOriginalLines() {
  practiceState.attempts += 1;
  practiceState.shuffledLines = [...poemData.lines];
  renderMethod();
}

function renderShuffleWords() {
  const line = poemData.lines[practiceState.lineIndex] || poemData.lines[0] || '';
  const words = line.split(/\s+/).sort(() => Math.random() - 0.5);
  return `
    <h3>Shuffle Words</h3>
    <p>Rebuild the sentence by putting the words back in order.</p>
    <div class="poem-line">${escapeHtml(words.join(' '))}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="shuffleWordsAgain()">Shuffle again</button>
      <button class="action-btn" onclick="showOriginalLine()">Show original</button>
    </div>
  `;
}

function shuffleWordsAgain() {
  practiceState.attempts += 1;
  renderMethod();
}

function showOriginalLine() {
  practiceState.attempts += 1;
  practiceState.lineIndex = Math.min(poemData.lines.length - 1, practiceState.lineIndex + 1);
  renderMethod();
}

function renderFillBlanks() {
  const settings = getDifficultySettings();
  const lined = poemData.lines.map((line) => {
    const words = line.split(/\s+/);
    const maskCount = Math.min(settings.blankCount, words.length);
    const toBlank = new Set();
    while (toBlank.size < maskCount) {
      toBlank.add(Math.floor(Math.random() * words.length));
    }
    const visible = words.map((word, index) => (toBlank.has(index) ? '_____' : word)).join(' ');
    return `<div class="poem-line">${escapeHtml(visible)}</div>`;
  });
  return `
    <h3>Fill in the Blanks</h3>
    <p>Replace random words with blanks and reconstruct the line.</p>
    <div class="practice-lines">${lined.join('')}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="advanceStep()">Try another round</button>
    </div>
  `;
}

function renderMemoryTest() {
  return `
    <h3>Memory Test</h3>
    <p>The poem is shown briefly, then hidden for you to type from memory.</p>
    <div class="practice-lines">${poemData.lines.map((line) => `<div class="poem-line">${escapeHtml(line)}</div>`).join('')}</div>
    <textarea id="memoryInput" class="memory-box" placeholder="Type the poem from memory..."></textarea>
    <div class="line-actions">
      <button class="action-btn" onclick="checkMemory()">Check your memory</button>
      <button class="action-btn" onclick="showPoemAgain()">Show poem again</button>
    </div>
    ${practiceState.feedback ? `<p class="feedback ${practiceState.feedbackType}">${escapeHtml(practiceState.feedback)}</p>` : ''}
  `;
}

function checkMemory() {
  const input = document.getElementById('memoryInput').value.trim().toLowerCase();
  const expected = poemData.lines.join('\n').toLowerCase();
  practiceState.attempts += 1;
  if (input === expected) {
    practiceState.feedback = 'Perfect recall!';
    practiceState.feedbackType = '';
  } else {
    practiceState.feedback = 'A few words are still missing. Try again and focus on the rhythm.';
    practiceState.feedbackType = 'bad';
  }
  renderMethod();
}

function showPoemAgain() {
  practiceState.attempts += 1;
  practiceState.feedback = 'Try to recall the poem before reading it again.';
  practiceState.feedbackType = '';
  renderMethod();
}

function renderProgressiveHiding() {
  const settings = getDifficultySettings();
  const hideCount = Math.min(settings.hideWords + practiceState.step, poemData.lines.length * 2);
  const lines = poemData.lines.map((line, index) => {
    const words = line.split(/\s+/);
    const visibleWords = words.map((word, wordIndex) => (wordIndex < Math.max(0, hideCount - index) ? '_____' : word)).join(' ');
    return `<div class="poem-line">${escapeHtml(visibleWords)}</div>`;
  });
  return `
    <h3>Progressive Hiding</h3>
    <p>Each step hides a little more until the poem must be recited from memory.</p>
    <div class="practice-lines">${lines.join('')}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="advanceStep()">Hide more</button>
    </div>
  `;
}

function renderFirstWordOnly() {
  const lines = poemData.lines.map((line) => {
    const first = line.split(/\s+/)[0] || '';
    return `<div class="poem-line">${escapeHtml(first)}</div>`;
  });
  return `
    <h3>First Word Only</h3>
    <p>Leave only the opening word of each line.</p>
    <div class="practice-lines">${lines.join('')}</div>
    <div class="line-actions"><button class="action-btn" onclick="advanceStep()">Next step</button></div>
  `;
}

function renderLastWordOnly() {
  const lines = poemData.lines.map((line) => {
    const words = line.split(/\s+/);
    const last = words[words.length - 1] || '';
    return `<div class="poem-line">${escapeHtml(last)}</div>`;
  });
  return `
    <h3>Last Word Only</h3>
    <p>Focus on the closing word of each line.</p>
    <div class="practice-lines">${lines.join('')}</div>
    <div class="line-actions"><button class="action-btn" onclick="advanceStep()">Next step</button></div>
  `;
}

function renderKeywordHighlight() {
  const lines = poemData.lines.map((line) => {
    const words = line.split(/\s+/);
    const highlighted = words
      .map((word) => {
        const cleaned = word.replace(/[^a-zA-Z]/g, '');
        const isImportant = cleaned.length > 4 || ['moonlight', 'silver', 'sea', 'song', 'fears'].includes(cleaned.toLowerCase());
        return isImportant ? `<span class="highlight-word">${escapeHtml(word)}</span>` : `<span class="faded-word">${escapeHtml(word)}</span>`;
      })
      .join(' ');
    return `<div class="poem-line">${highlighted}</div>`;
  });
  return `
    <h3>Keyword Highlight</h3>
    <p>Highlight the strongest words and soften the rest.</p>
    <div class="practice-lines">${lines.join('')}</div>
    <div class="line-actions"><button class="action-btn" onclick="advanceStep()">Next step</button></div>
  `;
}

function renderChunkLearning() {
  const chunkSize = 2 + (practiceState.step % 3);
  const start = practiceState.chunkIndex * chunkSize;
  const chunk = poemData.lines.slice(start, start + chunkSize);
  return `
    <h3>Chunk Learning</h3>
    <p>Break the poem into small chunks of 2–4 lines.</p>
    <div class="practice-lines">${chunk.map((line) => `<div class="poem-line">${escapeHtml(line)}</div>`).join('')}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="previousChunk()">Previous chunk</button>
      <button class="action-btn" onclick="nextChunk()">Next chunk</button>
    </div>
  `;
}

function previousChunk() {
  practiceState.attempts += 1;
  practiceState.chunkIndex = Math.max(0, practiceState.chunkIndex - 1);
  renderMethod();
}

function nextChunk() {
  practiceState.attempts += 1;
  practiceState.chunkIndex += 1;
  practiceState.step += 1;
  renderMethod();
}

function renderReadAndRepeat() {
  const line = poemData.lines[practiceState.lineIndex] || poemData.lines[0] || '';
  return `
    <h3>Read and Repeat</h3>
    <p>Read one line and repeat it before moving on.</p>
    <div class="poem-line">${escapeHtml(line)}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="previousLine()">Previous</button>
      <button class="action-btn" onclick="nextLine()">Next</button>
    </div>
  `;
}

function renderTimedReading() {
  const settings = getDifficultySettings();
  const line = poemData.lines[practiceState.lineIndex] || poemData.lines[0] || '';
  return `
    <h3>Timed Reading</h3>
    <p>This line will stay visible for ${settings.readTime}s before moving on.</p>
    <div class="poem-line">${escapeHtml(line)}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="advanceTimedLine()">Advance</button>
    </div>
  `;
}

function advanceTimedLine() {
  practiceState.attempts += 1;
  practiceState.lineIndex = Math.min(poemData.lines.length - 1, practiceState.lineIndex + 1);
  renderMethod();
}

function renderFlashcards() {
  const line = poemData.lines[practiceState.lineIndex] || poemData.lines[0] || '';
  return `
    <h3>Flashcards</h3>
    <p>Front: opening words. Back: full line.</p>
    <div class="flashcard">${escapeHtml(line.split(/\s+/).slice(0, 4).join(' '))}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="showFullLine()">Reveal full line</button>
      <button class="action-btn" onclick="nextLine()">Next card</button>
    </div>
  `;
}

function showFullLine() {
  practiceState.attempts += 1;
  renderMethod();
}

function renderOrderChallenge() {
  const firstWords = poemData.lines.map((line) => line.split(/\s+/)[0] || '').join(' · ');
  return `
    <h3>Order Challenge</h3>
    <p>Only the first words of each line are shown. Can you reconstruct the flow?</p>
    <div class="poem-line">${escapeHtml(firstWords)}</div>
    <div class="line-actions">
      <button class="action-btn" onclick="advanceStep()">Reveal the poem</button>
    </div>
  `;
}

function renderDifficultyLevels() {
  return `
    <h3>Difficulty Levels</h3>
    <p>Easy, Medium, Hard, and Expert each hide more of the poem.</p>
    <div class="practice-lines">
      ${difficultyLevels.map((level) => `<div class="poem-line">${escapeHtml(level.label)} — ${escapeHtml(level.note)}</div>`).join('')}
    </div>
    <div class="line-actions">
      <button class="action-btn" onclick="setDifficulty('easy')">Easy</button>
      <button class="action-btn" onclick="setDifficulty('medium')">Medium</button>
      <button class="action-btn" onclick="setDifficulty('hard')">Hard</button>
      <button class="action-btn" onclick="setDifficulty('expert')">Expert</button>
    </div>
  `;
}

function renderPracticeCounter() {
  return `
    <h3>Practice Counter</h3>
    <p>Track your pace, your attempts, and your progress.</p>
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-label">Time</span><strong>${timeStat.textContent}</strong></div>
      <div class="stat-card"><span class="stat-label">Attempts</span><strong>${practiceState.attempts}</strong></div>
      <div class="stat-card"><span class="stat-label">Completion</span><strong>${completionStat.textContent}</strong></div>
    </div>
  `;
}

function renderDarkMode() {
  return `
    <h3>Dark Mode</h3>
    <p>Switch between light and dark themes to make practice more comfortable.</p>
    <div class="line-actions">
      <button class="action-btn" onclick="toggleTheme()">Toggle theme</button>
    </div>
  `;
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️ Light mode' : '🌙 Dark mode';
}

startButton.addEventListener('click', startLearning);
resetButton.addEventListener('click', resetPractice);
themeToggle.addEventListener('click', toggleTheme);

window.addEventListener('DOMContentLoaded', () => {
  poemInput.value = defaultPoem;
  renderDifficultyButtons();
  renderMethodTabs();
  renderMethod();
});
