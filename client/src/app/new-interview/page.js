"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Upload,
	CheckCircle2,
	XCircle,
	Loader2,
	Camera,
	Mic,
	Monitor,
	BrainCircuit,
	FileText,
} from "lucide-react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import toast from "react-hot-toast";
import axios from "axios";

export default function NewInterviewPage() {
	const router = useRouter();

	// --- UI State ---
	const [step, setStep] = useState(1);
	const [isUploading, setIsUploading] = useState(false);
	const [resumeFile, setResumeFile] = useState(null);

	// --- Checklist States (pending, testing, success, error) ---
	const [checks, setChecks] = useState({
		camera: "pending",
		mic: "pending",
		model: "pending",
		fullscreen: "pending",
	});

	// Refs for media cleanup
	const streamRef = useRef(null);
	const audioContextRef = useRef(null);

	// ==========================================
	// STEP 1: RESUME UPLOAD
	// ==========================================
	const handleFileUpload = async (e) => {
		e.preventDefault();
		if (!resumeFile)
			return toast.error("Please select a resume PDF first");

		setIsUploading(true);
		const formData = new FormData();
		formData.append("resume", resumeFile);

		try {
			// FIX 1 & 2: Use the exact URL and Axios config from your original code
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/interview/start`,
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
					withCredentials: true,
				},
			);

			// Axios automatically throws on non-2xx statuses, so if we reach here, it succeeded
			toast.success("Resume parsed successfully!");

			// Store the initial greeting provided by the backend parsing
			localStorage.setItem(
				"initialAiMessage",
				res.data.message ||
					"Hello! I have reviewed your resume. Let's start the interview. Can you introduce yourself?",
			);

			setStep(2); // Move to diagnostic checklist
		} catch (error) {
			console.error("Upload Error:", error);
			toast.error(
				error.response?.data?.error ||
					"Failed to start interview. Is the Backend running?",
			);
		} finally {
			setIsUploading(false);
		}
	};

	// ==========================================
	// STEP 2: DIAGNOSTIC CHECKS
	// ==========================================
	useEffect(() => {
		if (step === 2) {
			runCameraCheck();
			runMicCheck();
			runModelCheck();
		}

		const handleFullscreenChange = () => {
			if (!document.fullscreenElement) {
				updateCheck("fullscreen", "error");
			}
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);

		return () => {
			document.removeEventListener(
				"fullscreenchange",
				handleFullscreenChange,
			);
			stopMediaTracks();
		};
	}, [step]);

	const updateCheck = (key, status) => {
		setChecks((prev) => ({ ...prev, [key]: status }));
	};

	const stopMediaTracks = () => {
		if (streamRef.current)
			streamRef.current.getTracks().forEach((track) => track.stop());
		if (audioContextRef.current) audioContextRef.current.close();
	};

	const runCameraCheck = async () => {
		updateCheck("camera", "testing");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
			});
			streamRef.current = stream;
			updateCheck("camera", "success");
		} catch (err) {
			updateCheck("camera", "error");
			toast.error("Camera access denied");
		}
	};

	const runMicCheck = async () => {
		updateCheck("mic", "testing");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			const audioContext = new (
				window.AudioContext || window.webkitAudioContext
			)();
			audioContextRef.current = audioContext;
			const analyser = audioContext.createAnalyser();
			const microphone = audioContext.createMediaStreamSource(stream);
			microphone.connect(analyser);
			analyser.fftSize = 256;

			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);

			let attempts = 0;
			const checkAudioLevel = () => {
				analyser.getByteFrequencyData(dataArray);
				const average = dataArray.reduce((a, b) => a + b) / bufferLength;

				if (average > 5) {
					updateCheck("mic", "success");
				} else if (attempts < 20) {
					attempts++;
					setTimeout(checkAudioLevel, 100);
				} else {
					updateCheck("mic", "error");
					toast.error("Mic connected, but no sound detected.");
				}
			};
			checkAudioLevel();
		} catch (err) {
			updateCheck("mic", "error");
		}
	};

	const runModelCheck = async () => {
		updateCheck("model", "testing");
		try {
			await tf.ready();
			await cocoSsd.load();
			updateCheck("model", "success");
		} catch (err) {
			updateCheck("model", "error");
		}
	};

	const runFullscreenCheck = async () => {
		updateCheck("fullscreen", "testing");
		try {
			await document.documentElement.requestFullscreen();
			updateCheck("fullscreen", "success");
		} catch (err) {
			updateCheck("fullscreen", "error");
		}
	};

	const allChecksPassed = Object.values(checks).every(
		(status) => status === "success",
	);

	const startInterview = () => {
		if (!allChecksPassed) return;
		stopMediaTracks();
		router.push("/interview");
	};

	const renderCheckItem = (key, label, icon, retryFn) => {
		const status = checks[key];
		return (
			<div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-slate-700 rounded-lg text-slate-300">
						{icon}
					</div>
					<span className="font-medium text-slate-200">{label}</span>
				</div>

				<div className="flex items-center gap-3">
					{status === "pending" && (
						<span className="text-slate-500 text-sm">Waiting...</span>
					)}
					{status === "testing" && (
						<Loader2 className="animate-spin text-blue-400" size={20} />
					)}
					{status === "success" && (
						<CheckCircle2 className="text-emerald-500" size={24} />
					)}
					{status === "error" && (
						<div className="flex items-center gap-2">
							<XCircle className="text-red-500" size={24} />
							<button
								onClick={retryFn}
								className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md text-white transition-colors">
								Retry
							</button>
						</div>
					)}
					{key === "fullscreen" &&
						status !== "success" &&
						status !== "testing" && (
							<button
								onClick={runFullscreenCheck}
								className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-md text-white transition-colors">
								Enable
							</button>
						)}
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-slate-950 flex flex-col items-center pt-24 px-4">
			{/* STEP PROGRESS PIPELINE */}
			<div className="flex items-center justify-center mb-12 w-full max-w-lg">
				<div className="flex items-center">
					<div
						className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
						1
					</div>
					<span
						className={`ml-3 font-semibold ${step >= 1 ? "text-white" : "text-slate-400"}`}>
						Upload
					</span>
				</div>
				<div
					className={`h-1 w-16 mx-4 rounded-full ${step >= 2 ? "bg-blue-600" : "bg-slate-800"}`}></div>
				<div className="flex items-center">
					<div
						className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
						2
					</div>
					<span
						className={`ml-3 font-semibold ${step >= 2 ? "text-white" : "text-slate-400"}`}>
						Permissions
					</span>
				</div>
			</div>

			<div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl">
				<div className="mb-8 text-center">
					<h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
						{step === 1 ? "Upload Resume" : "System Diagnostics"}
					</h1>
					<p className="text-slate-400">
						{step === 1
							? "We'll tailor the interview questions to your experience."
							: "Let's make sure your environment is ready for proctoring."}
					</p>
				</div>

				{/* STEP 1: RESUME */}
				{step === 1 && (
					<form onSubmit={handleFileUpload} className="space-y-6">
						<div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:bg-slate-800/50 transition-colors cursor-pointer relative">
							<input
								type="file"
								accept=".pdf"
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
								onChange={(e) => setResumeFile(e.target.files[0])}
							/>
							<FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
							{resumeFile ? (
								<p className="text-emerald-400 font-medium">
									{resumeFile.name}
								</p>
							) : (
								<>
									<p className="text-slate-200 font-medium mb-1">
										Click or drag PDF to upload
									</p>
									<p className="text-slate-500 text-sm">
										Max file size: 5MB
									</p>
								</>
							)}
						</div>

						<button
							type="submit"
							disabled={!resumeFile || isUploading}
							className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
							{isUploading ? (
								<>
									<Loader2 className="animate-spin" size={20} /> Parsing
									Resume...
								</>
							) : (
								<>
									<Upload size={20} /> Upload Resume
								</>
							)}
						</button>
					</form>
				)}

				{/* STEP 2: CHECKLIST */}
				{step === 2 && (
					<div className="space-y-4">
						{renderCheckItem(
							"camera",
							"Camera Access",
							<Camera size={20} />,
							runCameraCheck,
						)}
						{renderCheckItem(
							"mic",
							"Microphone Access",
							<Mic size={20} />,
							runMicCheck,
						)}
						{renderCheckItem(
							"model",
							"AI Proctoring Engine",
							<BrainCircuit size={20} />,
							runModelCheck,
						)}
						{renderCheckItem(
							"fullscreen",
							"Fullscreen Mode",
							<Monitor size={20} />,
							runFullscreenCheck,
						)}

						<div className="pt-4 mt-6 border-t border-slate-800">
							<button
								onClick={startInterview}
								disabled={!allChecksPassed}
								className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 border border-transparent text-white font-bold py-3 px-4 rounded-xl transition-all">
								{allChecksPassed
									? "Start AI Interview"
									: "Complete all checks to proceed"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
