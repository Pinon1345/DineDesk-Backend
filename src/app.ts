// src/app.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import restaurantRoutes from './routes/restaurant.routes.js';
import menuRoutes from './routes/menu.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import socialRoutes from './routes/social.routes.js';
import adminRoutes from './routes/admin.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import userRoutes from './routes/user.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
const app = express();


// Security & Parsing Middlewares

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());




// Mount Routes



// Firstly, Routes for Authentication, then for Restaurants, and finally for Menu Items

app.use('/api/v1/auth', authRoutes);

// Secondly, mount the restaurant routes after the authentication routes

app.use('/api/v1/restaurants', restaurantRoutes);

// Thirdly, mount the menu routes after the restaurant routes

app.use('/api/v1/menus', menuRoutes);

// Fourthly, mount the cart routes after the menu routes

app.use('/api/v1/cart', cartRoutes);

// Fifthly, mount the order routes after the cart routes

app.use('/api/v1/orders', orderRoutes);

// Sixthly, mount the social routes after the order routes

app.use('/api/v1/social', socialRoutes);

// Seventh, mount the webhook routes after the social routes

app.use('/api/v1/webhook', webhookRoutes);

// Eighthly, mount the admin routes after the webhook routes

app.use('/api/v1', adminRoutes);

// Ninthly, mount the user routes after the admin routes

app.use('/api/v1/users', userRoutes);

// Tenthly, mount the reservation routes after the user routes

app.use('/api/v1/reservations', reservationRoutes);



// Root & Health Check

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to DineDesk Backend API',
        docs: '/api/v1',
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;