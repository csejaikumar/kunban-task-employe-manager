const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;


// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://kunban-task-employe-manager-bgqebuat9-csejaikumars-projects.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Models
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Meeting = require('./models/Meeting');

// Root health check route
app.get('/', (req, res) => {
  res.json({ message: 'Kanban API is running ✅', status: 'ok' });
});

// DB health check
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({ db: states[state] || 'unknown', state });
});


// Routes - Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const user = new User(req.body);
  try {
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Routes - Projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const project = new Project(req.body);
  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    console.log('Updating project ID:', req.params.id);
    console.log('Update body:', JSON.stringify(req.body));
    const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProject) {
      console.log('Project not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Project not found' });
    }
    console.log('Successfully updated project:', updatedProject.name);
    res.json(updatedProject);
  } catch (err) {
    console.error('Error updating project:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Share routes
app.post('/api/projects/:id/share', async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const project = await Project.findByIdAndUpdate(req.params.id, { shareToken: token }, { new: true });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/projects/:id/share', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { shareToken: null }, { new: true });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public access route
app.get('/api/public/projects/:token', async (req, res) => {
  try {
    const project = await Project.findOne({ shareToken: req.params.token });
    if (!project) return res.status(404).json({ message: 'Project not found or link expired' });
    
    const tasks = await Task.find({ projectId: project._id });
    const activeMeeting = await Meeting.findOne({ projectId: project._id });
    
    res.json({ 
      project, 
      tasks, 
      activeMeetingCode: activeMeeting ? activeMeeting.meetingCode : null 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    // Delete all tasks belonging to this project first
    await Task.deleteMany({ projectId: projectId });
    // Then delete the project itself
    await Project.findByIdAndDelete(projectId);
    res.json({ message: 'Project and all related tasks deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Routes - Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const task = new Task(req.body);
  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// WebRTC Huddle Endpoints
app.get('/api/meetings/active/:projectId', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ projectId: req.params.projectId });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const generateMeetingCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
};

app.post('/api/meetings/start', async (req, res) => {
  try {
    const { projectId, hostId } = req.body;
    let meeting = await Meeting.findOne({ projectId });
    if (!meeting) {
      const meetingCode = generateMeetingCode();
      meeting = new Meeting({ projectId, meetingCode, hostId });
      await meeting.save();
    }
    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/meetings/end', async (req, res) => {
  try {
    const { projectId } = req.body;
    await Meeting.deleteOne({ projectId });
    res.json({ success: true, message: 'Huddle ended' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/meetings/lookup/:meetingCode', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingCode: req.params.meetingCode });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Socket.io WebRTC Huddle Server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomCode, userId, userName }) => {
    socket.join(roomCode);
    socket.userId = userId;
    socket.userName = userName;

    // Notify other users in the room
    socket.to(roomCode).emit('peer-joined', {
      socketId: socket.id,
      userId,
      userName
    });

    // Send back current users in the room
    const clients = io.sockets.adapter.rooms.get(roomCode);
    const activePeers = [];
    if (clients) {
      for (const clientSocketId of clients) {
        if (clientSocketId !== socket.id) {
          const peerSocket = io.sockets.sockets.get(clientSocketId);
          if (peerSocket) {
            activePeers.push({
              socketId: clientSocketId,
              userId: peerSocket.userId,
              userName: peerSocket.userName
            });
          }
        }
      }
    }
    socket.emit('room-users', activePeers);
  });

  // Relay offers, answers, and candidates
  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('webrtc-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  socket.on('webrtc-toggle-media', ({ roomCode, type, enabled }) => {
    socket.to(roomCode).emit('webrtc-toggle-media', {
      senderSocketId: socket.id,
      type,
      enabled
    });
  });

  socket.on('toggle-screen-share', ({ roomCode, isSharing }) => {
    socket.to(roomCode).emit('peer-screen-share', {
      senderSocketId: socket.id,
      isSharing
    });
  });

  socket.on('end-meeting', ({ roomCode }) => {
    socket.to(roomCode).emit('huddle-terminated');
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(roomCode => {
      socket.to(roomCode).emit('peer-left', { socketId: socket.id });
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
