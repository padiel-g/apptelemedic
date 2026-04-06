Admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'System Admin', 'admin');

-- Doctor users (password: password123)
INSERT INTO users (email, password_hash, full_name, role, specialization) VALUES
('gerald@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Dr. Gerald T Padiel', 'doctor', 'Cardiology'),
('doctor2@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Dr. Sarah Johnson', 'doctor', 'Infectious Disease'),
('doctor3@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Dr. James Wilson', 'doctor', 'General Practice');

-- Patient users (password: password123)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('takudzwa@gmail.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Takudzwa Padiel', 'patient'),
('patient2@gmail.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Jane Smith', 'patient');

-- Create patient profiles (use subqueries to get the correct user IDs)
INSERT INTO patients (user_id, conditions, assigned_doctor_id)
SELECT u.id, 'hypertension', d.id FROM users u, users d WHERE u.email = 'takudzwa@gmail.com' AND d.email = 'gerald@telemedic.com';

INSERT INTO patients (user_id, conditions, assigned_doctor_id)
SELECT u.id, 'malaria', d.id FROM users u, users d WHERE u.email = 'patient2@gmail.com' AND d.email = 'doctor2@telemedic.com';