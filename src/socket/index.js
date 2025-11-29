const jwt = require('jsonwebtoken');
const { User, Consultation } = require('../models');
const { logger } = require('../utils/logger');

const onlineUsers = new Map(); // userId -> socketIds[]

const initializeSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = user._id.toString();
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected: ${userId}`);

    // Add user to online users
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).push(socket.id);
    } else {
      onlineUsers.set(userId, [socket.id]);
    }

    // Update user online status
    User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() }).exec();

    // Send online status to all connections
    socket.broadcast.emit('user:online', { userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle consultation join
    socket.on('consultation:join', async (data) => {
      try {
        const consultation = await Consultation.findById(data.consultationId);

        if (!consultation) {
          socket.emit('error', { message: 'Consultation not found' });
          return;
        }

        // Check if user is part of consultation
        if (
          consultation.user.toString() !== userId &&
          consultation.provider.toString() !== userId
        ) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        socket.join(`consultation:${data.consultationId}`);
        socket.emit('consultation:joined', { consultationId: data.consultationId });

        logger.info(`User ${userId} joined consultation ${data.consultationId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to join consultation' });
      }
    });

    // Handle consultation start
    socket.on('consultation:start', async (data) => {
      try {
        const consultation = await Consultation.findById(data.consultationId);

        if (!consultation || consultation.provider.toString() !== userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        consultation.status = 'ongoing';
        consultation.startTime = new Date();
        await consultation.save();

        io.to(`consultation:${data.consultationId}`).emit('consultation:started', {
          consultationId: data.consultationId,
          startTime: consultation.startTime,
        });

        logger.info(`Consultation started: ${data.consultationId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to start consultation' });
      }
    });

    // Handle chat message
    socket.on('consultation:message', async (data) => {
      try {
        const consultation = await Consultation.findById(data.consultationId);

        if (!consultation) {
          socket.emit('error', { message: 'Consultation not found' });
          return;
        }

        // Check if user is part of consultation
        if (
          consultation.user.toString() !== userId &&
          consultation.provider.toString() !== userId
        ) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const messageData = {
          sender: userId,
          message: data.message,
          timestamp: new Date(),
          type: data.type || 'text',
        };

        consultation.messages.push(messageData);
        await consultation.save();

        io.to(`consultation:${data.consultationId}`).emit('consultation:message', messageData);

        logger.info(`Message sent in consultation ${data.consultationId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle consultation end
    socket.on('consultation:end', async (data) => {
      try {
        const consultation = await Consultation.findById(data.consultationId);

        if (!consultation) {
          socket.emit('error', { message: 'Consultation not found' });
          return;
        }

        // Either party can end the consultation
        if (
          consultation.user.toString() !== userId &&
          consultation.provider.toString() !== userId
        ) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        consultation.status = 'completed';
        consultation.endTime = new Date();

        // Calculate duration in minutes
        if (consultation.startTime) {
          const duration = Math.ceil(
            (consultation.endTime.getTime() - consultation.startTime.getTime()) / (1000 * 60)
          );
          consultation.duration = duration;
          consultation.totalAmount = duration * consultation.rate;
        }

        await consultation.save();

        io.to(`consultation:${data.consultationId}`).emit('consultation:ended', {
          consultationId: data.consultationId,
          endTime: consultation.endTime,
          duration: consultation.duration,
          totalAmount: consultation.totalAmount,
        });

        logger.info(`Consultation ended: ${data.consultationId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to end consultation' });
      }
    });

    // Handle WebRTC signaling for audio/video calls
    socket.on('webrtc:offer', (data) => {
      socket.to(`consultation:${data.consultationId}`).emit('webrtc:offer', {
        offer: data.offer,
        from: userId,
      });
    });

    socket.on('webrtc:answer', (data) => {
      socket.to(`consultation:${data.consultationId}`).emit('webrtc:answer', {
        answer: data.answer,
        from: userId,
      });
    });

    socket.on('webrtc:ice-candidate', (data) => {
      socket.to(`consultation:${data.consultationId}`).emit('webrtc:ice-candidate', {
        candidate: data.candidate,
        from: userId,
      });
    });

    // Handle typing indicator
    socket.on('typing:start', (data) => {
      socket.to(`consultation:${data.consultationId}`).emit('typing:start', { userId });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`consultation:${data.consultationId}`).emit('typing:stop', { userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);

      // Remove socket from user's socket list
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index > -1) {
          userSockets.splice(index, 1);
        }

        // If no more sockets for this user, mark as offline
        if (userSockets.length === 0) {
          onlineUsers.delete(userId);
          User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() }).exec();
          socket.broadcast.emit('user:offline', { userId });
        }
      }
    });
  });
};

const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

module.exports = {
  initializeSocket,
  getOnlineUsers,
  isUserOnline,
};

