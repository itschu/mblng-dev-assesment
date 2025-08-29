'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '../lib/auth';
import { GameAPI } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function GamePlay() {
	const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
	const [gameResult, setGameResult] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [error, setError] = useState('');
	const [mySession, setMySession] = useState<any>(null);
	const [user, setUser] = useState<any>(null);
	const [successMessage, setSuccessMessage] = useState('');
	const [timeRemaining, setTimeRemaining] = useState(0);
	const router = useRouter();
	const channelRef = useRef<any>(null);

	useEffect(() => {
		const currentUser = getCurrentUser();

		if (!currentUser) {
			router.push('/');
			return;
		}

		setUser(currentUser);

		fetchMySession();

		setupRealtimeSubscriptions();

		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}
		};
	}, []);

	const setupRealtimeSubscriptions = () => {
		const channelName = `gameplay-session-updates-${Date.now()}`;

		const gameChannel = supabase
			.channel(channelName)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'game_sessions',
				},
				(payload) => {
					console.log('GamePlay: Session change detected:', payload);
					handleSessionChange(payload);
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'session_participants',
				},
				(payload) => {
					console.log('GamePlay: Participant change detected:', payload);
					setTimeout(() => {
						fetchMySession();
					}, 300);
				}
			)
			.subscribe((status) => {
				console.log('GamePlay realtime subscription status:', status);
			});

		channelRef.current = gameChannel;
	};

	const handleSessionChange = (payload: any) => {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		console.log('GamePlay: Processing session change:', { eventType, newRecord, oldRecord });

		if (eventType === 'UPDATE') {
			if (newRecord.status === 'finished' && oldRecord?.status === 'active') {
				console.log('GamePlay: Session finished, fetching results');
				setTimeout(() => {
					fetchMySession();
				}, 700);
			} else if (newRecord.status === 'active') {
				console.log('GamePlay: Active session updated');
				setTimeout(() => {
					fetchMySession();
				}, 300);
			}
		}
	};

	const fetchMySession = async () => {
		try {
			console.log('GamePlay: Fetching my session...');

			const data = await GameAPI.getMySession();

			console.log('GamePlay: Session data received:', data);

			setMySession(data);

			if (data.session && data.session.status === 'active') {
				const startTime = new Date(data.session.started_at).getTime();
				const currentTime = new Date().getTime();
				const elapsed = Math.floor((currentTime - startTime) / 1000);
				const remaining = Math.max(0, (data.session.session_duration || 60) - elapsed);
				setTimeRemaining(remaining);
				console.log('GamePlay: Time remaining calculated:', remaining);
			} else {
				setTimeRemaining(0);
			}

			if (data.session && data.session.status === 'finished' && data.winningNumber !== undefined) {
				console.log('GamePlay: Setting game results');
				setGameResult(data);
			} else {
				setGameResult(null);
			}

			if (data.participant && data.participant.chosen_number) {
				setSelectedNumber(data.participant.chosen_number);
			}

			setError('');
		} catch (error: any) {
			console.error('GamePlay: Fetch my session error:', error);
			setError(error.message);
			if (error.message.includes('token') || error.message.includes('auth')) {
				await logoutUser();
				router.push('/');
			}
		} finally {
			if (isLoadingData) {
				setIsLoadingData(false);
			}
		}
	};

	const selectNumber = async (number: number) => {
		setIsLoading(true);
		setError('');
		setSuccessMessage('');

		try {
			const response = await GameAPI.selectNumber(number);
			setSelectedNumber(number);
			setSuccessMessage(response.message || 'Number selected successfully!');

			setTimeout(() => setSuccessMessage(''), 3000);

			await fetchMySession();
		} catch (error: any) {
			console.error('GamePlay: Select number error:', error);
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const leaveSession = async () => {
		setIsLoading(true);
		setError('');

		try {
			await GameAPI.leaveSession();
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			router.push('/home');
		} catch (error: any) {
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const backToLobby = () => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
		router.push('/home');
	};

	const formatTime = (seconds: number) => {
		return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
	};

	useEffect(() => {
		let timeInterval: NodeJS.Timeout | null = null;

		if (mySession?.session?.status === 'active' && timeRemaining > 0) {
			timeInterval = setInterval(() => {
				setTimeRemaining((prev) => {
					const newTime = Math.max(0, prev - 1);

					if (newTime === 0 && prev > 0) {
						console.log('GamePlay: Time expired, fetching results');
						setTimeout(() => {
							fetchMySession();
						}, 1000);
					}

					return newTime;
				});
			}, 1000);
		}

		return () => {
			if (timeInterval) {
				clearInterval(timeInterval);
			}
		};
	}, [mySession?.session?.status, mySession?.session?.id]);

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	if (isLoadingData) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
				<nav className="bg-white shadow-sm border-b">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							<div className="flex items-center">
								<h1 className="text-xl font-bold text-gray-900">Number Game</h1>
							</div>
							<div className="flex items-center space-x-4">
								<span className="text-sm text-gray-600">Welcome, {user.username}</span>
								<button onClick={backToLobby} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
									Back to Lobby
								</button>
							</div>
						</div>
					</div>
				</nav>

				<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
					<div className="bg-white rounded-2xl shadow-xl p-8">
						<div className="text-center">
							<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Game Session</h2>
							<p className="text-gray-600">Checking for your active session...</p>
							<div className="mt-6 bg-blue-50 rounded-lg p-4">
								<p className="text-sm text-blue-700">This may take a few moments</p>
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (!mySession || !mySession.session) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
				<nav className="bg-white shadow-sm border-b">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							<div className="flex items-center">
								<h1 className="text-xl font-bold text-gray-900">Number Game</h1>
							</div>
							<div className="flex items-center space-x-4">
								<span className="text-sm text-gray-600">Welcome, {user.username}</span>
								<button onClick={backToLobby} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
									Back to Lobby
								</button>
							</div>
						</div>
					</div>
				</nav>

				<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
					<div className="bg-white rounded-2xl shadow-xl p-8 text-center">
						<div className="mb-6">
							<div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
								<i className="ri-game-line text-2xl text-gray-400"></i>
							</div>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Session</h2>
							<p className="text-gray-600 mb-6">You don't have an active game session.</p>
						</div>

						<div className="bg-blue-50 rounded-xl p-6 mb-6">
							<h3 className="text-lg font-semibold text-blue-900 mb-2">Ready to Play?</h3>
							<p className="text-blue-700 text-sm">Head back to the lobby to join or start a new 60-second number guessing session!</p>
						</div>

						<button onClick={backToLobby} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
							Back to Lobby
						</button>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			<nav className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<h1 className="text-xl font-bold text-gray-900">Number Game</h1>
						</div>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">Welcome, {user.username}</span>
							<button onClick={backToLobby} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
								Back to Lobby
							</button>
						</div>
					</div>
				</div>
			</nav>

			<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="bg-white rounded-2xl shadow-xl p-8">
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
							<div className="flex items-center justify-between">
								<span>{error}</span>
								<button onClick={() => setError('')} className="text-red-500 hover:text-red-700 ml-4">
									✕
								</button>
							</div>
						</div>
					)}

					{successMessage && (
						<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700">
							<div className="flex items-center justify-between">
								<span>{successMessage}</span>
								<button onClick={() => setSuccessMessage('')} className="text-green-500 hover:text-green-700 ml-4">
									✕
								</button>
							</div>
						</div>
					)}

					{gameResult && gameResult.session.status === 'finished' ? (
						<div className="text-center">
							<h2 className="text-3xl font-bold text-gray-900 mb-6">🎉 Game Results</h2>

							<div className="bg-gray-50 rounded-xl p-6 mb-6">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<p className="text-sm text-gray-600 mb-1">Winning Number</p>
										<p className="text-4xl font-bold text-green-600">{gameResult.winningNumber}</p>
									</div>
									<div>
										<p className="text-sm text-gray-600 mb-1">Your Number</p>
										<p className="text-4xl font-bold text-blue-600">{gameResult.participant.chosen_number || 'Not Selected'}</p>
									</div>
									<div>
										<p className="text-sm text-gray-600 mb-1">Result</p>
										<p className={`text-3xl font-bold ${gameResult.isWinner ? 'text-green-600' : 'text-red-600'}`}>{gameResult.isWinner ? '🏆 WIN!' : '😔 Loss'}</p>
									</div>
								</div>
							</div>

							{gameResult.isWinner && (
								<div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
									<h3 className="text-xl font-bold text-green-800 mb-2">🎊 Congratulations!</h3>
									<p className="text-green-700 font-medium">You picked the winning number and earned a victory!</p>
									<p className="text-sm text-green-600 mt-2">Your stats have been updated.</p>
								</div>
							)}

							{gameResult.winners && gameResult.winners.length > 0 && (
								<div className="bg-blue-50 rounded-xl p-4 mb-6">
									<h4 className="text-lg font-semibold text-blue-900 mb-3">All Winners This Round:</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{gameResult.winners.map((winner: any, index: number) => (
											<div key={index} className="bg-white rounded-lg p-3 text-center">
												<span className="font-medium text-blue-700">{winner.username}</span>
												<span className="text-sm text-gray-600 ml-2">(picked {winner.chosen_number})</span>
											</div>
										))}
									</div>
								</div>
							)}

							<div className="space-y-4">
								<button onClick={backToLobby} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
									Play Again
								</button>

								<button onClick={() => router.push('/leaderboard')} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
									View Leaderboard
								</button>
							</div>
						</div>
					) : (
						<div className="text-center">
							<h2 className="text-3xl font-bold text-gray-900 mb-6">Pick Your Number</h2>

							<div className="bg-gray-50 rounded-xl p-6 mb-8">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
									<div>
										<p className="text-sm text-gray-600 mb-1">Session Status</p>
										<p className="text-lg font-semibold capitalize text-blue-600">{mySession.session.status}</p>
									</div>
									<div>
										<p className="text-sm text-gray-600 mb-1">Players in Session</p>
										<p className="text-lg font-semibold text-green-600">
											{mySession.session.current_players} / {mySession.session.max_players}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600 mb-1">Time Remaining</p>
										<p className="text-lg font-semibold text-orange-600">{formatTime(timeRemaining)}</p>
									</div>
								</div>
							</div>

							{mySession.participant && mySession.participant.is_starter && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
									<p className="text-blue-800 font-medium">🌟 You started this session!</p>
								</div>
							)}

							{mySession.playersInSession && mySession.playersInSession.length > 0 && (
								<div className="bg-purple-50 rounded-xl p-4 mb-6">
									<h4 className="text-sm font-semibold text-purple-900 mb-3">Players in Session:</h4>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
										{mySession.playersInSession.map((player: any, index: number) => (
											<div key={index} className="flex items-center justify-center space-x-2 bg-white rounded-lg p-2">
												<span className="text-purple-700">{player.username}</span>
												{player.hasSelectedNumber && <span className="text-green-600 text-xs">✓</span>}
											</div>
										))}
									</div>
								</div>
							)}

							<div className="mb-8">
								{selectedNumber ? (
									<div>
										<p className="text-lg text-gray-600 mb-4">Your current selection:</p>
										<div className="inline-block bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mb-4">{selectedNumber}</div>
										<p className="text-sm text-gray-500 mb-6">You can change your number anytime before the session ends</p>
									</div>
								) : (
									<p className="text-lg text-gray-600 mb-6">Choose a number from 1 to 9:</p>
								)}

								<div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
									{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
										<button
											key={number}
											onClick={() => selectNumber(number)}
											disabled={isLoading}
											className={`${
												selectedNumber === number ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50 border-2 border-blue-600 text-blue-600 hover:text-blue-700'
											} font-bold py-4 px-4 rounded-lg text-xl transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
										>
											{number}
										</button>
									))}
								</div>

								{isLoading && (
									<div className="flex items-center justify-center mt-4">
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
										<p className="text-sm text-blue-600">Updating selection...</p>
									</div>
								)}
							</div>

							<div className="border-t pt-6">
								<button onClick={leaveSession} disabled={isLoading} className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed">
									{isLoading ? 'Leaving...' : 'Leave Session'}
								</button>
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
