const { db } = require('../database/db');

class Report {
  static create(data, callback) {
    const {
      phone_number,
      category,
      subcategory,
      description,
      location,
      evidence_files,
      priority = 'medium'
    } = data;

    const sql = `
      INSERT INTO reports (phone_number, category, subcategory, description, location, evidence_files, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [phone_number, category, subcategory, description, location, evidence_files, priority], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, ...data });
      }
    });
  }

  static findAll(callback) {
    const sql = 'SELECT * FROM reports ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Parse evidence_files JSON if present
        const parsedRows = rows.map(row => {
          if (row.evidence_files) {
            try {
              row.evidence_files = JSON.parse(row.evidence_files);
            } catch (e) {
              row.evidence_files = [];
            }
          }
          return row;
        });
        callback(null, parsedRows);
      }
    });
  }

  static findByPhone(phone_number, callback) {
    const sql = 'SELECT * FROM reports WHERE phone_number = ? ORDER BY created_at DESC';
    db.all(sql, [phone_number], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Parse evidence_files JSON if present
        const parsedRows = rows.map(row => {
          if (row.evidence_files) {
            try {
              row.evidence_files = JSON.parse(row.evidence_files);
            } catch (e) {
              row.evidence_files = [];
            }
          }
          return row;
        });
        callback(null, parsedRows);
      }
    });
  }

  static findById(id, callback) {
    const sql = 'SELECT * FROM reports WHERE id = ?';
    db.get(sql, [id], (err, row) => {
      if (err) {
        callback(err, null);
      } else if (row) {
        // Parse evidence_files JSON if present
        if (row.evidence_files) {
          try {
            row.evidence_files = JSON.parse(row.evidence_files);
          } catch (e) {
            row.evidence_files = [];
          }
        }
        callback(null, row);
      } else {
        callback(null, null);
      }
    });
  }

  static updateStatus(id, status, callback) {
    const sql = 'UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(sql, [status, id], function(err) {
      callback(err, this.changes);
    });
  }

  static getStats(callback) {
    const stats = {};
    
    // Total reports
    db.get('SELECT COUNT(*) as total FROM reports', [], (err, row) => {
      if (err) return callback(err, null);
      stats.total = row.total;

      // Reports by status
      db.all('SELECT status, COUNT(*) as count FROM reports GROUP BY status', [], (err, rows) => {
        if (err) return callback(err, null);
        stats.byStatus = rows.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {});

        // Reports by category
        db.all('SELECT category, COUNT(*) as count FROM reports GROUP BY category', [], (err, rows) => {
          if (err) return callback(err, null);
          stats.byCategory = rows.reduce((acc, row) => {
            acc[row.category] = row.count;
            return acc;
          }, {});

          callback(null, stats);
        });
      });
    });
  }
}

module.exports = Report;

