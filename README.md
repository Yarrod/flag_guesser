# Flag Guesser (React + TypeScript + Vite)

Child-friendly flag guessing game for browser play (including Steam Deck), deployable as a static site to GitHub Pages.

## Features

- Czech and English UI/game language switch
- Pre-recorded country-name audio (CS + EN) from `public/`
- Pre-recorded feedback audio (correct/wrong) from `public/`
- 3 / 6 / 9 answer grid size selection
- Keyboard support (arrows, Enter, Space)
- Touch/mouse friendly large cards
- Light and dark mode toggle
- No backend (fully static)

## Open in VS Code Dev Container

1. Open this folder in VS Code.
2. Run **Dev Containers: Reopen in Container**.
3. The container runs `npm install` automatically.

## Run locally

```bash
npm install
npm run dev
```

App URL: `http://localhost:5173`

## NPM scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - ESLint

## Data and assets

Main data file:

- `src/data/flags.ts`

Each country includes:

- `id`
- `czechName`
- `englishName`
- `imagePath`
- `audioPath` (Czech)
- `audioPathEn` (English)

Asset locations:

- Flags: `public/flags/*.png`
- Czech names: `public/audio/names/*.mp3`
- English names: `public/audio/names-en/*.mp3`
- Czech feedback: `public/audio/feedback/correct.mp3`, `public/audio/feedback/wrong.mp3`, `public/audio/feedback/selected-cs.mp3`
- English feedback: `public/audio/feedback/correct-en.mp3`, `public/audio/feedback/wrong-en.mp3`, `public/audio/feedback/selected-en.mp3`

## Regenerate audio/assets

Project includes Python generators:

- `scripts/generate_assets.py` (Czech names + flag downloads + base data)
- `scripts/generate_english_assets.py` (English names + EN feedback + bilingual data update)

Run with local venv:

```bash
python3 -m venv .venv
.venv/bin/pip install gTTS requests
.venv/bin/python scripts/generate_assets.py
.venv/bin/python scripts/generate_english_assets.py
```

## Generate voice with Python (manual)

If you want to generate or update specific voice clips manually:

### 1) Setup Python env

```bash
python3 -m venv .venv
.venv/bin/pip install gTTS
```

### 2) Generate one country-name clip

```bash
.venv/bin/python - << 'PY'
from gtts import gTTS

# Czech example
text = 'Česko'
out = 'public/audio/names/cz.mp3'
gTTS(text=text, lang='cs').save(out)
print('Saved', out)
PY
```

English example:

```bash
.venv/bin/python - << 'PY'
from gtts import gTTS

text = 'Czechia'
out = 'public/audio/names-en/cz.mp3'
gTTS(text=text, lang='en').save(out)
print('Saved', out)
PY
```

### 3) Generate feedback clips

```bash
.venv/bin/python - << 'PY'
from gtts import gTTS
from pathlib import Path

base = Path('public/audio/feedback')
base.mkdir(parents=True, exist_ok=True)

gTTS(text='Správně!', lang='cs').save(str(base / 'correct.mp3'))
gTTS(text='Špatně!', lang='cs').save(str(base / 'wrong.mp3'))
gTTS(text='Vybral jsi zemi, která se jmenuje', lang='cs').save(str(base / 'selected-cs.mp3'))

gTTS(text='Correct!', lang='en').save(str(base / 'correct-en.mp3'))
gTTS(text='Wrong!', lang='en').save(str(base / 'wrong-en.mp3'))
gTTS(text='You selected', lang='en').save(str(base / 'selected-en.mp3'))

print('Feedback clips generated.')
PY
```

### 4) Keep file names consistent

- Country clips must match the country `id` from `src/data/flags.ts`
- Czech: `public/audio/names/<id>.mp3`
- English: `public/audio/names-en/<id>.mp3`

## GitHub Pages deployment

Workflow file:

- `.github/workflows/deploy.yml`

### 1) Set Vite base path

In `vite.config.ts`:

```ts
const repoName = 'flag-game';
base: mode === 'production' ? `/${repoName}/` : '/';
```

Set `repoName` to your real repository name.

### 2) Push and enable Pages

1. Push to `main`.
2. GitHub repo → `Settings` → `Pages` → `Build and deployment` → choose `GitHub Actions`.
3. Workflow will build and deploy automatically on push to `main`.

## Controls

- Mouse/touch: select flag
- Arrows: move focus
- Enter / Space: answer
- Replay button: replay current country name

## Notes

- This project is static-only, no server required.
- If audio files are missing/invalid, playback may silently fail depending on browser policy.
