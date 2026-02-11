import { Schema } from 'mongoose';

export const ProcessedEventSchema = new Schema(
    {
        eventId: {
            type: String,
            required: true,
            index: true,
        },
        handlerName: {
            type: String,
            required: true,
            default: 'default',
        },
        processedAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    {
        collection: 'processed_events',
        timestamps: false,
    },
);

// Compound unique index to prevent duplicate processing
ProcessedEventSchema.index(
    { eventId: 1, handlerName: 1 },
    { unique: true },
);

// TTL index for automatic cleanup (optional - 30 days)
ProcessedEventSchema.index(
    { processedAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }, // 30 days
);
