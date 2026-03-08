"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
const supertest_1 = __importDefault(require("supertest"));
const auth_service_1 = require("../../src/auth/auth.service");
async function loginUser(app, email, role = 'USER') {
    await (0, supertest_1.default)(app.getHttpServer()).post('/auth/otp/request').send({ email });
    const authService = app.get(auth_service_1.AuthService);
    const otps = authService.otps;
    const otp = otps.get(email);
    if (!otp) {
        throw new Error(`OTP not found for ${email}`);
    }
    const res = await (0, supertest_1.default)(app.getHttpServer())
        .post('/auth/login')
        .send({ email, otp });
    if (res.status !== 201 && res.status !== 200) {
        throw new Error(`Failed to login: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.access_token;
}
//# sourceMappingURL=auth-helper.js.map