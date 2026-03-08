"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const payment_module_1 = require("../src/payment/payment.module");
const config_1 = require("@nestjs/config");
const mock_payment_provider_1 = require("../src/payment/providers/mock-payment.provider");
const razorpay_payment_provider_1 = require("../src/payment/providers/razorpay-payment.provider");
async function bootstrap() {
    const moduleRef = await testing_1.Test.createTestingModule({
        imports: [config_1.ConfigModule.forRoot({ isGlobal: true }), payment_module_1.PaymentModule],
    }).compile();
    const provider = moduleRef.get('PAYMENT_PROVIDER');
    console.log('Payment Provider:', provider.constructor.name);
    const envProvider = process.env.PAYMENT_PROVIDER;
    console.log('Env PAYMENT_PROVIDER:', envProvider);
    if (envProvider === 'razorpay' && provider instanceof razorpay_payment_provider_1.RazorpayPaymentProvider) {
        console.log('SUCCESS: Razorpay provider injected.');
    }
    else if ((!envProvider || envProvider === 'mock') && provider instanceof mock_payment_provider_1.MockPaymentProvider) {
        console.log('SUCCESS: Mock provider injected.');
    }
    else {
        console.error('FAILURE: Incorrect provider injected.');
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=verify-payment-provider.js.map