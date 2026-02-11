import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'bank_accounts_view' })
export class BankAccountView extends Document {
  @Prop()
  _id: string;

  @Prop({ required: true })
  holderName: string;

  @Prop({ required: true })
  balance: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  openedAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const BankAccountViewSchema =
  SchemaFactory.createForClass(BankAccountView);
