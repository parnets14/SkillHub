const admin = require('firebase-admin');
const { logger } = require('./logger');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const sendPushNotification = async (notification) => {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      token: Array.isArray(notification.token) ? notification.token[0] : notification.token,
    };

    await admin.messaging().send(message);
    logger.info('Push notification sent successfully');
    return true;
  } catch (error) {
    logger.error('Push notification error:', error);
    return false;
  }
};

const sendMulticastNotification = async (notification) => {
  try {
    if (!Array.isArray(notification.token)) {
      notification.token = [notification.token];
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      tokens: notification.token,
    };

    const response = await admin.messaging().sendMulticast(message);
    logger.info(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
    return true;
  } catch (error) {
    logger.error('Multicast notification error:', error);
    return false;
  }
};

module.exports = {
  admin,
  sendPushNotification,
  sendMulticastNotification,
};

