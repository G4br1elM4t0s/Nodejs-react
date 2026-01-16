import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, MaxLength, IsIn } from 'class-validator';

/**
 * DTO para criação de transação
 * Valida os dados de entrada da API
 */
export class CreateTransactionDto {
  @IsNotEmpty({ message: 'Idempotency key is required' })
  @IsString()
  idempotencyKey: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must have at most 2 decimal places' })
  @Min(0.01, { message: 'Amount must be greater than zero' })
  amount: number;

  @IsOptional()
  @IsString()
  @IsIn(['BRL', 'USD', 'EUR'], { message: 'Currency must be BRL, USD or EUR' })
  currency?: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MaxLength(200, { message: 'Description must be at most 200 characters' })
  description: string;
}
