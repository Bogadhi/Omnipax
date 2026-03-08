import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: Number(this.configService.get<number>('MAIL_PORT')),
      secure: false, // IMPORTANT for Mailtrap 2525
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Mailtrap SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('Mailtrap SMTP connection failed');
      this.logger.error(error);
    }
  }

  @Process('booking-confirmation')
  async handleBookingConfirmation(job: Job<{ bookingId: string }>) {
    const { bookingId } = job.data;

    this.logger.log(
      `Processing confirmation email for booking ${bookingId}`,
    );

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: 'test@starpass.dev', // Mailtrap sandbox captures all emails
        subject: '🎟 Booking Confirmed - StarPass',
        html: `
          <h2>Booking Confirmed 🎉</h2>
          <p>Your booking ID is:</p>
          <h3>${bookingId}</h3>
          <p>Thank you for booking with StarPass.</p>
        `,
      });

      this.logger.log(
        `Email sent successfully for booking ${bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email for booking ${bookingId}`,
      );
      this.logger.error(error);
      throw error;
    }
  }
}
