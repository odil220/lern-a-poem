import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

const defaultPoem = ``;

const methods = [
  { id: 'firstletters', label: 'Первые буквы' },
  { id: 'missingwords', label: 'Пропущенные слова' },
  { id: 'linebyline', label: 'Построчно' },
  { id: 'stanzabystanza', label: 'Станза за станзой' },
  { id: 'shufflelines', label: 'Перемешанные строки' },
  { id: 'fillblanks', label: 'Заполните пропуски' },
  { id: 'memorytest', label: 'Тест памяти' },
  { id: 'progressivehiding', label: 'Постепенное скрытие' },
  { id: 'keywordhighlight', label: 'Выделение слов' },
  { id: 'flashcards', label: 'Флеш-карты' }
];

const defaultDifficulty = {
  hideWords: 1,
  blankWords: 1,
  flashWords: 4,
  highlightThreshold: 5,
  showLineNumbers: true
};

const SETTINGS_KEY = 'poem-memorization-settings';
const defaultSettings = {
  defaultMethod: 'firstletters',
  enabledMethods: methods.map((method) => method.id),
  theme: 'light',
  reduceMotion: false,
  fontSize: 'normal',
  flashPreviewWords: 4,
  memoryTestMode: 'lenient',
  autoAdvance: false,
  showCompletionFeedback: true
};

function loadSettings() {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = window.localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

/* ─── Reusable Sub-Components ─── */

function SettingsSection({ title, description, children }) {
  return (
    <div className="settings-section">
      <div className="settings-heading">
        <h3>{title}</h3>
        {description ? <p className="settings-description">{description}</p> : null}
      </div>
      <div className="settings-content">{children}</div>
    </div>
  );
}

function SettingsToggle({ label, checked, onChange, description }) {
  return (
    <label className="settings-toggle">
      <span>
        <strong>{label}</strong>
        {description ? <span className="settings-description">{description}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SettingsOption({ label, value, onChange, options, description }) {
  return (
    <label className="settings-option">
      <span>
        <strong>{label}</strong>
        {description ? <span className="settings-description">{description}</span> : null}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function SettingsChipList({ title, items, values, onChange, description }) {
  return (
    <SettingsSection title={title} description={description}>
      <div className="settings-chip-list">
        {items.map((item) => (
          <label key={item.id} className={`settings-chip ${values.includes(item.id) ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={values.includes(item.id)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...values, item.id]);
                } else {
                  onChange(values.filter((value) => value !== item.id));
                }
              }}
            />
            {item.label}
          </label>
        ))}
      </div>
    </SettingsSection>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Подтвердить', cancelLabel = 'Отмена', destructive }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="ghost-btn" onClick={onCancel}>{cancelLabel}</button>
          <button className={destructive ? 'destructive-btn' : 'primary-btn'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }) {
  return (
    <div className="toast-container">
      <div className="toast">{message}</div>
    </div>
  );
}

function Celebration({ message, stats, onClose }) {
  return (
    <div className="celebration-overlay" onClick={onClose}>
      <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
        <span className="celebration-emoji">🎉</span>
        <h2>{message || 'Поздравляем!'}</h2>
        <p>Вы завершили изучение стихотворения.</p>
        {stats && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <span className="stat-label">Время</span>
              <strong>{stats.time}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Попытки</span>
              <strong>{stats.attempts}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Методов</span>
              <strong>{stats.methodsUsed}</strong>
            </div>
          </div>
        )}
        <button className="primary-btn" onClick={onClose}>Продолжить</button>
      </div>
    </div>
  );
}

function PositionIndicator({ current, total, label = 'Строка' }) {
  return (
    <span className="position-indicator">
      {label} {current + 1} / {total}
    </span>
  );
}

function LoadingShell({ message = 'Готовим упражнение...' }) {
  return (
    <div className="practice-card practice-skeleton">
      <div className="skeleton-title" />
      <div className="skeleton-line short" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line long" />
      <div className="skeleton-actions">
        <span className="skeleton-pill" />
        <span className="skeleton-pill" />
      </div>
      <p className="skeleton-caption">{message}</p>
    </div>
  );
}

function EmptyMethodState() {
  return (
    <div className="practice-card">
      <h3>Нет доступных методов</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginTop: 6 }}>
        Откройте <strong>Настройки</strong> и включите хотя бы один режим практики.
      </p>
    </div>
  );
}

/* ─── Parsing & Utility ─── */

function parsePoem(text) {
  const normalized = text.replace(/\r/g, '').trim();
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const stanzas = normalized.split(/\n\s*\n/).map((group) => group.split('\n').map((line) => line.trim()).filter(Boolean));
  return { lines, stanzas };
}

function maskWords(line, count) {
  if (!line) return '';
  const words = line.split(/(\s+)/);
  let replaced = 0;
  return words.map((token) => {
    if (/^\s+$/.test(token)) return token;
    if (replaced >= count) return token;
    replaced += 1;
    return token.replace(/\S/g, '•');
  }).join('');
}

/* ─── Main App ─── */

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [poemInput, setPoemInput] = useState(defaultPoem);
  const [started, setStarted] = useState(false);
  const [currentMethod, setCurrentMethod] = useState(settings.defaultMethod);
  const [poem, setPoem] = useState(parsePoem(defaultPoem));
  const [lineIndex, setLineIndex] = useState(0);
  const [stanzaIndex, setStanzaIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [formError, setFormError] = useState('');
  const [shuffledLines, setShuffledLines] = useState([]);
  const [memoryReply, setMemoryReply] = useState('');
  const [memoryPoemHidden, setMemoryPoemHidden] = useState(false);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [cardAnimationState, setCardAnimationState] = useState('entered');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [methodUsageCount, setMethodUsageCount] = useState({});

  const titleRef = useRef(null);
  const heroRef = useRef(null);
  const boardRef = useRef(null);
  const memoryInputRef = useRef(null);

  const filteredMethods = methods.filter((method) => settings.enabledMethods.includes(method.id));
  const currentMethodLabel = methods.find((method) => method.id === currentMethod)?.label || '';
  const rootFontClass = settings.fontSize === 'normal' ? '' : settings.fontSize;
  const motionClass = settings.reduceMotion ? 'no-motion' : cardAnimationState;

  // ─── Effects ───

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.body.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    document.body.style.overflow = settingsOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [settingsOpen]);

  // Escape key for settings
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settingsOpen]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Feedback auto-dismiss
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => { setFeedback(''); setFeedbackType(''); }, 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  // Header animation
  useLayoutEffect(() => {
    if (!titleRef.current) return;
    gsap.from(titleRef.current, { opacity: 0, y: 18, duration: 0.55, ease: 'power3.out', delay: 0.1 });
  }, []);

  // Card entrance animation
  useEffect(() => {
    const targetRef = started ? boardRef.current : heroRef.current;
    if (!targetRef) return;
    const entry = gsap.fromTo(targetRef, { opacity: 0, y: 18, scale: 0.99 }, {
      opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out'
    });
    return () => entry.kill();
  }, [started, loading]);

  // Timer
  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(interval);
  }, [started]);

  // Sync current method with enabled methods
  useEffect(() => {
    if (!settings.enabledMethods.includes(currentMethod)) {
      setCurrentMethod(settings.enabledMethods[0] || methods[0].id);
    }
  }, [settings.enabledMethods, currentMethod]);

  // Keyboard shortcuts in practice mode
  useEffect(() => {
    if (!started || loading || settingsOpen) return;
    const handler = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (currentMethod) {
        case 'linebyline':
        case 'readandrepeat':
          if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextLine(); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); previousLine(); }
          break;
        case 'stanzabystanza':
          if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextStanza(); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); previousStanza(); }
          break;
        case 'flashcards':
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!flashcardRevealed) {
              setFlashcardRevealed(true);
            } else {
              nextLine();
              setFlashcardRevealed(false);
            }
          }
          break;
        case 'shufflelines':
          if (e.key === 'r' || e.key === 'R') { e.preventDefault(); shuffleLinesAgain(); }
          if (e.key === 'o' || e.key === 'O') { e.preventDefault(); revealLines(); }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, loading, settingsOpen, currentMethod, lineIndex, stanzaIndex, flashcardRevealed]);

  // ─── Derived State ───

  const progress = useMemo(() => {
    const total = Math.max(1, poem.lines.length);
    const completed = Math.min(step, total);
    return Math.min(100, Math.round((completed / total) * 100));
  }, [poem.lines.length, step]);

  const elapsedFormatted = useMemo(() => formatTime(elapsed), [elapsed]);

  // ─── Actions ───

  const updateSettings = useCallback((updater) => {
    setSettings((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...current, ...next };
    });
  }, []);

  function showToast(message) {
    setToast(message);
  }

  function startLearning() {
    const trimmedInput = poemInput.trim();
    if (!trimmedInput) {
      setFormError('Введите текст стихотворения, чтобы начать.');
      return;
    }
    setFormError('');
    const nextPoem = parsePoem(trimmedInput);
    setLoading(true);
    setMethodUsageCount({});
    setTimeout(() => {
      setPoem(nextPoem);
      setStarted(true);
      const method = settings.enabledMethods.includes(settings.defaultMethod)
        ? settings.defaultMethod
        : settings.enabledMethods[0] || methods[0].id;
      setCurrentMethod(method);
      setLineIndex(0);
      setStanzaIndex(0);
      setStep(0);
      setAttempts(0);
      setElapsed(0);
      setFeedback('');
      setFeedbackType('');
      setMemoryReply('');
      setMemoryPoemHidden(false);
      setShuffledLines([]);
      setFlashcardRevealed(false);
      setShowCelebration(false);
      setCardAnimationState('entered');
      setLoading(false);
    }, 260);
  }

  function resetPractice() {
    setConfirmReset(true);
  }

  function confirmResetAction() {
    setConfirmReset(false);
    setStarted(false);
    setPoemInput('');
    setCurrentMethod(settings.enabledMethods.includes(settings.defaultMethod)
      ? settings.defaultMethod
      : settings.enabledMethods[0] || methods[0].id);
    setFeedback('');
    setFeedbackType('');
    setMemoryReply('');
    setMemoryPoemHidden(false);
    setFlashcardRevealed(false);
    setShowCelebration(false);
    showToast('Тренировка сброшена');
  }

  function switchMethod(methodId) {
    if (loading) return;
    setLoading(true);
    setCardAnimationState('exiting');
    setFeedback('');
    setFeedbackType('');
    setMethodUsageCount((prev) => ({ ...prev, [methodId]: (prev[methodId] || 0) + 1 }));
    setTimeout(() => {
      setCurrentMethod(methodId);
      setLineIndex(0);
      setStanzaIndex(0);
      setStep(0);
      setFeedback('');
      setFeedbackType('');
      setMemoryReply('');
      setMemoryPoemHidden(false);
      setShuffledLines([]);
      setFlashcardRevealed(false);
      setCardAnimationState('entered');
      setLoading(false);
    }, 350);
  }

  function handleNext() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setStep((v) => v + 1);
    if (currentMethod === 'linebyline' && settings.autoAdvance) {
      setLineIndex((v) => Math.min(poem.lines.length - 1, v + 1));
    }
  }

  function nextLine() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setLineIndex((v) => Math.min(poem.lines.length - 1, v + 1));
  }

  function previousLine() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setLineIndex((v) => Math.max(0, v - 1));
  }

  function nextStanza() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setStanzaIndex((v) => Math.min(poem.stanzas.length - 1, v + 1));
  }

  function previousStanza() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setStanzaIndex((v) => Math.max(0, v - 1));
  }

  function shuffleLinesAgain() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setShuffledLines([...poem.lines].sort(() => Math.random() - 0.5));
  }

  function revealLines() {
    if (loading) return;
    setAttempts((v) => v + 1);
    setShuffledLines([...poem.lines]);
    setFeedback('Показан правильный порядок строк.');
    setFeedbackType('');
  }

  function checkMemory() {
    if (loading) return;
    setAttempts((v) => v + 1);
    const target = poem.lines.join('\n').trim().toLowerCase();
    const reply = memoryReply.trim().toLowerCase();
    const isMatch = settings.memoryTestMode === 'strict'
      ? reply === target
      : reply.replace(/\s+/g, ' ') === target.replace(/\s+/g, ' ');

    if (isMatch) {
      setFeedback('🎉 Отлично! Вы запомнили стих. Можете переходить к другому методу.');
      setFeedbackType('');
    } else {
      setFeedback('Некоторые строки пока не совпадают. Попробуйте ещё раз, сосредоточившись на ритме.');
      setFeedbackType('error');
    }
  }

  function toggleMemoryPoem() {
    setMemoryPoemHidden(!memoryPoemHidden);
    if (memoryPoemHidden) {
      setTimeout(() => memoryInputRef.current?.focus(), 100);
    }
  }

  function handleCelebrationClose() {
    setShowCelebration(false);
  }

  // ─── Method Renderers ───

  function renderFirstLetters() {
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Первые буквы</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Используйте первые буквы слов как опорный скелет стихотворения.
        </p>
        <div className="practice-lines">
          {poem.lines.map((line, index) => {
            const letters = line.split(/\s+/).map((w) => w[0]?.toUpperCase() || '').join(' ');
            return <div key={index} className="poem-line">{letters}</div>;
          })}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={handleNext}>Следующий шаг</button>
        </div>
      </div>
    );
  }

  function renderMissingWords() {
    const hideCount = defaultDifficulty.hideWords + Math.floor(step / 2);
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Пропущенные слова</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Чем дальше, тем больше слов скрывается. Используйте контекст, чтобы восстановить их.
        </p>
        <div className="practice-lines">
          {poem.lines.map((line, index) => (
            <div key={index} className="poem-line">{maskWords(line, hideCount)}</div>
          ))}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={handleNext}>Скрыть ещё</button>
        </div>
      </div>
    );
  }

  function renderLineByLine() {
    const currentLine = poem.lines[lineIndex] || poem.lines[0];
    const progressLine = `${lineIndex + 1} / ${poem.lines.length}`;
    return (
      <div className={`practice-card ${motionClass}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3>Построчно</h3>
          <PositionIndicator current={lineIndex} total={poem.lines.length} label="Строка" />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Сосредоточьтесь на одной строке и прочитайте её вслух.
          <span className="kbd-hint"><kbd>←</kbd> <kbd>→</kbd></span>
        </p>
        <div className={`poem-line ${progressLine}`}>{currentLine}</div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={previousLine} disabled={lineIndex === 0}>Назад</button>
          <button className="action-btn" onClick={nextLine} disabled={lineIndex === poem.lines.length - 1}>Вперед</button>
        </div>
      </div>
    );
  }

  function renderStanzaByStanza() {
    const stanza = poem.stanzas[stanzaIndex] || poem.stanzas[0] || [];
    return (
      <div className={`practice-card ${motionClass}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3>Станза за станзой</h3>
          <PositionIndicator current={stanzaIndex} total={poem.stanzas.length} label="Станза" />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Изучайте по одному куплету и переходите к следующему.
          <span className="kbd-hint"><kbd>←</kbd> <kbd>→</kbd></span>
        </p>
        <div className="practice-lines">
          {stanza.map((line, index) => (
            <div key={index} className="poem-line">{line}</div>
          ))}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={previousStanza} disabled={stanzaIndex === 0}>Назад</button>
          <button className="action-btn" onClick={nextStanza} disabled={stanzaIndex === poem.stanzas.length - 1}>Вперед</button>
        </div>
      </div>
    );
  }

  function renderShuffleLines() {
    if (!shuffledLines.length) {
      setShuffledLines([...poem.lines].sort(() => Math.random() - 0.5));
    }
    const lines = shuffledLines.length ? shuffledLines : poem.lines;
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Перемешанные строки</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Поставьте строки стихотворения в правильном порядке.
          <span className="kbd-hint"><kbd>R</kbd> перемешать <kbd>O</kbd> порядок</span>
        </p>
        <div className="practice-lines">
          {lines.map((line, index) => {
            const correctIndex = poem.lines.indexOf(line);
            const isPlaced = shuffledLines.length === poem.lines.length;
            return (
              <div
                key={index}
                className={`shuffle-item ${isPlaced ? 'placed' : ''}`}
              >
                {isPlaced && <span className="order-badge">{correctIndex + 1}</span>}
                {line}
              </div>
            );
          })}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={shuffleLinesAgain}>Перемешать</button>
          <button className="action-btn" onClick={revealLines}>Показать порядок</button>
        </div>
      </div>
    );
  }

  function renderFillBlanks() {
    const blankCount = Math.min(defaultDifficulty.blankWords, 3);
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Заполните пропуски</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Восстановите строки, заполнив пропущенные слова.
        </p>
        <div className="practice-lines">
          {poem.lines.map((line, index) => {
            const words = line.split(/\s+/);
            const blankIndices = new Set();
            while (blankIndices.size < Math.min(blankCount, words.length)) {
              blankIndices.add(Math.floor(Math.random() * words.length));
            }
            return (
              <div key={index} className="blank-line">
                {words.map((word, wi) =>
                  blankIndices.has(wi) ? (
                    <span key={wi} className="blank-word" style={{ color: 'var(--muted)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                      ⚫
                    </span>
                  ) : (
                    <span key={wi} className="blank-word">{word}</span>
                  )
                )}
              </div>
            );
          })}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={handleNext}>Новый набор пропусков</button>
        </div>
      </div>
    );
  }

  function renderMemoryTest() {
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Тест памяти</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Сначала запомните стих, затем скройте его и напишите по памяти.
        </p>
        <div className="memory-toggle-area">
          <div className={`memory-poem-display ${memoryPoemHidden ? 'hidden' : ''}`}>
            {poem.lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          {!memoryPoemHidden && (
            <button className="primary-btn memory-toggle-btn" onClick={toggleMemoryPoem}>
              Скрыть стих и писать
            </button>
          )}
        </div>
        {memoryPoemHidden && (
          <>
            <textarea
              ref={memoryInputRef}
              className="memory-box"
              value={memoryReply}
              onChange={(e) => setMemoryReply(e.target.value)}
              placeholder="Введите стих по памяти..."
              autoFocus
            />
            <div className="line-actions">
              <button className="action-btn" onClick={checkMemory}>Проверить</button>
              <button className="ghost-btn" onClick={toggleMemoryPoem}>Показать стих</button>
              <button className="ghost-btn" onClick={() => { setMemoryReply(''); setFeedback(''); setFeedbackType(''); }}>
                Очистить
              </button>
            </div>
          </>
        )}
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
      </div>
    );
  }

  function renderProgressiveHiding() {
    const baseHide = defaultDifficulty.hideWords;
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Постепенное скрытие</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Каждый шаг скрывает больше слов, чтобы стих оставался в вашей памяти.
        </p>
        <div className="practice-lines">
          {poem.lines.map((line, index) => (
            <div key={index} className="poem-line">
              {maskWords(line, Math.min(baseHide + step + Math.floor(index / 2), line.split(/\s+/).length))}
            </div>
          ))}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={handleNext}>Скрыть сильнее</button>
        </div>
      </div>
    );
  }

  function renderKeywordHighlight() {
    return (
      <div className={`practice-card ${motionClass}`}>
        <h3>Выделение слов</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Ключевые слова (длиннее {defaultDifficulty.highlightThreshold} букв) остаются яркими, остальное приглушается.
        </p>
        <div className="practice-lines">
          {poem.lines.map((line, index) => {
            const words = line.split(/\s+/);
            return (
              <div key={index} className="poem-line">
                {words.map((word, wi) => {
                  const cleaned = word.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '').toLowerCase();
                  const important = cleaned.length >= defaultDifficulty.highlightThreshold;
                  return important
                    ? <span className="highlight-word" key={wi}>{word} </span>
                    : <span className="faded-word" key={wi}>{word} </span>;
                })}
              </div>
            );
          })}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          <button className="action-btn" onClick={handleNext}>Дальше</button>
        </div>
      </div>
    );
  }

  function renderFlashcards() {
    const line = poem.lines[lineIndex] || poem.lines[0] || '';
    const previewText = line.split(/\s+/).slice(0, settings.flashPreviewWords).join(' ');
    return (
      <div className={`practice-card ${motionClass}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3>Флеш-карты</h3>
          <PositionIndicator current={lineIndex} total={poem.lines.length} label="Карта" />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 4 }}>
          Сначала видны первые {settings.flashPreviewWords} слова, затем можно открыть всю строку.
          <span className="kbd-hint"><kbd>Space</kbd> раскрыть</span>
        </p>
        <div className={`flashcard ${flashcardRevealed ? 'revealed' : ''}`}>
          {flashcardRevealed ? line : previewText}
        </div>
        {feedback && <p className={`feedback ${feedbackType}`}>{feedback}</p>}
        <div className="line-actions">
          {!flashcardRevealed ? (
            <button className="action-btn" onClick={() => {
              setFlashcardRevealed(true);
              if (settings.showCompletionFeedback) {
                setFeedback('Строка раскрыта.');
                setFeedbackType('');
              }
            }}>Показать строку</button>
          ) : (
            <button className="action-btn" onClick={() => {
              nextLine();
              setFlashcardRevealed(false);
            }} disabled={lineIndex >= poem.lines.length - 1}>Следующая карта</button>
          )}
        </div>
      </div>
    );
  }

  // ─── Render Method Content ───

  function renderMethodContent() {
    if (loading) return <LoadingShell message="Подготовка выбранного метода..." />;
    if (!filteredMethods.length) return <EmptyMethodState />;

    switch (currentMethod) {
      case 'firstletters': return renderFirstLetters();
      case 'missingwords': return renderMissingWords();
      case 'linebyline': return renderLineByLine();
      case 'stanzabystanza': return renderStanzaByStanza();
      case 'shufflelines': return renderShuffleLines();
      case 'fillblanks': return renderFillBlanks();
      case 'memorytest': return renderMemoryTest();
      case 'progressivehiding': return renderProgressiveHiding();
      case 'keywordhighlight': return renderKeywordHighlight();
      case 'flashcards': return renderFlashcards();
      default: return renderFirstLetters();
    }
  }

  // ─── Settings Panel ───

  function renderSettingsPanel() {
    const handleEnabledMethodsChange = (values) => {
      if (!values.length) return;
      updateSettings({ enabledMethods: values });
    };

    return (
      <div className="settings-modal" onClick={() => setSettingsOpen(false)}>
        <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <div>
              <p className="eyebrow">Настройки</p>
              <h2>Управление поведением и внешним видом</h2>
            </div>
            <button className="ghost-btn" onClick={() => setSettingsOpen(false)}>Закрыть</button>
          </div>

          <SettingsSection title="Общие" description="Настройте стартовое поведение и доступные методы.">
            <SettingsOption
              label="Метод по умолчанию"
              value={settings.defaultMethod}
              onChange={(value) => {
                updateSettings({ defaultMethod: value });
                showToast('Метод по умолчанию сохранён');
              }}
              options={methods.map((m) => ({ value: m.id, label: m.label }))}
              description="Метод, который будет применяться при начале нового занятия."
            />
            <SettingsChipList
              title="Доступные методы"
              items={methods}
              values={settings.enabledMethods}
              onChange={handleEnabledMethodsChange}
              description="Включайте или отключайте методы практики."
            />
          </SettingsSection>

          <SettingsSection title="Внешний вид" description="Управляйте темой и комфортом при чтении.">
            <SettingsOption
              label="Тема"
              value={settings.theme}
              onChange={(value) => {
                updateSettings({ theme: value });
                showToast(value === 'dark' ? 'Включена тёмная тема' : 'Включена светлая тема');
              }}
              options={[
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' }
              ]}
              description="Выберите тему оформления."
            />
            <SettingsToggle
              label="Уменьшить движение"
              checked={settings.reduceMotion}
              onChange={(value) => updateSettings({ reduceMotion: value })}
              description="Отключает анимации для плавного чтения."
            />
            <SettingsOption
              label="Размер текста"
              value={settings.fontSize}
              onChange={(value) => updateSettings({ fontSize: value })}
              options={[
                { value: 'font-small', label: 'Маленький' },
                { value: 'normal', label: 'Обычный' },
                { value: 'font-large', label: 'Большой' }
              ]}
              description="Масштаб текста интерфейса."
            />
          </SettingsSection>

          <SettingsSection title="Практика" description="Персонализируйте интерактивные режимы.">
            <SettingsToggle
              label="Авто-переход"
              checked={settings.autoAdvance}
              onChange={(value) => updateSettings({ autoAdvance: value })}
              description="Автоматически переходить к следующей строке в режиме «Построчно»."
            />
            <SettingsOption
              label="Слова для флеш-карты"
              value={String(settings.flashPreviewWords)}
              onChange={(value) => {
                updateSettings({ flashPreviewWords: Number(value) });
                showToast('Количество слов обновлено');
              }}
              options={[2, 3, 4, 5, 6].map((c) => ({ value: String(c), label: `${c} слова` }))}
              description="Сколько слов видно на карточке перед раскрытием."
            />
            <SettingsOption
              label="Тест памяти"
              value={settings.memoryTestMode}
              onChange={(value) => updateSettings({ memoryTestMode: value })}
              options={[
                { value: 'lenient', label: 'Легкий' },
                { value: 'strict', label: 'Строгий' }
              ]}
              description="Насколько строго сравнивается введённый текст."
            />
            <SettingsToggle
              label="Показывать подсказки"
              checked={settings.showCompletionFeedback}
              onChange={(value) => updateSettings({ showCompletionFeedback: value })}
              description="Показывать сообщения об успехе и ошибках."
            />
          </SettingsSection>

          <SettingsSection title="Дополнительно" description="Сбросьте настройки или сохраните значения по умолчанию.">
            <button className="secondary-btn" onClick={() => {
              setSettings(defaultSettings);
              showToast('Настройки сброшены к default');
            }}>Сбросить настройки</button>
          </SettingsSection>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className={`page-shell ${rootFontClass}`}>
      <header className="app-header">
        <div ref={titleRef}>
          <p className="eyebrow">Студия запоминания стихов</p>
          <h1>Учите любое стихотворение быстрее</h1>
        </div>
        <div className="button-row">
          <button
            className="ghost-btn"
            onClick={() => {
              const next = settings.theme === 'light' ? 'dark' : 'light';
              updateSettings({ theme: next });
              showToast(next === 'dark' ? '🌙 Тёмная тема' : '☀️ Светлая тема');
            }}
          >
            {settings.theme === 'light' ? '🌙 Тёмная тема' : '☀️ Светлая тема'}
          </button>
          <button className="ghost-btn" onClick={() => setSettingsOpen(true)}>⚙️ Настройки</button>
        </div>
      </header>

      {settingsOpen && renderSettingsPanel()}

      {showCelebration && (
        <Celebration
          message="Стихотворение полностью изучено!"
          stats={{
            time: elapsedFormatted,
            attempts,
            methodsUsed: Object.keys(methodUsageCount).length || 1
          }}
          onClose={handleCelebrationClose}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Сбросить тренировку?"
          message="Текущий прогресс будет потерян. Вы сможете начать заново с новым стихотворением."
          confirmLabel="Сбросить"
          cancelLabel="Отмена"
          destructive
          onConfirm={confirmResetAction}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {!started ? (
        <section className="hero-card" ref={heroRef} aria-busy={loading}>
          {loading ? (
            <LoadingShell message="Подготавливаем практику..." />
          ) : (
            <>
              <p className="hero-subtitle">
                Вставьте стихотворение и выберите метод, который поможет запомнить его быстрее.
                Доступно {filteredMethods.length} методов практики.
              </p>
              <label className="field-label" htmlFor="poemInput">Ваше стихотворение</label>
              <textarea
                id="poemInput"
                value={poemInput}
                onChange={(e) => { setPoemInput(e.target.value); if (formError) setFormError(''); }}
                placeholder="Вставьте текст стихотворения здесь..."
              />
              {formError && <p className="form-error">{formError}</p>}
              <button className="primary-btn" onClick={startLearning} disabled={loading}>
                Начать учить
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="results-card" ref={boardRef} aria-busy={loading}>
          <div className="results-topbar">
            <div>
              <p className="eyebrow">Режим практики</p>
              <h2>{currentMethodLabel || poem.lines[0] || 'Ваше стихотворение'}</h2>
            </div>
            <button className="ghost-btn" onClick={resetPractice}>🔄 Другое стихотворение</button>
          </div>

          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label">{progress}%</span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Время</span>
              <strong>{elapsedFormatted}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Попытки</span>
              <strong>{attempts}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Завершено</span>
              <strong>{progress}%</strong>
            </div>
          </div>

          <div className="pill-group methods-tabs">
            {filteredMethods.length ? filteredMethods.map((method) => (
              <button
                key={method.id}
                className={`pill-btn ${currentMethod === method.id ? 'active' : ''}`}
                onClick={() => switchMethod(method.id)}
              >
                {method.label}
              </button>
            )) : <p className="settings-empty">Включите методы в настройках.</p>}
          </div>

          {renderMethodContent()}
        </section>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

