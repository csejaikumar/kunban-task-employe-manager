const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['Todo', 'In Progress', 'Review', 'Done'], 
    default: 'Todo' 
  },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  dueDate: { type: Date },
  subtasks: [{
    id: { type: String },
    title: { type: String },
    isCompleted: { type: Boolean, default: false }
  }]
}, { timestamps: true });

taskSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

module.exports = mongoose.model('Task', taskSchema);
