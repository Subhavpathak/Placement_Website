const fs = require('fs/promises');
const cloudinary = require('../utils/cloudinary');
const Student = require('../models/students');
const Company = require('../models/companies');
const Application = require('../models/application');
const { getCloudinaryId } = require('../utils/helperPublicId');
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/resumes/'); // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        // Create unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});


const fileFilter = (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Helper function to generate JWT token
const generateToken = (userId, role, isProfileCompleted) => {
    return jwt.sign(
        {
            id: userId,
            role: role,
            isProfileCompleted: isProfileCompleted
        },
        process.env.JWT_SECRET || 'your-secret-key', // Make sure to set this in your .env file
        { expiresIn: '30d' }
    );
};

// Helper function to check if profile is completed
const checkProfileCompletion = (student) => {
    const { details, defaultResume } = student;
    return !!(
        details?.rollNo &&
        details?.semester &&
        details?.course &&
        details?.graduationYear &&
        defaultResume
    );
};


// Get current user profile
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const student = await Student.findById(userId).select('-password');
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        // Check profile completion
        const isProfileCompleted = checkProfileCompletion(student);

        res.status(200).json({
            success: true,
            message: "Profile found",
            data: {
                user: {
                    id: student._id,
                    name: student.name,
                    email: student.email,
                    role: student.role,
                    isProfileCompleted: isProfileCompleted,
                    details: student.details ? student.details : {},
                    defaultResume: student.defaultResume ? student.defaultResume : null
                }
            }
        });

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Update student profile
const updateProfile = async (req, res) => {
    let tempPath;
    try {
        const userId = req.user.id;
        const { name, rollNo, semester, course, graduationYear, oldPassword, newPassword } = req.body;

        const student = await Student.findById(userId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        // Update password if requested
        if (oldPassword && newPassword) {
            const isMatch = await bcrypt.compare(oldPassword, student.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Old password is incorrect"
                });
            }
            const salt = await bcrypt.genSalt(10);
            student.password = await bcrypt.hash(newPassword, salt);
        }

        // Update fields
        if (name) student.name = name;
        if (rollNo !== undefined) student.details.rollNo = rollNo;
        if (semester !== undefined) student.details.semester = semester;
        if (course !== undefined) student.details.course = course;
        if (graduationYear !== undefined) student.details.graduationYear = graduationYear;

        // Handle resume upload if file provided
        if (req.file && req.file.path) {
            tempPath = req.file.path;

            // Delete previous resume from Cloudinary if exists
            if (student.defaultResume) {
                const { publicId, resourceType } = getCloudinaryId(student.defaultResume);
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'raw' });
                    } catch {
                        // Ignore Cloudinary deletion errors
                    }
                }
            }

            // Upload new resume to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(tempPath, {
                folder: 'placement/resumes',
                resource_type: 'raw'
            });
            student.defaultResume = uploadResult.secure_url;
        }

        // Check profile completion after update
        const isProfileCompleted = checkProfileCompletion(student);
        student.profileIsCompleted = isProfileCompleted;

        if (student.profileIsCompleted) {
            await student.save();
        } else {
            return res.status(400).json({
                success: false,
                message: "Please fill all the required fields to complete your profile"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: {
                    id: student._id,
                    name: student.name,
                    email: student.email,
                    role: student.role,
                    isProfileCompleted: isProfileCompleted,
                    details: student.details,
                    defaultResume: student.defaultResume
                }
            }
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    } finally {
        if (tempPath) {
            try { await fs.unlink(tempPath); } catch {}
        }
    }
};




// Get all companies
const getAllCompanies = async (req, res) => {
    // if profile is not completed ask the user to complete the profile first
    if (req.isProfileCompleted === false) {
        return res.status(400).json({
            success: false,
            message: "Please complete your profile before viewing companies"
        });
    }

    try {
        const companies = await Company.find({});

        if (!companies || companies.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No companies are visiting right now"
            });
        }

        res.status(200).json({
            success: true,
            message: "Companies retrieved successfully",
            data: companies
        });
    } catch (error) {
        console.error("Error fetching companies:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Apply to a company (uploads resume to Cloudinary if provided)
const applyToCompany = async (req, res) => {
  // If you already gate this route with requireCompleteProfile, this check is redundant.
  if (req.isProfileCompleted === false) {
    return res.status(400).json({
      success: false,
      message: "Please complete your profile before applying"
    });
  }

  const { companyId } = req.body;
  const studentId = req.user?.id;

  if (!companyId) {
    return res.status(400).json({ success: false, message: "Company ID is required" });
  }
  if (!studentId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let tempFilePath = req.file?.path;

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const existingApplication = await Application.findOne({ userId: studentId, companyId });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: "You have already applied to this company" });
    }

    // Decide resume URL: upload file to Cloudinary if present; else use defaultResume
    let resumeUrl;
    if (tempFilePath) {
      const upload = await cloudinary.uploader.upload(tempFilePath, {
        folder: 'placement/resumes',
        resource_type: 'auto' // supports pdf/doc/image
      });
      resumeUrl = upload.secure_url;
    } else if (student.defaultResume) {
      resumeUrl = student.defaultResume;
    } else {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume or set a default resume"
      });
    }

    const newApplication = new Application({
      userId: studentId,
      companyId,
      resume: resumeUrl,
      status: "applied"
    });

    await newApplication.save();

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: {
        applicationId: newApplication._id,
        companyName: company.name,
        status: newApplication.status
      }
    });
  } catch (error) {
    console.error("Error applying to company:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  } finally {
    // Clean up local temp file if multer stored one
    if (tempFilePath) {
      try { await fs.unlink(tempFilePath); } catch {}
    }
  }
};

// Get student's applications
const getMyApplications = async (req, res) => {
        if(req.isProfileCompleted === false){
        return res.status(400).json({
            success: false,
            message: "Please complete your profile before viewing companies"
        });
    }
    
    try {
        const studentId = req.user.id; // Assuming user ID comes from authentication middleware

        const applications = await Application.find({ userId: studentId })
            .populate('companyId', 'name description type stipend')
            .sort({ createdAt: -1 });

        if (!applications || applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No applications found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Applications retrieved successfully",
            data: applications
        });

    } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// Update default resume
const updateDefaultResume = async (req, res) => {
    let tempPath;
    try {
        const studentId = req.user.id;

        if (!req.file?.path) {
            return res.status(400).json({
                success: false,
                message: "Please upload a resume file"
            });
        }

        tempPath = req.file.path;

        // Fetch student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const previousUrl = student.defaultResume || null;

        // Delete previous resume from Cloudinary
        if (previousUrl) {
            const { publicId, resourceType } = getCloudinaryId(previousUrl);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'raw' });
                    console.log("Previous resume deleted from Cloudinary");
                } catch {
                    console.warn("Failed to delete previous resume from Cloudinary");
                }
            }
        }

        // Upload new resume
        const uploadResult = await cloudinary.uploader.upload(tempPath, {
            folder: 'placement/resumes',
            resource_type: 'raw'
        });

        student.defaultResume = uploadResult.secure_url;
        student.profileIsCompleted = checkProfileCompletion(student);
        await student.save();

        res.status(200).json({
            success: true,
            message: "Default resume updated successfully",
            data: { resumeUrl: uploadResult.secure_url }
        });
    } catch (error) {
        console.error("Error updating default resume:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    } finally {
        if (tempPath) {
            try { await fs.unlink(tempPath); } catch {}
        }
    }
};

// Delete application by ID
const deleteApplicationById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the application
        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        // Delete resume from Cloudinary if present
        if (application.resume) {
            const { publicId, resourceType } = getCloudinaryId(application.resume);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'raw' });
                } catch {
                    // Ignore Cloudinary deletion errors
                }
            }
        }

        // Delete the application from DB
        await Application.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
        console.error("Error deleting application:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    getUserProfile,
    updateProfile,
    getAllCompanies,
    applyToCompany,
    getMyApplications,
    updateDefaultResume,
    deleteApplicationById,
    upload // Export multer instance for use in routes
};
