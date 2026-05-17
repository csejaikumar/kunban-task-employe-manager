const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shareToken: { type: String, unique: true, sparse: true }
}, { timestamps: true });

projectSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

module.exports = mongoose.model('Project', projectSchema);
