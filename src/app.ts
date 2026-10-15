import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to DineDesk Backend API',
        docs: '/api/v1',
    });
});
// test

// Health check endpoint

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;