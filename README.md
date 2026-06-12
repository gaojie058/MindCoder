# MindCoder

> AI-assisted qualitative coding that keeps human judgment at the center.

**[Website](https://mindcoder.ai)** · **[Live demo](https://demo.mindcoder.ai)**

---

MindCoder helps researchers code and analyze unstructured data (interview
transcripts, open-ended survey responses, field notes) with large language
models. It follows Saldaña's *Code-to-Theory* progression — raw data → initial
codes → categories → themes — and surfaces AI suggestions with source-text
attribution so the researcher stays in control of every coding decision.

You can start **inductively** (let codes emerge from the data) or **deductively**
(apply an existing codebook), and refine iteratively at any stage.

## Repository layout

This is a monorepo with three independently deployed parts:

| Path        | What it is                    | Stack                                  | Deployed to |
|-------------|-------------------------------|----------------------------------------|-------------|
| `landing/`  | Marketing / docs landing page | Static HTML                            | GitHub Pages → `mindcoder.ai` |
| `frontend/` | The application UI            | React + Vite + TypeScript              | Vercel → `demo.mindcoder.ai` |
| `backend/`  | Chat / coding API             | Node + TypeScript (Vercel serverless)  | Vercel |

The backend is provider-agnostic and supports **OpenAI, Anthropic, DeepSeek,
and Kimi (Moonshot)** behind a single API.

## Quick start (local)

### Backend

```bash
cd backend
npm install
npm start          # ts-node api/index.ts
```

Create `backend/.env` (never commit it — it is gitignored):

```bash
NODE_ENV=development
PORT=3000

# Provide at least one provider key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
KIMI_API_KEY=...
KIMI_BASE_URL=https://api.moonshot.cn/v1
MOONSHOT_API_KEY=...
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env` holds non-secret build config (which API the UI talks to):

```bash
VITE_USE_LOCAL_API=true
VITE_LOCAL_API_URL=http://localhost:3000/api/chat
VITE_PROD_API_URL=https://mind-coder-backend.vercel.app/api/chat
```

Set `VITE_USE_LOCAL_API=false` to point the UI at the deployed backend.

## Deployment

- **`landing/`** is published by `.github/workflows/pages.yml` whenever its files
  change on `main`. In repo **Settings → Pages**, set *Source* to **GitHub Actions**.
  The custom domain is carried by `landing/CNAME`.
- **`frontend/`** and **`backend/`** are each a Vercel project whose *Root
  Directory* is set to the respective folder. `backend/vercel.json` routes all
  requests to the `api/index.ts` serverless function.

## Citation

If you use MindCoder in your research, please cite this repository:

```bibtex
@software{mindcoder,
  title  = {MindCoder: AI-assisted qualitative coding},
  author = {Gao, Jie},
  year   = {2026},
  url    = {https://github.com/gaojie058/MindCoder-System}
}
```

## License

[MIT](LICENSE)
