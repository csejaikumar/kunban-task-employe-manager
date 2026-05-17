const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Employee', 'Sub Admin'], default: 'Employee' },
  avatar: { type: String },
  password: { type: String, required: true }
}, { timestamps: true });

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

module.exports = mongoose.model('User', userSchema);
