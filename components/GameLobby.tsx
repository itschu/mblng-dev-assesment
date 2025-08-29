'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '../lib/auth';
import { GameAPI } from '../lib/api';
import { supabase } from '../lib/supabase';

interface GameSession {
	id: string;
	status: string;
	current_players: number;
	max_players: number;
	session_duration: number;
	started_at: string;
	winning_number?: number;
}

interface Winner {
	username: string;
	chosen_number: number;
}

export default function GameLobby() {
	const [session, setSession] = useState<GameSession | null>(null);
	const [timeRemaining, setTimeRemaining] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [user, setUser] = useState<any>(null);
	const [showResults, setShowResults] = useState(false);
	const [winners, setWinners] = useState<Winner[]>([]);
	const [totalPlayers, setTotalPlayers] = useState(0);
	const [waitingForPlayers, setWaitingForPlayers] = useState(false);
	const [playersList, setPlayersList] = useState<any[]>([]);
	const [resultsClosed, setResultsClosed] = useState(false);
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	const router = useRouter();
	const channelRef = useRef<any>(null);

	useEffect(() => {
		const currentUser = getCurrentUser();

		if (!currentUser) {
			router.push('/');
			return;
		}

		setUser(currentUser);

		fetchCurrentSession();

		setupRealtimeSubscriptions();

		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}
		};
	}, []);

	const setupRealtimeSubscriptions = () => {
		const channelName = `lobby-session-updates-${Date.now()}`;

		const lobbyChannel = supabase
			.channel(channelName)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'game_sessions',
				},
				(payload) => {
					console.log('Lobby: Session change detected:', payload);
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
					console.log('Lobby: Participant change detected:', payload);
					setTimeout(() => {
						fetchCurrentSession();
					}, 300);
				}
			)
			.subscribe((status) => {
				console.log('Lobby realtime subscription status:', status);
			});

		channelRef.current = lobbyChannel;
	};

	const handleSessionChange = (payload: any) => {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		console.log('Lobby: Processing session change:', { eventType, newRecord, oldRecord });

		if (eventType === 'INSERT' && newRecord.status === 'active') {
			console.log('Lobby: New active session created');
			setResultsClosed(false);
			setTimeout(() => {
				fetchCurrentSession();
			}, 500);
		} else if (eventType === 'UPDATE') {
			if (newRecord.status === 'finished' && oldRecord?.status === 'active') {
				console.log('Lobby: Session just finished, showing results');
				setResultsClosed(false);
				setTimeout(() => {
					fetchCurrentSession();
				}, 700);
			} else if (newRecord.status === 'active') {
				console.log('Lobby: Active session updated');
				setTimeout(() => {
					fetchCurrentSession();
				}, 300);
			}
		}
	};

	const fetchCurrentSession = async () => {
		try {
			console.log('Lobby: Fetching current session...');

			const data = await GameAPI.getCurrentSession();

			console.log('Lobby: Session data received:', data);

			if (data.showResults && !resultsClosed) {
				console.log('Lobby: Displaying results');
				setShowResults(true);
				setWinners(data.winners || []);
				setTotalPlayers(data.totalPlayers || 0);
				setSession(data.session);
				setWaitingForPlayers(false);
				setPlayersList([]);
				setTimeRemaining(0);
				setError('');
				return;
			}

			if (data.waitingForPlayers) {
				console.log('Lobby: Waiting for players');
				setWaitingForPlayers(true);
				setSession(null);
				setShowResults(false);
				setWinners([]);
				setTotalPlayers(0);
				setTimeRemaining(0);
				setPlayersList([]);
				setError('');
				return;
			}

			if (data.session && data.session.status === 'active') {
				console.log('Lobby: Active session found:', {
					id: data.session.id,
					players: data.session.current_players,
					timeRemaining: data.timeRemaining,
				});

				setSession(data.session);
				setTimeRemaining(data.timeRemaining || 0);
				setPlayersList(data.playersList || []);
				setWaitingForPlayers(false);
				setShowResults(false);
				setWinners([]);
				setTotalPlayers(0);
				setError('');
				return;
			}

			console.log('Lobby: No active session, showing waiting state');
			setWaitingForPlayers(true);
			setSession(null);
			setShowResults(false);
			setWinners([]);
			setTotalPlayers(0);
			setTimeRemaining(0);
			setPlayersList([]);
			setError('');
		} catch (error: any) {
			console.error('Lobby: Fetch session error:', error);
			if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
				setError(error.message);
			}
			if (error.message.includes('token') || error.message.includes('auth')) {
				await logoutUser();
				router.push('/');
			}
		} finally {
			if (isInitialLoading) {
				setIsInitialLoading(false);
			}
		}
	};

	const joinSession = async () => {
		setIsLoading(true);
		setError('');

		try {
			const response = await GameAPI.joinSession();
			if (response.success) {
				setError('');
				setResultsClosed(false);
				setTimeout(() => {
					router.push('/game');
				}, 500);
			}
		} catch (error: any) {
			console.error('Lobby: Join session error:', error);
			setError(error.message || 'Failed to join session. Please try again.');

			setTimeout(() => {
				setError('');
			}, 5000);
		} finally {
			setIsLoading(false);
		}
	};

	const closeResults = () => {
		console.log('Lobby: Closing results manually');
		setResultsClosed(true);
		setShowResults(false);
		setWinners([]);
		setTotalPlayers(0);
		setWaitingForPlayers(true);
		setSession(null);
		setTimeRemaining(0);
		setPlayersList([]);
	};

	const logout = async () => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}
		await logoutUser();
		router.push('/');
	};

	const formatTime = (seconds: number) => {
		return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
	};

	useEffect(() => {
		let timeInterval: NodeJS.Timeout | null = null;

		if (session?.status === 'active' && timeRemaining > 0) {
			timeInterval = setInterval(() => {
				setTimeRemaining((prev) => {
					const newTime = Math.max(0, prev - 1);

					if (newTime === 0 && prev > 0) {
						console.log('Lobby: Time expired, fetching results');
						setTimeout(() => {
							fetchCurrentSession();
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
	}, [session?.status, session?.id]);

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

	if (isInitialLoading) {
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
								<button onClick={() => router.push('/leaderboard')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
									Leaderboard
								</button>
								<button onClick={logout} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
									Logout
								</button>
							</div>
						</div>
					</div>
				</nav>

				<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
					<div className="bg-white rounded-2xl shadow-xl p-8">
						<div className="text-center">
							<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Game Lobby</h2>
							<p className="text-gray-600">Checking for active sessions...</p>
						</div>
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
							<button onClick={() => router.push('/leaderboard')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
								Leaderboard
							</button>
							<button onClick={logout} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
								Logout
							</button>
						</div>
					</div>
				</div>
			</nav>

			<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="bg-white rounded-2xl shadow-xl p-8">
					<div className="text-center mb-8">
						<h2 className="text-3xl font-bold text-gray-900 mb-4">Game Lobby</h2>
						<p className="text-gray-600 text-lg">Join a session and pick your lucky number!</p>
						<p className="text-sm text-blue-600 mt-2">Game sessions last 60 seconds</p>
					</div>

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

					{showResults && (
						<div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
							<h3 className="text-2xl font-bold text-green-800 mb-4 text-center">🎉 Session Results!</h3>
							<div className="text-center mb-6">
								<p className="text-lg text-green-700">
									Winning Number: <span className="text-3xl font-bold">{session?.winning_number}</span>
								</p>
								<p className="text-sm text-green-600 mt-2">Total Players: {totalPlayers}</p>
							</div>

							{winners.length > 0 ? (
								<div className="mb-6">
									<h4 className="text-lg font-semibold text-green-800 mb-3">🏆 Winners:</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{winners.map((winner, index) => (
											<div key={index} className="bg-white rounded-lg p-3 text-center">
												<span className="font-medium text-green-700">{winner.username}</span>
												<span className="text-sm text-gray-600 ml-2">(picked {winner.chosen_number})</span>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="mb-6">
									<p className="text-center text-green-700 font-medium">No winners this round!</p>
								</div>
							)}

							<div className="text-center">
								<button onClick={joinSession} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed mr-4">
									{isLoading ? 'Starting...' : 'Start New Session'}
								</button>
								<button onClick={closeResults} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors whitespace-nowrap cursor-pointer">
									Close Results
								</button>
							</div>
						</div>
					)}

					{waitingForPlayers && (
						<div className="text-center">
							<div className="bg-blue-50 rounded-xl p-8 mb-6">
								<h3 className="text-xl font-semibold text-blue-900 mb-4">Waiting for Players</h3>
								<p className="text-blue-700 mb-4">No active session yet. Be the first to start a new 60-second game!</p>
								<div className="animate-pulse">
									<div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
								</div>
							</div>

							<button onClick={joinSession} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed">
								{isLoading ? 'Starting Session...' : 'Start New Session'}
							</button>
						</div>
					)}

					{session && session.status === 'active' && !showResults && !waitingForPlayers && (
						<div className="space-y-6">
							<div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
								<h3 className="text-2xl font-bold text-yellow-800 mb-4">🎮 Active Session Found!</h3>
								<p className="text-yellow-700 mb-4">There's a game session currently running. Join now to participate!</p>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
									<div>
										<p className="text-sm text-gray-600 mb-1">Session Status</p>
										<p className="text-lg font-semibold capitalize text-blue-600">{session.status}</p>
									</div>
									<div>
										<p className="text-sm text-gray-600 mb-1">Players</p>
										<p className="text-lg font-semibold text-green-600">
											{session.current_players} / {session.max_players}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600 mb-1">Time Remaining</p>
										<p className="text-lg font-semibold text-orange-600">{formatTime(timeRemaining)}</p>
									</div>
								</div>
							</div>

							{playersList.length > 0 && (
								<div className="bg-blue-50 rounded-xl p-4">
									<h4 className="text-sm font-semibold text-blue-900 mb-3">Players in Session:</h4>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
										{playersList.map((player, index) => (
											<div key={index} className="flex items-center space-x-2 bg-white rounded-lg p-2">
												<span className="text-blue-700">{player.username}</span>
												{player.hasSelectedNumber && <span className="text-green-600 text-xs">✓</span>}
											</div>
										))}
									</div>
								</div>
							)}

							<div className="text-center">
								<div className="mb-6">
									<div className="w-full bg-gray-200 rounded-full h-4 mb-4">
										<div
											className="bg-blue-600 h-4 rounded-full transition-all duration-1000"
											style={{
												width: `${Math.max(0, (timeRemaining / 60) * 100)}%`,
											}}
										></div>
									</div>
									<p className="text-sm text-gray-600">Game ends when timer reaches zero</p>
								</div>

								<button
									onClick={joinSession}
									disabled={isLoading || session.current_players >= session.max_players}
									className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
								>
									{isLoading ? 'Joining...' : session.current_players >= session.max_players ? 'Session Full' : 'Join Session'}
								</button>
							</div>
						</div>
					)}

					<div className="mt-8 bg-blue-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-blue-900 mb-3">How to Play</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
							<div>
								<p>• Sessions start when first player joins</p>
								<p>• Each session lasts exactly 60 seconds</p>
								<p>• Pick a number from 1 to 9</p>
							</div>
							<div>
								<p>• You can change your number anytime</p>
								<p>• Winners match the randomly drawn number</p>
								<p>• View results before next session starts</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
