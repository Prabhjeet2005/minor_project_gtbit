"use client";
import { useEffect, useRef, useState, memo } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import toast from "react-hot-toast";
import { AlertTriangle, EyeOff, Eye } from "lucide-react";

const ProctoringCamera = memo(function ProctoringCamera({ onTerminate }) {
	const videoRef = useRef(null);
	const warningsRef = useRef(0);

	const [warningUI, setWarningUI] = useState(0);
	const [statusColor, setStatusColor] = useState("border-slate-700");
	const [isHidden, setIsHidden] = useState(false);

  const captureEvidence = () => {
		if (!videoRef.current) return null;
		const canvas = document.createElement("canvas");
		canvas.width = videoRef.current.videoWidth;
		canvas.height = videoRef.current.videoHeight;
		const ctx = canvas.getContext("2d");
		// Flip back the mirrored video for the photo
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
		ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL("image/jpeg", 0.5); // Compress to 50% JPEG to save socket bandwidth
	};

	const triggerViolation = (reason, isInstant) => {
		// 1. Capture the visual evidence immediately
		const imageBase64 = captureEvidence();

		// 2. Log it to the timeline
		evidenceHistory.current.push({
			timestamp: new Date().toISOString(),
			reason: reason,
			image: imageBase64,
		});

		if (isInstant) {
			toast.error(`Violation: ${reason} Interview Terminated.`);
			setStatusColor("border-red-600");
			isDetecting = false;
			// Pass the entire history array back to the parent
			onTerminate(reason, evidenceHistory.current);
		} else {
			warningsRef.current += 1;
			setWarningUI(warningsRef.current);

			if (warningsRef.current >= 3) {
				toast.error(`Strike 3/3: ${reason} Interview Terminated.`);
				setStatusColor("border-red-600");
				isDetecting = false;
				// Pass the entire history array back to the parent
				onTerminate(reason, evidenceHistory.current);
			} else {
				toast.error(`Warning ${warningsRef.current}/3: ${reason}`);
				setStatusColor("border-yellow-500");
			}
		}
	};

	useEffect(() => {
		let stream = null;
		let detectionTimeout = null;
		let isDetecting = true;
		let noFaceCounter = 0;

		const startProctoring = async () => {
			try {
				await tf.ready();
				const model = await cocoSsd.load();

				stream = await navigator.mediaDevices.getUserMedia({
					video: true,
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}

				if (window.screen && window.screen.isExtended) {
					triggerViolation("External display detected.", false);
				}

				const runDetection = async () => {
					if (!isDetecting) return;

					if (videoRef.current && videoRef.current.readyState === 4) {
						const predictions = await model.detect(videoRef.current);
						analyzePredictions(predictions);
					}

					// FIX: Steady 2000ms (2s) interval for less CPU strain
					detectionTimeout = setTimeout(runDetection, 2000);
				};

				runDetection();
			} catch (err) {
				console.error("Proctoring Error:", err);
			}
		};

		const analyzePredictions = (predictions) => {
			const persons = predictions.filter((p) => p.class === "person");
			const phones = predictions.filter((p) => p.class === "cell phone");

			// 1. INSTANT TERMINATION CHECKS
			if (phones.length > 0)
				return triggerViolation("Cell phone detected.", true);
			if (persons.length > 1)
				return triggerViolation("Multiple people detected.", true);

			// 2. TEMPORARY FACE ABSENCE -> PERMANENT STRIKE LOGIC
			if (persons.length === 0) {
				noFaceCounter++;

				if (noFaceCounter === 2) {
					// 4 seconds: Soft Warning
					toast.error("Face not detected. Please return to camera.", {
						id: "face-warn",
					});
					setStatusColor("border-orange-500");
				} else if (noFaceCounter >= 3) {
					// 6 seconds: Issue a permanent strike and reset the face counter
					toast.dismiss("face-warn");
					noFaceCounter = 0; // Reset so the next absence starts fresh
					triggerViolation("Face missing for prolonged period.", false);
				}
			} else {
				if (noFaceCounter > 0) {
					noFaceCounter = 0;
					toast.dismiss("face-warn");
					toast.success("Face detected.", {
						id: "face-success",
						duration: 2000,
					});

					if (warningsRef.current === 0)
						setStatusColor("border-emerald-500");
					else setStatusColor("border-yellow-500");
				}
			}
		};

		const triggerViolation = (reason, isInstant) => {
			if (isInstant) {
				toast.error(`Violation: ${reason} Interview Terminated.`);
				setStatusColor("border-red-600");
				isDetecting = false;
				onTerminate(reason);
			} else {
				warningsRef.current += 1;
				setWarningUI(warningsRef.current);

				if (warningsRef.current >= 3) {
					toast.error(`Strike 3/3: ${reason} Interview Terminated.`);
					setStatusColor("border-red-600");
					isDetecting = false;
					onTerminate(reason);
				} else {
					toast.error(`Warning ${warningsRef.current}/3: ${reason}`);
					setStatusColor("border-yellow-500");
				}
			}
		};

		const handleVisibilityChange = () => {
			if (document.hidden)
				triggerViolation("Tab or window switched.", false);
		};
		const handleFullscreenChange = () => {
			if (!document.fullscreenElement)
				triggerViolation("Exited fullscreen mode.", false);
		};
		const handleContextMenu = (e) => {
			e.preventDefault();
			toast.error("Right-click is disabled during the interview.");
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("contextmenu", handleContextMenu);

		startProctoring();

		return () => {
			isDetecting = false;
			if (stream) stream.getTracks().forEach((t) => t.stop());
			if (detectionTimeout) clearTimeout(detectionTimeout);
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange,
			);
			document.removeEventListener(
				"fullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener("contextmenu", handleContextMenu);
		};
	}, [onTerminate]);

	return (
		<div
			className={`relative flex flex-col items-center justify-center transition-all duration-500 ${isHidden ? "w-16 h-16 md:w-20 md:h-20" : "w-32 h-32 md:w-48 md:h-48"} rounded-full bg-slate-900 border-4 ${statusColor} shadow-2xl overflow-hidden z-10`}>
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${isHidden ? "opacity-0" : "opacity-100"}`}
			/>

			{!isHidden && warningUI > 0 && (
				<div className="absolute top-4 bg-black/70 text-yellow-400 text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
					<AlertTriangle size={12} /> {warningUI}/3
				</div>
			)}

			<button
				onClick={() => setIsHidden(!isHidden)}
				className={`absolute ${isHidden ? "inset-0 m-auto" : "bottom-4"} bg-black/60 hover:bg-black/90 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all flex items-center justify-center`}
				title={isHidden ? "Show Camera" : "Hide Camera"}>
				{isHidden ? <Eye size={20} /> : <EyeOff size={16} />}
			</button>
		</div>
	);
});

export default ProctoringCamera;
