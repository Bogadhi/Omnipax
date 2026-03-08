"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const client_1 = require("@prisma/client");
const jwt = __importStar(require("jsonwebtoken"));
dotenv.config();
const prisma = new client_1.PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
async function runTest() {
    console.log('Testing Recommendation Engine...');
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('No user found');
        return;
    }
    const token = jwt.sign({ sub: user.id, email: user.email, role: 'USER' }, JWT_SECRET);
    try {
        const start = Date.now();
        const res = await axios_1.default.get(`${API_URL}/recommendations`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const duration = Date.now() - start;
        console.log(`Status: ${res.status}`);
        console.log(`Duration: ${duration}ms`);
        console.log('Recommendations:', res.data.length);
        if (res.data.length > 0) {
            console.log('Top Recommendation:', res.data[0].event.title, 'Score:', res.data[0].score);
        }
    }
    catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', JSON.stringify(err.response.data));
        }
    }
}
runTest();
//# sourceMappingURL=test-recommendation.js.map