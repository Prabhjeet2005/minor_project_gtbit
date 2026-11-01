"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	CheckCircle,
	AlertTriangle,
	ArrowRight,
	Eye,
	X,
} from "lucide-react";

export default function FeedbackPage() {
	const router = useRouter();
	const [report, setReport] = useState(null);
	const [violation, setViolation] = useState(null);
	const [evidenceHistory, setEvidenceHistory] = useState([]);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		// 1. Check for immediate violation flags
		const v = localStorage.getItem("interviewViolation");
		if (v) {
			setViolation(v);
			localStorage.removeItem("interviewViolation");
		}

		// 2. Retrieve data passed from Interview Page
		const data = localStorage.getItem("latestFeedback");
		if (data) {
			const parsedData = JSON.parse(data);

			// Handle historical reports passed from the Dashboard
			if (parsedData.status === "terminated") {
				setViolation(
					parsedData.terminationReason || "Multiple Proctoring Violations",
				);
			}

			setReport(parsedData.feedback || parsedData); // Handles if the object is nested

			if (
				parsedData.proctoringHistory &&
				parsedData.proctoringHistory.length > 0
			) {
				setEvidenceHistory(parsedData.proctoringHistory);
			}
		}
	}, []);

	if (!report)
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
				Loading Report...
			</div>
		);

	return (
		<div className="min-h-screen bg-slate-950 text-white p-8 relative">
			<div className="max-w-3xl mx-auto space-y-8">
				{/* UPDATED: VIOLATION BADGE WITH VIEW VIOLATIONS BUTTON */}
				{(violation || evidenceHistory.length > 0) && (
					<div className="bg-red-900/40 border border-red-500 text-red-200 px-6 py-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-red-950/50 rounded-full">
								<AlertTriangle className="text-red-500 w-8 h-8" />
							</div>
							<div>
								<h4 className="font-bold text-lg md:text-xl">
									Interview Terminated
								</h4>
								<p className="text-sm md:text-base opacity-90 mt-1">
									Automatically ended due to:{" "}
									<strong className="text-white">
										{violation || "Proctoring Violations"}
									</strong>
								</p>
							</div>
						</div>

						{/* UPDATED BUTTON NAME */}
						{evidenceHistory.length > 0 && (
							<button
								onClick={() => setShowModal(true)}
								className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap transition-colors">
								<Eye size={18} /> View Violations
							</button>
						)}
					</div>
				)}

				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
						Interview Analysis
					</h1>
					<p className="text-slate-400">Here is how you performed.</p>
				</div>

				{/* Score Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ScoreCard
						title="Overall Score"
						score={report.overallScore}
						color="blue"
					/>
					<ScoreCard
						title="Technical"
						score={report.technicalAccuracy}
						color="purple"
					/>
					<ScoreCard
						title="Communication"
						score={report.communicationSkills}
						color="green"
					/>
				</div>

				{/* Detailed Feedback */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
						<h3 className="flex items-center gap-2 font-bold text-green-400 mb-4">
							<CheckCircle size={20} /> Strengths
						</h3>
						<ul className="space-y-2">
							{report.strengths?.map((s, i) => (
								<li key={i} className="text-slate-300 text-sm">
									- {s}
								</li>
							))}
						</ul>
					</div>

					<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
						<h3 className="flex items-center gap-2 font-bold text-amber-400 mb-4">
							<AlertTriangle size={20} /> Improvements
						</h3>
						<ul className="space-y-2">
							{report.weaknesses?.map((w, i) => (
								<li key={i} className="text-slate-300 text-sm">
									- {w}
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="flex justify-center pt-8">
					<button
						onClick={() => router.push("/")}
						className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all">
						Back to Home <ArrowRight size={18} />
					</button>
				</div>
			</div>

			{/* NEW: EVIDENCE TIMELINE MODAL */}
			{showModal && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
					<div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
						<div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
							<h2 className="text-xl font-bold flex items-center gap-2 text-red-400">
								<AlertTriangle /> Proctoring Timeline
							</h2>
							<button
								onClick={() => setShowModal(false)}
								className="text-slate-400 hover:text-white transition-colors">
								<X size={24} />
							</button>
						</div>

						<div className="p-6 overflow-y-auto space-y-8 flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-700">
							{evidenceHistory.map((item, index) => (
								<div
									key={index}
									className="relative pl-6 border-l-2 border-slate-700">
									<div
										className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${index === evidenceHistory.length - 1 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-yellow-500"}`}></div>

									<div className="mb-1 text-xs font-bold text-slate-400">
										{new Date(item.timestamp).toLocaleTimeString()}
									</div>
									<div
										className={`text-lg font-bold mb-3 ${index === evidenceHistory.length - 1 ? "text-red-400" : "text-yellow-400"}`}>
										{index === evidenceHistory.length - 1
											? "Terminal Violation:"
											: `Warning ${index + 1}:`}{" "}
										{item.reason}
									</div>

									{item.imageUrl || item.image ? (
										<img
											src={item.imageUrl || item.image}
											alt={`Evidence ${index + 1}`}
											className="w-full max-w-sm rounded-lg border-2 border-slate-800 shadow-lg object-cover"
										/>
									) : (
										<div className="p-4 bg-slate-800 rounded-lg text-sm text-slate-500 italic inline-block">
											No image captured
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function ScoreCard({ title, score, color }) {
	const colors = {
		blue: "text-blue-400 border-blue-500/30",
		purple: "text-purple-400 border-purple-500/30",
		green: "text-green-400 border-green-500/30",
	};

	return (
		<div
			className={`bg-slate-900/50 p-6 rounded-2xl border ${colors[color]} flex flex-col items-center`}>
			<span className="text-slate-500 text-sm uppercase tracking-wider mb-2">
				{title}
			</span>
			<span
				className={`text-5xl font-bold ${colors[color].split(" ")[0]}`}>
				{score}/10
			</span>
		</div>
	);
}
