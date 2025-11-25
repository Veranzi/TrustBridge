const { db } = require('../database/db');

class UserSession {
  static get(phone_number, callback) {
    const sql = 'SELECT * FROM user_sessions WHERE phone_number = ?';
    db.get(sql, [phone_number], (err, row) => {
      if (err) {
        callback(err, null);
      } else {
        if (row) {
          try {
            row.report_data = row.report_data ? JSON.parse(row.report_data) : {};
          } catch (e) {
            row.report_data = {};
          }
        }
        callback(null, row);
      }
    });
  }

  static set(phone_number, state, report_data = {}, callback) {
    // First check if session exists
    this.get(phone_number, (err, existing) => {
      if (err) {
        callback(err, 0);
        return;
      }

      const reportDataStr = JSON.stringify(report_data);
      
      if (existing) {
        // Update existing session
        const sql = `
          UPDATE user_sessions 
          SET state = ?, report_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE phone_number = ?
        `;
        db.run(sql, [state, reportDataStr, phone_number], function(err) {
          callback(err, this.changes);
        });
      } else {
        // Insert new session
        const sql = `
          INSERT INTO user_sessions (phone_number, state, report_data, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        db.run(sql, [phone_number, state, reportDataStr], function(err) {
          callback(err, this.changes);
        });
      }
    });
  }

  static clear(phone_number, callback) {
    const sql = 'DELETE FROM user_sessions WHERE phone_number = ?';
    db.run(sql, [phone_number], function(err) {
      callback(err, this.changes);
    });
  }
}

module.exports = UserSession;

