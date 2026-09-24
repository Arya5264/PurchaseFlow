const Notification = require('../models/Notification');
const User = require('../models/User');

const notifyUser = async ({ userId, type, title, message, relatedEntity = '', relatedEntityId = null }) => {
  try {
    return await Notification.create({
      userId,
      type,
      title,
      message,
      relatedEntity,
      relatedEntityId,
      isRead: false,
    });
  } catch (error) {
    console.error('[Notification Failure for User]:', error.message);
  }
};

const notifyRoles = async (roles, { type, title, message, relatedEntity = '', relatedEntityId = null }) => {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
    const notifications = users.map((u) => ({
      userId: u._id,
      type,
      title,
      message,
      relatedEntity,
      relatedEntityId,
      isRead: false,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('[Notification Failure for Roles]:', error.message);
  }
};

module.exports = { notifyUser, notifyRoles };
