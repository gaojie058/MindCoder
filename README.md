![logo](frontend/src/assets/logo.png)
Before runing, add a `.env` file in the backend directory by doing the following:

```
NODE_ENV=development
PORT = 3000
OPENAI_API_KEY='your openAI api key'
```

frontend env:
```
VITE_PORT = 3000
VITE_API_URL = http://localhost:3000/api/chat
```


Notes:

- `PORT`: the port which the server listens on
- `OPENAI_API_KEY`: OpenAI API Key `sk-xxxxxxxxxxxxxxxxxxxxxxxxx`

---

# Run
```
cd backend

# Launch the backend in development mode
npm install
npm start
```

```
cd frontend

# Launch the frontend in development mode
npm install
npm run dev
```

