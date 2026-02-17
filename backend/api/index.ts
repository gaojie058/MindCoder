import express, { Express, Request, Response } from "express";
import chatRouter from './routes/chat';
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app: Express = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("MindCoder API — running on Vercel");
});

app.use('/api', chatRouter);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

// Export for Vercel serverless
export default app;
