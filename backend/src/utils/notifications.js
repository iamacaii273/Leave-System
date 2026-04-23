const pool = require('../db');

/**
 * Create a new notification for a user
 * @param {Object} params
 * @param {string} params.user_id - Receiver ID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Type of notification
 * @param {string} params.reference_id - ID of the related object (e.g. leave request ID)
 */
async function createNotification({ user_id, title, message, type, reference_id }) {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)',
            [user_id, title, message, type, reference_id]
        );
        return true;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return false;
    }
}

/**
 * Notify all HR and Managers of a department about a new leave request
 * @param {string} leaveRequestId 
 * @param {string} employeeName 
 * @param {string} departmentId 
 */
async function notifyManagersNewRequest(leaveRequestId, employeeName, departmentId) {
    try {
        // 1. Get all Managers of that department
        // 2. Get all HRs assigned to that department

        const [managers] = await pool.query(
            `SELECT u.id FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.department_id = ? AND r.name = 'Manager'`,
            [departmentId]
        );

        const [hrs] = await pool.query(
            `SELECT hd.user_id as id FROM hr_departments hd 
       WHERE hd.department_id = ?`,
            [departmentId]
        );

        const recipients = [...new Set([...managers, ...hrs].map(u => u.id))];

        for (const userId of recipients) {
            await createNotification({
                user_id: userId,
                title: 'New Leave Request',
                message: `${employeeName} has submitted a new leave request.`,
                type: 'new_leave_request',
                reference_id: leaveRequestId
            });
        }
    } catch (error) {
        console.error('notifyManagersNewRequest error:', error);
    }
}

module.exports = {
    createNotification,
    notifyManagersNewRequest
};
