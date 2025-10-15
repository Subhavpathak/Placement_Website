const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Student = require('../models/students');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set in env');
  throw new Error('Missing JWT_SECRET');
}

const checkProfileCompletion = (student) => {
  if (!student) return false;
  if (student.profileIsCompleted) return true;
  // simple heuristic: defaultResume or at least rollNo present
  if (student.defaultResume) return true;
  if (student.details && student.details.rollNo) return true;
  return false;
};

const generateToken = (id, role, isProfileCompleted) => {
  return jwt.sign({ id, role, isProfileCompleted }, JWT_SECRET, { expiresIn: '7d' });
};

const loginStudent = async (req, res) => {
  try {
    // console.log('loginStudent called with body:', req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    console.log('Found student:', { id: student._id, email: student.email });
    const isPasswordValid = await bcrypt.compare(password.toString(), student.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isProfileCompleted = checkProfileCompletion(student);
    if (student.profileIsCompleted !== isProfileCompleted) {
      student.profileIsCompleted = isProfileCompleted;
      await student.save();
    }

    const token = generateToken(student._id, student.role, isProfileCompleted);

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          profileIsCompleted: isProfileCompleted
        }
      }
    });
  } catch (err) {
    console.error('loginStudent error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { loginStudent };