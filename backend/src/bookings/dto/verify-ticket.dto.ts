import { IsString, MinLength } from 'class-validator';

export class VerifyTicketDto {
  @IsString()
  @MinLength(6)
  ticketCode!: string;
}
