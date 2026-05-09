import mongoose, { Schema } from 'mongoose';

const userSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true, unique: true },
    isAdmin: { type: Boolean, default: false }
});

export default mongoose.model('User', userSchema);
