INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, specialization) VALUES 
(1, 'admin@telemedic.local', '$2a$10$d.bM.k2HhHn.A3/pTqfT7eU/O6F1Z/5P6I7K.1lMz2.v7kLg8G1hK', 'System Admin', 'admin', NULL),
(2, 'doctor@telemedic.local', '$2a$10$d.bM.k2HhHn.A3/pTqfT7eU/O6F1Z/5P6I7K.1lMz2.v7kLg8G1hK', 'Dr. Sarah Smith', 'doctor', 'Cardiology'),
(4, 'doctor2@telemedic.local', '$2a$10$d.bM.k2HhHn.A3/pTqfT7eU/O6F1Z/5P6I7K.1lMz2.v7kLg8G1hK', 'Dr. Infectious', 'doctor', 'Infectious Disease'),
(5, 'doctor3@telemedic.local', '$2a$10$d.bM.k2HhHn.A3/pTqfT7eU/O6F1Z/5P6I7K.1lMz2.v7kLg8G1hK', 'Dr. General', 'doctor', 'General Practice'),
(3, 'patient@telemedic.local', '$2a$10$d.bM.k2HhHn.A3/pTqfT7eU/O6F1Z/5P6I7K.1lMz2.v7kLg8G1hK', 'John Doe', 'patient', NULL);

INSERT OR IGNORE INTO patients (id, user_id, date_of_birth, gender, blood_type, assigned_doctor_id) VALUES 
(1, 3, '1985-05-15', 'Male', 'O+', 2);

INSERT OR IGNORE INTO devices (id, device_id, api_key, patient_id) VALUES 
(1, 'ESP32-001', '$2a$10$d.bM.k2HhHn.A3/pTqfT7eU/O6F1Z/5P6I7K.1lMz2.v7kLg8G1hK', 1);
