// src/index.js
import express, { Express, Request, Response } from "express";
import chatRouter from './routes/chat';
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

// Use the routes
app.use('/api', chatRouter);

app.use((req, res, next) => {
  console.log('Request Body:', req.body);
  next();
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});