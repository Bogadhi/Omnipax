import { Test } from '@nestjs/testing';
import { PaymentModule } from '../src/payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { MockPaymentProvider } from '../src/payment/providers/mock-payment.provider';
import { RazorpayPaymentProvider } from '../src/payment/providers/razorpay-payment.provider';

async function bootstrap() {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PaymentModule],
  }).compile();

  const provider = moduleRef.get('PAYMENT_PROVIDER');
  console.log('Payment Provider:', provider.constructor.name);
  
  const envProvider = process.env.PAYMENT_PROVIDER;
  console.log('Env PAYMENT_PROVIDER:', envProvider);

  if (envProvider === 'razorpay' && provider instanceof RazorpayPaymentProvider) {
      console.log('SUCCESS: Razorpay provider injected.');
  } else if ((!envProvider || envProvider === 'mock') && provider instanceof MockPaymentProvider) {
      console.log('SUCCESS: Mock provider injected.');
  } else {
      console.error('FAILURE: Incorrect provider injected.');
      process.exit(1);
  }
}
bootstrap();
