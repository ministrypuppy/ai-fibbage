const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
let musicInterval = null;
let musicType = 'none';

function initAudio() { if (!actx) actx = new AudioCtx(); }

let voicesLoaded = false;
let selectedVoice = null;

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
    selectedVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

function speakHost(text, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  if (!voicesLoaded) loadVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = 1.05;
  utterance.pitch = 0.92;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

const hostQuips = {
  start: [
    "Welcome to Fool School! Let's see who can lie better than a used car salesperson.",
    "Alright, put your thinking caps on and your integrity in the trash. Game on!"
  ],
  postQuestion: [
    "Lock in those answers before I fall asleep and start dreaming about early retirement.",
    "Oh, this one's a classic stumper. Try not to embarrass yourselves too badly.",
    "Tick-tock, geniuses. Time is money, and your scores are currently bankrupt.",
    "That's a tricky prompt. Let's see whose creative fiction fools the room."
  ],
  postReveal: [
    "Ouch! Someone bought that lie hook, line, and sinker.",
    "The truth hurts almost as bad as a botched bluff. Let's look at the damage.",
    "And there it is! Absolute brilliance or total nonsense—you decide."
  ],
  gameOver: [
    "What a legendary session of fibbing and fooling. Let's check out the final leaderboard!",
    "School's out! Time to pack up your lies and head home."
  ]
};

function getRandomQuip(category) {
  const arr = hostQuips[category];
  return arr[Math.floor(Math.random() * arr.length)];
}

function playSound(type, isLouder = false) {
  initAudio();
  if (!actx) return;
  const now = actx.currentTime;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.connect(gain);
  gain.connect(actx.destination);
  let volumeMultiplier = isLouder ? 2.2 : 1.0;

  if (type === 'click') {
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    gain.gain.setValueAtTime(0.15 * volumeMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'tick') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, now);
    let tickGain = isLouder ? 0.18 : 0.05;
    gain.gain.setValueAtTime(tickGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  } else if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(783.99, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  }
}

function startBackgroundMusic(type) {
  stopBackgroundMusic();
  initAudio();
  if (!actx) return;
  musicType = type;
  let step = 0;
  const notesPlayful = [261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 329.63, 293.66];
  const notesHighStakes = [130.81, 155.56, 196.00, 233.08, 196.00, 155.56, 130.81, 110.00];

  musicInterval = setInterval(() => {
    if (!actx || isPaused) return;
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    const notes = (musicType === 'highstakes') ? notesHighStakes : notesPlayful;
    osc.type = (musicType === 'highstakes') ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(notes[step % notes.length], now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
    step++;
  }, 300);
}

function stopBackgroundMusic() {
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  musicType = 'none';
}

let isHost = false;
let isPaused = false;
let roomCode = '';
let myName = '';
let players = [];
let currentQ = null;
let currentQuestionIndex = 0; 
let timerInterval = null;
let timeLeft = 45;
let peer = null;
let hostConn = null;
let clientConns = [];
let pausedByPlayer = '';

const masterVault = [
  { cat: "Animal Oddities", q: "A group of flamingos is officially called a ____", truth: "Flamboyance", decoys: ["Patrol", "Blush", "Gleam"] },
  { cat: "Historical Weirdness", q: "In 1386, a pig in France was publicly executed for the murder of a ____", truth: "Child", decoys: ["Monk", "Noble", "Merchant"] },
  { cat: "Bizarre Laws", q: "In Kentucky, it is illegal to carry an ice cream cone in your ____", truth: "Back pocket", decoys: ["Handbag", "Hat", "Sock"] },
  { cat: "Medical Marvels", q: "The fear of long words is ironically known as hippopotomonstrosesquippedaliophobia or simply ____", truth: "Sesquipedaliophobia", decoys: ["Longwordphobia", "Lexiphobia", "Verbophobia"] },
  { cat: "Space Facts", q: "The footprints left on the Moon by Apollo astronauts will likely stay intact for millions of years because the moon lacks ____", truth: "Atmosphere", decoys: ["Gravity", "Water", "Sunlight"] },
  { cat: "Pop Culture Trivia", q: "Before becoming famous, actor Christopher Walken worked as a lion ____", truth: "Tamer", decoys: ["Feeder", "Trainer", "Keeper"] },
  { cat: "Geographic Quirks", q: "Point Nemo in the ocean is so remote that the closest humans are often astronauts aboard the ____", truth: "Space Station", decoys: ["Submarine", "Cruise ship", "Research rig"] },
  { cat: "Botanical Trivia", q: "Bananas are naturally curved because they grow upwards toward the ____", truth: "Sun", decoys: ["Sky", "Moon", "Cloud"] }
];

let sessionQuestionQueue = [];

function initializeQuestionSession() {
  let shuffled = JSON.parse(JSON.stringify(masterVault));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  sessionQuestionQueue = shuffled;
}

function getNextObscureQuestion() {
  if (sessionQuestionQueue.length === 0) {
    initializeQuestionSession(); 
  }
  return sessionQuestionQueue.pop();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateHostWatermarkVisibility() {
  const watermark = document.getElementById('host-watermark-footer');
  if (isHost && roomCode) {
    watermark.style.display = 'block';
    document.getElementById('watermark-room-code').innerText = roomCode;
  } else {
    watermark.style.display = 'none';
  }
}

function startTimer(elementId, seconds, onComplete) {
  clearInterval(timerInterval);
  timeLeft = seconds;
  isPaused = false;
  pausedByPlayer = '';
  updatePauseButtonUI();
  const el = document.getElementById(elementId);
  if (el) {
    el.style.display = 'inline-block';
    el.classList.remove('warning');
    el.innerText = timeLeft;
  }
  document.body.classList.remove('edge-flash');

  timerInterval = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    if (el) el.innerText = timeLeft;
    if (seconds === 45 && timeLeft <= 10) {
      if (el) el.classList.add('warning');
      document.body.classList.add('edge-flash');
      playSound('tick', true);
      broadcastSound('tick', true);
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.body.classList.remove('edge-flash');
      if (el) el.style.display = 'none';
      if (onComplete) onComplete();
    }
  }, 1000);
}

function stopTimer() { 
  clearInterval(timerInterval); 
  document.body.classList.remove('edge-flash');
}

function togglePauseGame() {
  const currentPlayerName = isHost ? "HOST" : myName;
  if (isPaused) {
    if (pausedByPlayer && pausedByPlayer !== currentPlayerName && !isHost) {
      alert(`Game was paused by ${pausedByPlayer}. Only they or the host can unpause.`);
      return;
    }
    isPaused = false;
    pausedByPlayer = '';
  } else {
    isPaused = true;
    pausedByPlayer = currentPlayerName;
  }
  updatePauseButtonUI();
  
  if (isHost) {
    broadcastToAll({ type: 'TOGGLE_PAUSE', isPaused, pausedByPlayer });
  } else if (hostConn && hostConn.open) {
    hostConn.send({ type: 'REQUEST_PAUSE', isPaused, pausedByPlayer });
  }
}

function updatePauseButtonUI() {
  const btn = document.getElementById('pause-game-btn');
  const currentPlayerName = isHost ? "HOST" : myName;
  if (isPaused) {
    if (pausedByPlayer && pausedByPlayer !== currentPlayerName && !isHost) {
      btn.innerText = `Paused by ${pausedByPlayer}`;
      btn.style.background = "#718093";
    } else {
      btn.innerText = "Resume Game";
      btn.style.background = "linear-gradient(135deg, #1dd1a1, #48dbfb)";
    }
  } else {
    btn.innerText = "Pause Game";
    btn.style.background = "linear-gradient(135deg, #ff4757, #ffa502)";
  }
}

function setGlobalControlBarVisible(visible) {
  document.getElementById('global-control-bar').style.display = visible ? 'flex' : 'none';
}

function broadcastToAll(data) {
  clientConns.forEach(c => { if(c && c.open) c.send(data); });
}
function broadcastSound(type, isLouder = false) {
  broadcastToAll({ type: 'PLAY_SOUND', sound: type, isLouder });
}

function openHostLobby() {
  initAudio();
  isHost = true;
  roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  myName = "HOST";
  players = [];
  clientConns = [];
  currentQuestionIndex = 0;
  initializeQuestionSession();

  updateHostWatermarkVisibility();
  document.getElementById('host-code-display').innerText = roomCode;
  document.getElementById('host-end-options').style.display = 'none';

  const startBtn = document.getElementById('btn-start-game');
  startBtn.disabled = false;
  startBtn.innerText = "Start Game";

  peer = new Peer('FS-' + roomCode);
  peer.on('open', () => {
    renderHostLobby();
    showScreen('screen-host-lobby');
    speakHost(getRandomQuip('start'));
  });

  peer.on('connection', (conn) => {
    clientConns.push(conn);
    conn.on('data', (data) => handleHostIncomingData(conn, data));
  });
}

function handleHostIncomingData(conn, data) {
  if (data.type === 'JOIN_REQ') {
    const existingPlayer = players.find(p => p.name === data.name);
    if (!existingPlayer) {
      players.push({ name: data.name, score: 0, currentLie: '', currentVote: '' });
      playSound('click');
      broadcastSound('click');
    } else {
      existingPlayer.connection = conn;
    }
    renderHostLobby();
    conn.send({ type: 'JOIN_OK' });
    broadcastToAll({ type: 'SYNC_PLAYERS', players });
  }
  if (data.type === 'SUBMIT_LIE') {
    const p = players.find(x => x.name === data.name);
    if (p) p.currentLie = data.lie;
    updateHostSubmissionTracker();
    broadcastToAll({ type: 'UPDATE_SUBMISSIONS', players });
    if (players.every(p => p.currentLie !== '')) startVotingStage();
  }
  if (data.type === 'SUBMIT_VOTE') {
    const p = players.find(x => x.name === data.name);
    if (p) p.currentVote = data.vote;
    if (players.every(p => p.currentVote !== '')) calculateAndShowReveal();
  }
  if (data.type === 'REQUEST_PAUSE') {
    if (data.isPaused) {
      isPaused = true;
      pausedByPlayer = data.pausedByPlayer;
    } else {
      if (pausedByPlayer === data.pausedByPlayer || data.pausedByPlayer === 'HOST' || isHost) {
        isPaused = false;
        pausedByPlayer = '';
      }
    }
    updatePauseButtonUI();
    broadcastToAll({ type: 'TOGGLE_PAUSE', isPaused, pausedByPlayer });
  }
  if (data.type === 'CONTINUE_REQ') {
    triggerNextStageFromContinue();
  }
}

function updateHostSubmissionTracker() {
  const container = document.getElementById('host-sub-list');
  container.innerHTML = players.map(p => {
    const submitted = p.currentLie !== '';
    return `<div style="font-size:0.9rem; display:flex; justify-content:space-between; background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:6px;">
      <span>${p.name}</span>
      <span style="color: ${submitted ? '#1dd1a1' : '#ff6b6b'}; font-weight:700;">${submitted ? '✓ Submitted' : '⏳ Thinking...'}</span>
    </div>`;
  }).join('');
}

function renderHostLobby() {
  document.getElementById('player-count').innerText = players.length;
  document.getElementById('host-player-list').innerHTML = players.map(p => `<div class="player-chip">${p.name}</div>`).join('');
}

function addBotPlayer() {
  initAudio();
  playSound('click');
  broadcastSound('click');
  players.push({ name: "Bot_" + (players.length + 1), score: 0, currentLie: '', currentVote: '' });
  renderHostLobby();
  broadcastToAll({ type: 'SYNC_PLAYERS', players });
}

function openJoinScreen() {
  initAudio();
  playSound('click');
  isHost = false;
  updateHostWatermarkVisibility();
  showScreen('screen-join');
}

function submitPlayerJoin() {
  initAudio();
  playSound('click');
  myName = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();

  if (!myName || !code) return alert("Please enter your name and room code!");
  localStorage.setItem('fs_room', code);
  localStorage.setItem('fs_name', myName);

  showScreen('screen-player-wait');
  document.getElementById('player-welcome-msg').innerText = `Connecting to room ${code}...`;

  peer = new Peer();
  peer.on('open', () => {
    hostConn = peer.connect('FS-' + code);
    hostConn.on('open', () => {
      document.getElementById('player-welcome-msg').innerText = `Connected! Waiting for host to start...`;
      hostConn.send({ type: 'JOIN_REQ', name: myName });
    });
    hostConn.on('data', (data) => handleClientIncomingData(data));
  });
}

window.addEventListener('load', () => {
  const savedRoom = localStorage.getItem('fs_room');
  const savedName = localStorage.getItem('fs_name');
  if (savedRoom && savedName && !isHost) {
    document.getElementById('join-code').value = savedRoom;
    document.getElementById('join-name').value = savedName;
  }
});

function handleClientIncomingData(data) {
  if (data.type === 'SYNC_PLAYERS') players = data.players;
  if (data.type === 'PLAY_SOUND') playSound(data.sound, data.isLouder);
  if (data.type === 'TOGGLE_PAUSE') {
    isPaused = data.isPaused;
    pausedByPlayer = data.pausedByPlayer;
    updatePauseButtonUI();
  }
  if (data.type === 'UPDATE_SUBMISSIONS') {
    players = data.players;
    updateHostSubmissionTracker();
  }
  if (data.type === 'START_Q') {
    currentQ = data.question;
    currentQuestionIndex = data.qIndex;
    players = data.players;
    setupSubmitLieScreen();
  }
  if (data.type === 'START_VOTE') {
    players = data.players;
    setupVotingScreen(data.choices);
  }
  if (data.type === 'START_REVEAL') {
    players = data.players;
    setupRevealScreen();
  }
  if (data.type === 'START_SCORES') {
    players = data.players;
    setupScoresScreen();
  }
}

function startFibbageGame() {
  playSound('click');
  broadcastSound('click');
  if (players.length === 0) addBotPlayer();
  currentQuestionIndex = 0;
  initializeQuestionSession();
  nextQuestion();
}

function nextQuestion() {
  setGlobalControlBarVisible(false);
  if (currentQuestionIndex >= 6) {
    processGameOverSequence();
    return;
  }

  currentQ = getNextObscureQuestion();
  
  players.forEach(p => { p.currentLie = ''; p.currentVote = ''; });

  const botDecoys = [...currentQ.decoys].sort(() => Math.random() - 0.5);
  players.filter(p => p.name.startsWith('Bot_')).forEach((b, i) => {
    b.currentLie = botDecoys[i % botDecoys.length] || "Unknown";
  });

  if (currentQuestionIndex === 5) {
    document.body.classList.add('final-round');
    startBackgroundMusic('highstakes');
  } else {
    document.body.classList.remove('final-round');
    startBackgroundMusic('playful');
  }

  broadcastToAll({ type: 'START_Q', question: currentQ, qIndex: currentQuestionIndex, players });
  setupSubmitLieScreen();
}

function setupSubmitLieScreen() {
  showScreen('screen-submit-lie');
  setGlobalControlBarVisible(false);
  
  let roundText = "ROUND 1";
  let multiplierText = "1x Points";
  if (currentQuestionIndex >= 3 && currentQuestionIndex <= 4) {
    roundText = "ROUND 2";
    multiplierText = "2x Points";
  } else if (currentQuestionIndex === 5) {
    roundText = "FINAL ROUND";
    multiplierText = "3x Points";
  }

  document.getElementById('round-indicator').innerText = `${roundText} (${multiplierText})`;
  document.getElementById('question-cat').innerText = currentQ.cat;
  document.getElementById('question-prompt-submit').innerHTML = currentQ.q.replace('____', '<span class="blank-hl">________</span>');

  if (isHost) {
    document.getElementById('lie-input-container').style.display = 'none';
    document.getElementById('lie-submitted-msg').style.display = 'none';
    document.getElementById('host-submission-status').style.display = 'block';
    updateHostSubmissionTracker();
    speakHost(getRandomQuip('postQuestion'));
  } else {
    document.getElementById('lie-input-container').style.display = 'block';
    document.getElementById('lie-submitted-msg').style.display = 'none';
    document.getElementById('host-submission-status').style.display = 'none';
    document.getElementById('user-lie-input').value = '';
    document.getElementById('user-lie-input').disabled = false;
  }

  startTimer('timer-lie', 45, () => {
    if (isHost) forceCompleteLies();
  });
}

function submitLie() {
  const input = document.getElementById('user-lie-input');
  const val = input.value.trim();
  if (!val) return alert("Please type an answer!");
  if (val.length > 20) return alert("Answer must be under 20 characters!");
  if (val.toLowerCase() === currentQ.truth.toLowerCase()) return alert("That's the actual truth! Try making up a lie.");

  playSound('click');
  input.disabled = true;
  document.getElementById('lie-input-container').style.display = 'none';
  document.getElementById('lie-submitted-msg').style.display = 'block';

  if (isHost) {
    const p = players.find(x => x.name === myName);
    if (p) p.currentLie = val;
    updateHostSubmissionTracker();
    if (players.every(p => p.currentLie !== '')) startVotingStage();
  } else if (hostConn && hostConn.open) {
    hostConn.send({ type: 'SUBMIT_LIE', name: myName, lie: val });
  }
}

function forceCompleteLies() {
  players.forEach(p => { if (!p.currentLie) p.currentLie = currentQ.decoys[0]; });
  startVotingStage();
}

let activeChoices = [];

function startVotingStage() {
  stopTimer();
  let lies = players.map(p => p.currentLie).filter(l => l && l.toLowerCase() !== currentQ.truth.toLowerCase());
  let combined = [currentQ.truth, ...currentQ.decoys, ...lies];
  let uniqueChoices = [...new Set(combined)];
  activeChoices = uniqueChoices.sort(() => Math.random() - 0.5);
  players.forEach(p => p.currentVote = '');

  players.filter(p => p.name.startsWith('Bot_')).forEach(b => {
    let validChoices = activeChoices.filter(c => c.toLowerCase() !== b.currentLie.toLowerCase());
    b.currentVote = validChoices[Math.floor(Math.random() * validChoices.length)] || activeChoices[0];
  });

  broadcastToAll({ type: 'START_VOTE', choices: activeChoices, players });
  setupVotingScreen(activeChoices);
}

function setupVotingScreen(choices) {
  showScreen('screen-vote');
  setGlobalControlBarVisible(false);
  
  document.getElementById('question-prompt-vote').innerHTML = currentQ.q.replace('____', '<span class="blank-hl">________</span>');
  
  const container = document.getElementById('choices-container');
  
  if (isHost) {
    container.innerHTML = `<p class="subtitle" style="text-align:center;">Players are voting on the choices...</p>` + 
      choices.map(c => `<div class="choice-btn" style="cursor:default;">${c}</div>`).join('');
  } else {
    document.getElementById('vote-submitted-msg').style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = choices.map(c => `<button class="choice-btn" onclick="submitVote('${c.replace(/'/g, "\\'")}')">${c}</button>`).join('');
  }

  startTimer('timer-vote', 45, () => {
    if (isHost) forceCompleteVotes();
  });
}

function submitVote(choice) {
  playSound('click');
  document.getElementById('choices-container').style.display = 'none';
  document.getElementById('vote-submitted-msg').style.display = 'block';

  if (isHost) {
    const p = players.find(x => x.name === myName);
    if (p) p.currentVote = choice;
    if (players.every(p => p.currentVote !== '')) calculateAndShowReveal();
  } else if (hostConn && hostConn.open) {
    hostConn.send({ type: 'SUBMIT_VOTE', name: myName, vote: choice });
  }
}

function forceCompleteVotes() {
  players.forEach(p => { if (!p.currentVote) p.currentVote = activeChoices[0]; });
  calculateAndShowReveal();
}

let revealDataSequence = [];

function calculateAndShowReveal() {
  stopTimer();
  let multiplier = (currentQuestionIndex >= 3 && currentQuestionIndex <= 4) ? 2 : ((currentQuestionIndex === 5) ? 3 : 1);

  players.forEach(p => {
    if (p.currentVote && p.currentVote.toLowerCase() === currentQ.truth.toLowerCase()) {
      p.score += (1000 * multiplier);
    } else {
      let author = players.find(x => x.currentLie && x.currentLie.toLowerCase() === p.currentVote.toLowerCase());
      if (author && author.name !== p.name) {
        author.score += (500 * multiplier);
      }
    }
  });

  revealDataSequence = activeChoices.filter(c => c.toLowerCase() === currentQ.truth.toLowerCase()).map(choice => {
    let voters = players.filter(x => x.currentVote && x.currentVote.toLowerCase() === choice.toLowerCase()).map(x => x.name);
    return { choice, isTruth: true, authorName: "THE TRUTH", voters };
  });

  broadcastToAll({ type: 'START_REVEAL', players });
  setupRevealScreen();
}

function setupRevealScreen() {
  showScreen('screen-reveal');
  setGlobalControlBarVisible(true);

  const container = document.getElementById('reveal-container');
  
  let html = revealDataSequence.map(item => `
    <div class="reveal-card truth">
      <div class="reveal-answer">Correct Answer: ${item.choice}</div>
      <div class="reveal-voters">${item.voters.length > 0 ? 'Correctly Guessed By: ' + item.voters.join(', ') : 'Nobody got it right!'}</div>
    </div>
  `).join('');

  html += `<h3 style="margin-top:20px; color:#feca57; font-size:1rem;">Submitted Player Lies:</h3><div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">`;
  players.forEach(p => {
    if (p.currentLie && p.currentLie.toLowerCase() !== currentQ.truth.toLowerCase()) {
      let fooledBy = players.filter(x => x.currentVote && x.currentVote.toLowerCase() === p.currentLie.toLowerCase()).map(x => x.name);
      html += `<div style="background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; text-align:left; font-size:0.9rem;">
        <span style="color:#48dbfb; font-weight:700;">"${p.currentLie}"</span> <span style="font-size:0.8rem; color:#a0a0c0;">(${p.name})</span>
        ${fooledBy.length > 0 ? `<div style="color:#1dd1a1; font-size:0.75rem; margin-top:2px;">Fooled: ${fooledBy.join(', ')}</div>` : ''}
      </div>`;
    }
  });
  html += `</div>`;

  container.innerHTML = html;

  if (isHost) {
    speakHost(getRandomQuip('postReveal'));
  }

  startTimer('timer-reveal', 10, () => {
    if (isHost) triggerScoreScreen();
  });
}

function triggerScoreScreen() {
  stopTimer();
  broadcastToAll({ type: 'START_SCORES', players });
  setupScoresScreen();
}

function setupScoresScreen() {
  showScreen('screen-scores');
  setGlobalControlBarVisible(true);

  const container = document.getElementById('leaderboard-container');
  
  let sorted = [...players].sort((a,b) => b.score - a.score);
  let leaderboardHtml = sorted.map((p, idx) => `
    <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.3); padding:10px 15px; border-radius:10px; margin-bottom:8px; font-weight:700;">
      <span>#${idx + 1} ${p.name}</span>
      <span style="color:#feca57;">${p.score} pts</span>
    </div>
  `).join('');

  leaderboardHtml += `<div style="margin-top: 20px; text-align: left; background: rgba(0,0,0,0.25); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
    <h4 style="color: #feca57; margin-bottom: 8px; font-size: 0.95rem;">Player Lies This Round:</h4>
    <div style="display: flex; flex-direction: column; gap: 6px;">`;
  
  players.forEach(p => {
    let lieText = p.currentLie ? `"${p.currentLie}"` : "No lie submitted";
    leaderboardHtml += `<div style="font-size: 0.85rem; color: #a0a0c0;">
      <strong style="color: #48dbfb;">${p.name}</strong>: ${lieText}
    </div>`;
  });
  leaderboardHtml += `</div></div>`;

  container.innerHTML = leaderboardHtml;

  const endOptionsDiv = document.getElementById('host-end-options');
  const continueContainer = document.getElementById('score-continue-container');

  if (currentQuestionIndex >= 5) {
    continueContainer.style.display = 'none';
    endOptionsDiv.style.display = 'flex';
    if (isHost) {
      speakHost(getRandomQuip('gameOver'));
    }
  } else {
    continueContainer.style.display = 'block';
    endOptionsDiv.style.display = 'none';
  }

  startTimer('timer-score', 10, () => {
    if (isHost && currentQuestionIndex < 5) {
      currentQuestionIndex++;
      nextQuestion();
    }
  });
}

function sendContinueSignal() {
  playSound('click');
  if (isHost) {
    triggerNextStageFromContinue();
  } else if (hostConn && hostConn.open) {
    hostConn.send({ type: 'CONTINUE_REQ' });
  }
}

function triggerNextStageFromContinue() {
  stopTimer();
  if (document.getElementById('screen-reveal').classList.contains('active')) {
    triggerScoreScreen();
  } else if (document.getElementById('screen-scores').classList.contains('active')) {
    currentQuestionIndex++;
    nextQuestion();
  }
}

function processGameOverSequence() {
  stopBackgroundMusic();
}

function restartSamePlayers() {
  playSound('click');
  currentQuestionIndex = 0;
  players.forEach(p => { p.score = 0; p.currentLie = ''; p.currentVote = ''; });
  initializeQuestionSession(); 
  nextQuestion();
}

function restartNewPlayers() {
  location.reload();
}