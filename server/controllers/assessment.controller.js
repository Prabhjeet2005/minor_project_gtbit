const Assessment = require("../models/assessment.model.js");
const AssessmentResult = require("../models/assessmentResult.model.js");
const axios = require("axios");
const { uploadBase64Image } = require("../utils/cloudinary");

// 2. Fetch all active assessments (For users to see what tests they can take)
const getAllAssessments = async (req, res) => {
	try {
		// Only fetch assessments that are marked active
		const assessments = await Assessment.find({ isActive: true })
			.select("-mcqs.correctAnswerIndex -dsaQuestions.testCases") // Don't leak answers!
			.sort({ createdAt: -1 });

		res.status(200).json(assessments);
	} catch (error) {
		console.error("Fetch Assessments Error:", error);
		res.status(500).json({ error: "Failed to fetch assessments" });
	}
};

const getAssessmentById = async (req, res) => {
	try {
		const { id } = req.params;
		// .lean() allows us to easily modify the object before sending it
		const assessment = await Assessment.findById(id).lean();

		if (!assessment || !assessment.isActive) {
			return res.status(404).json({ error: "Assessment not found" });
		}

		// 1. Remove MCQ answers so the user can't cheat
		assessment.mcqs.forEach((mcq) => {
			delete mcq.correctAnswerIndex;
		});

		// 2. Remove HIDDEN test cases, but keep the visible ones for the UI
		assessment.dsaQuestions.forEach((dsa) => {
			if (dsa.testCases) {
				dsa.testCases = dsa.testCases.filter((tc) => !tc.isHidden);
			}
		});

		res.status(200).json(assessment);
	} catch (error) {
		console.error("Fetch Assessment Error:", error);
		res.status(500).json({ error: "Failed to fetch assessment" });
	}
};

const getUserAssessmentHistory = async (req, res) => {
	try {
		// Find all results for this user, sort by newest first
		const results = await AssessmentResult.find({ userId: req.user._id })
			.populate("assessmentId", "title durationMinutes") // Pull in the test title from the Assessment model
			.sort({ createdAt: -1 });

		res.status(200).json(results);
	} catch (error) {
		console.error("Fetch Assessment History Error:", error);
		res.status(500).json({ error: "Failed to fetch assessment history" });
	}
};

const getAssessmentResultById = async (req, res) => {
	try {
		// Populate the assessmentId to get the title
		const result = await AssessmentResult.findById(req.params.id).populate(
			"assessmentId",
			"title description",
		);

		if (!result)
			return res.status(404).json({ error: "Result not found" });
		res.status(200).json(result);
	} catch (error) {
		console.error("Fetch Result Error:", error);
		res.status(500).json({ error: "Failed to fetch assessment result" });
	}
};

const deleteAssessment = async (req, res) => {
	try {
		const { id } = req.params;

		// 1. Find and delete the assessment, strictly enforcing ownership
		const deletedAssessment = await Assessment.findOneAndDelete({
			_id: id,
			createdBy: req.user._id,
		});

		if (!deletedAssessment) {
			return res
				.status(404)
				.json({ error: "Assessment not found or unauthorized to delete" });
		}

		// 2. Cleanup: Delete all student results tied to this assessment
		await AssessmentResult.deleteMany({ assessmentId: id });

		res
			.status(200)
			.json({
				message: "Assessment and related submissions deleted successfully",
			});
	} catch (error) {
		console.error("Delete Assessment Error:", error);
		res.status(500).json({ error: "Failed to delete assessment" });
	}
};

module.exports = { getAllAssessments, getAssessmentById, getUserAssessmentHistory,getAssessmentResultById, deleteAssessment };
