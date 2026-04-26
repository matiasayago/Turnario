const mongoose = require('mongoose');

/**
 * Mensajes 1:1 entre usuarios de la app Expo (cliente, profesional, admin).
 * conversationKey = [idMenor]_[idMayor] (ObjectId string) para agrupar hilos.
 */
const expoChatMessageSchema = new mongoose.Schema(
  {
    conversationKey: { type: String, required: true, index: true, trim: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, default: '', trim: true },
    receiverName: { type: String, default: '', trim: true },
    senderType: { type: String, default: 'client' },
    receiverType: { type: String, default: 'client' },
    content: { type: String, required: true, trim: true, maxlength: 8000 },
    messageType: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
    readByReceiver: { type: Boolean, default: false },
  },
  { timestamps: true }
);

expoChatMessageSchema.index({ conversationKey: 1, createdAt: -1 });
expoChatMessageSchema.index({ senderId: 1, createdAt: -1 });
expoChatMessageSchema.index({ receiverId: 1, readByReceiver: 1 });

module.exports =
  mongoose.models.ExpoChatMessage ||
  mongoose.model('ExpoChatMessage', expoChatMessageSchema);
