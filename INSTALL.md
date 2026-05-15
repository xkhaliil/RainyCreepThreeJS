# Installation

## Requirements

- **Node.js v24** (see `.nvmrc` — run `nvm use` if you have nvm installed)
- npm (bundled with Node)

## Steps

```bash
# 1. Clone the repository
git clone https://github.com/xkhaliil/RainyCreepThreeJS.git
cd RainyCreepThreeJS

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

## Other Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Vite dev server with HMR           |
| `npm run build`   | Production build to `dist/`        |
| `npm run preview` | Serve the production build locally |

## Notes

- All assets (`.glb`, `.exr`, `.mp3`, textures) must be present in the `public/` folder. They are not tracked by git if you cloned a fresh copy — add them manually or obtain them from the project source.
- Audio autoplay is blocked by browsers until the user interacts with the page (mouse move, click, or key press). This is intentional and handled in code.
