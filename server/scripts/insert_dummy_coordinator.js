const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Student = require('../models/students');

// Accept multiple common env names for MongoDB
const MONGODB_URI = process.env.MONGODB_URI
    || process.env.MONGODB_URL
    || process.env.MONGO_URI
    || process.env.MONGO_URL
    || process.env.DATABASE_URL;

if (!MONGODB_URI) {
    console.error('Set MONGODB_URI (or MONGODB_URL / MONGO_URI / DATABASE_URL) in server/.env before running.');
    process.exit(1);
}

async function run() {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        const email = 'ad23b1047@iiitr.ac.in';
        const existing = await Student.findOne({ email });
        if (existing) {
            console.log(`Student with email ${email} already exists (id: ${existing._id}). No action taken.`);
            await mongoose.disconnect();
            return;
        }

        const hashed = await bcrypt.hash('chubbybaby', 10);

        const coordinator = new Student({
            name: 'Rudra Pratap',
            email,
            password: hashed,
            role: 'coordinator'
            // details/defaultResume omitted for coordinator
        });

        await coordinator.save();
        console.log('Coordinator created:', { id: coordinator._id, email: coordinator.email, name: coordinator.name });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error inserting coordinator:', err);
        process.exitCode = 1;
    }
}

run();