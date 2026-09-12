const express = require("express");
const {
	getAllAssessments,
	getAssessmentById,
	getUserAssessmentHistory,
	getAssessmentResultById,
	deleteAssessment,
} = require("../controllers/assessment.controller.js");
const protectRoute = require("../middlewares/protectRoute.js");

const router = express.Router();

// Route to get all active assessments (Users need to be logged in to view them)
router.get("/", protectRoute, getAllAssessments);

router.get("/history", protectRoute, getUserAssessmentHistory);
router.get("/result/:id", protectRoute, getAssessmentResultById);
router.get("/:id", protectRoute, getAssessmentById);
router.delete("/:id", protectRoute, deleteAssessment);


module.exports = router;
