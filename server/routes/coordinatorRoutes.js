const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // store temp uploads in server/uploads

const {
    registerStudentsFromFile,
    createCompany,
    getAllCompanies,
    updateCompany,
    deleteCompany,
    getCompanyById,
    downloadAllResumesZip,
    downloadCompanyResumesZip
} = require('../controller/coordinators');

// combine middleware imports and remove unused ones
const { authenticate, requireCoordinator } = require("../middleware/auth");

// Apply authentication and coordinator check to all coordinator routes
router.use(authenticate, requireCoordinator);

// Coordinator endpoints (now protected)
// add upload middleware for file upload route
router.post('/register-students-file', upload.single('file'), registerStudentsFromFile);
router.post('/company', createCompany);
router.get('/companies', getAllCompanies);
router.get('/company/:id', getCompanyById);
router.put('/company/:id', updateCompany);
router.delete('/company/:id', deleteCompany);
router.get('/resumes/download-all', downloadAllResumesZip);
router.get('/resumes/download/:id', downloadCompanyResumesZip);

module.exports = router;