const state = { query: '', filter: 'all', letter: 'all' };

const glossaryEl = document.querySelector('#glossary');
const searchInput = document.querySelector('#searchInput');
const countEl = document.querySelector('#count');
const alphabetEl = document.querySelector('#alphabet');
const resetBtn = document.querySelector('#resetBtn');
const filterBtns = [...document.querySelectorAll('.filter')];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstLetter(entry) {
  return /^\d/.test(entry.lemma) ? '0-9' : entry.lemma[0].toUpperCase();
}

function normalize(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function exampleText(example) {
  return typeof example === 'string' ? example : example.testo;
}

function buildAlphabet() {
  const letters = ['Tutte', ...new Set(GLOSSARIO.map(firstLetter))];
  alphabetEl.innerHTML = letters.map(letter => {
    const value = letter === 'Tutte' ? 'all' : letter;
    return `<button class="letter ${value === state.letter ? 'active' : ''}" data-letter="${value}">${letter}</button>`;
  }).join('');
}

function matchesSearch(entry) {
  const haystack = normalize([
    entry.lemma,
    entry.varianti.join(' '),
    entry.etimo,
    entry.marca,
    entry.definizione,
    entry.riferimento,
    entry.esempi.map(exampleText).join(' ')
  ].join(' '));
  return haystack.includes(normalize(state.query));
}

function filteredEntries() {
  return GLOSSARIO.filter(entry => {
    const okSearch = !state.query || matchesSearch(entry);
    const okGenre = state.filter === 'all' || entry.genere;
    const okLetter = state.letter === 'all' || firstLetter(entry) === state.letter;
    return okSearch && okGenre && okLetter;
  });
}

function splitDefinitionSenses(entry) {
  const parts = String(entry.definizione)
    .split(/;\s+(?=\d+\.)|(?<=’)\s+(?=\d+\.)/g)
    .map(part => part.trim())
    .filter(Boolean);

  return parts.map((part, index) => {
    if (index === 0) {
      return {
        meta: entry.marca,
        definition: part
      };
    }

    const quoteIndex = part.indexOf('‘');

    if (quoteIndex === -1) {
      return {
        meta: '',
        definition: part
      };
    }

    return {
      meta: part.slice(0, quoteIndex).trim(),
      definition: part.slice(quoteIndex).trim()
    };
  });
}

function renderDefinitions(entry) {
  return `
    <div class="senses">
      ${splitDefinitionSenses(entry).map(sense => `
        <div class="sense">
          ${sense.meta ? `<p class="meta">${escapeHtml(sense.meta)}</p>` : ''}
          <p class="definition">${escapeHtml(sense.definition)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function renderLinkedSource(line, link) {
  if (!link) return escapeHtml(line);

  const match = line.match(/^(.*)\(([^()]*(?:\d{4}|s\.d\.|s\. d\.)[^()]*)\)([.\s]*)$/);

  if (!match) {
    return `${escapeHtml(line)} <a class="source-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">↗ fonte</a>`;
  }

  return `${escapeHtml(match[1])}(<a class="source-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[2])}</a>)${escapeHtml(match[3])}`;
}

function renderExample(example) {
  const line = exampleText(example);
  const link = typeof example === 'object' ? example.link : '';
  const match = line.match(/^([^:]+):\s*(.*)$/);

  if (!match) {
    return `<p class="example">${renderLinkedSource(line, link)}</p>`;
  }

  return `<p class="example"><strong>${escapeHtml(match[1])}:</strong> ${renderLinkedSource(match[2], link)}</p>`;
}

function renderEntry(entry) {
  const variants = entry.varianti.length ? `<span class="variants">o ${escapeHtml(entry.varianti.join(', '))}</span>` : '';
  const genre = entry.genere ? '<span class="genre">(g)</span>' : '';
  const reference = entry.riferimento ? `<p class="reference">${escapeHtml(entry.riferimento)}</p>` : '';

  return `
    <article class="entry" id="${encodeURIComponent(entry.lemma)}">
      <header class="entry__top">
        <span class="lemma">${escapeHtml(entry.lemma)}</span>
        ${variants}
        ${genre}
        <span class="etimo">[${escapeHtml(entry.etimo)}]</span>
      </header>

      ${renderDefinitions(entry)}

      ${reference}

      <div class="examples">
        ${entry.esempi.map(renderExample).join('')}
      </div>
    </article>`;
}

function render() {
  const entries = filteredEntries();

  countEl.textContent = entries.length;

  glossaryEl.innerHTML = entries.length
    ? entries.map(renderEntry).join('')
    : '<div class="empty">Nessuna voce trovata con i filtri attuali.</div>';

  filterBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === state.filter));

  buildAlphabet();
}

searchInput.addEventListener('input', event => {
  state.query = event.target.value.trim();
  render();
});

filterBtns.forEach(btn => btn.addEventListener('click', () => {
  state.filter = btn.dataset.filter;
  render();
}));

alphabetEl.addEventListener('click', event => {
  const btn = event.target.closest('.letter');
  if (!btn) return;

  state.letter = btn.dataset.letter;
  render();
});

resetBtn.addEventListener('click', () => {
  state.query = '';
  state.filter = 'all';
  state.letter = 'all';
  searchInput.value = '';
  render();
});

render();
