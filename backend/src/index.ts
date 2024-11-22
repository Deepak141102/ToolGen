import express, { Request, Response, NextFunction } from 'express'; 
import dotenv from 'dotenv'; 
import cors from 'cors'; 
import winston from "winston"; 
import mysql from 'mysql2'; 
import routes from './routes/index.js'; 
import session from 'express-session'; 
import passport from 'passport'; 
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'; 
import path from 'path'; 

// Initialize environment variables
dotenv.config();

// Create an instance of the Express app
const app = express();
// Set the port for the server using an environment variable
const PORT: number = parseInt(process.env.PORT || '5000');

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// CORS configuration to allow cross-origin requests from the frontend
app.use(
    cors({
        credentials: true, // Allow cookies to be sent with requests
        origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000', // Allow requests only from the frontend's domain
    })
);

// Middleware to parse JSON request bodies
app.use(express.json());
// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Session middleware for managing user sessions
app.use(
    session({
        secret: process.env.COOKIE_SECRET || 'defaultsecret', // Provide a default value for development
        cookie: {
            secure: process.env.NODE_ENV === "production", // Secure cookies in production
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        resave: false, 
        saveUninitialized: false, 
    })
);

// Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport with Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '', 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

// Serialize user into session after successful login
passport.serializeUser((user, done) => {
    done(null, user); 
});

// Deserialize user from session on subsequent requests
passport.deserializeUser((obj, done) => {
    done(null, obj); 
});

// Logger setup using Winston to log both console and file
export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((data) => `${data.timestamp} ${data.level}: ${data.message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "logs/app.log" }),
    ],
});

// Middleware to log incoming requests using Winston
app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`Received a ${req.method} request for ${req.url}`);
    next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.sendStatus(200); 
});

// Add MySQL route
app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            res.status(500).send('Database query failed');
            return;
        }
        res.json(results);
    });
});

// Attach all routes defined in the routes folder
app.use(routes);

// Route to handle Google OAuth login
app.get("/auth/google",
    passport.authenticate("google", {
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    })
);

// Google OAuth callback route after login
app.get('/auth/google/callback',
    passport.authenticate("google", { session: true }),
    (req, res) => {
        res.redirect(`${process.env.FRONTEND_BASE_URL}`);
    }
);

// Route to handle user logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => { 
        if (err) return next(err);
        res.status(200).json({ message: 'Logged out successfully!' });
    });
});

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(new URL(import.meta.url).pathname); // Handle ES module scope issue
    
    app.use(express.static(path.join(__dirname, '../dist'))); // Serve static files from React build

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Start the server and log that it is running
const server = app.listen(PORT, () => {
    logger.info(`Server listening at http://localhost:${PORT}`);
});

// Error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(err); 
    logger.error(err.message);
    res.redirect(`${process.env.FRONTEND_BASE_URL}`);
});

// Handle uncaught exceptions and gracefully shut down the server
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    server.close(() => { 
        process.exit(1); 
    });
});
