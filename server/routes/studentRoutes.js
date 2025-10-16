const express = require("express");
const router = express.Router();
const {
    getUserProfile,
    updateProfile,
    getAllCompanies,
    applyToCompany,
    getMyApplications,
    updateDefaultResume,
    upload
} = require("../controller/students");
const { deleteApplicationById } = require('../controller/students'); // or correct controller path


// Middleware for authentication
const { authenticateStudent, requireCompleteProfile } = require("../middleware/auth");


// Protected routes (require authentication)
router.get("/companies", authenticateStudent, getAllCompanies);
router.get("/profile", authenticateStudent, getUserProfile);
router.put("/profile", authenticateStudent, upload.single('resume'), updateProfile);
router.get("/applications", authenticateStudent, getMyApplications);

// Routes that require complete profile
router.post("/apply/:companyId", authenticateStudent, requireCompleteProfile, upload.single('resume'), applyToCompany);

// Resume management routes
router.post("/resume/default", authenticateStudent, upload.single('resume'), updateDefaultResume);

// Example for coordinatorRoutes.js or applicationRoutes.js
router.delete('/applications/:id', deleteApplicationById);
module.exports = router;
